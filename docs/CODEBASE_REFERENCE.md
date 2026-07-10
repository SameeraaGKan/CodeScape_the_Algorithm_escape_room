# CodeEscape — Codebase Reference

File-by-file technical reference for every source file under `src/`. Compiled 2026-07-10 from a full read of every file in the project.

CodeEscape is a multiplayer "algorithm escape room" — teams race through coding puzzles and GMAT-style quizzes alongside AI teammates. Built on **Next.js 16** (App Router; the `proxy.ts` naming convention replaces `middleware.ts`), **Supabase** (auth + Postgres + Realtime), **Drizzle ORM** over Neon serverless Postgres, **Groq** (Llama 3.3 70B) for the AI teammates, **Upstash Redis** for rate limiting, and **Zod** for request validation.

**Stats:** 90+ source files · 13 API route handlers · 11 pages/layouts · 6 Drizzle tables · ~800 MCQ/GMAT questions · 4 AI teammate personalities.

## Table of contents

- [src/app/api & auth](#srcappapi--auth) — route handlers
- [src/app — pages & layout](#srcapp--pages--layout)
- [src/components](#srccomponents)
- [src/lib](#srclib)
- [State, types & misc](#state-types--misc)
- [Cross-cutting findings](#cross-cutting-findings)

---

## src/app/api & auth

Every mutating or sensitive route is wrapped in `withRateLimit()` (Upstash, per-IP, fails open if Redis is down) and validated against a Zod schema from `lib/security/schemas.ts` before touching the database.

### `POST` src/app/api/agent/chat/route.ts

Streaming chat endpoint behind the **AgentChatPanel** UI — the in-game AI teammate conversation. Streams personality-driven hints/commentary without ever revealing puzzle answers.

- **Request/response:** body validated by `agentChatSchema`: `{ puzzleId, agentPersonality, playerAttempt, timeRemainingSeconds, messages, trigger?, triggerContext? }`. Model is Groq's `llama-3.3-70b-versatile` via `@ai-sdk/groq` + `streamText`, returned as a raw text stream via `result.toTextStreamResponse()` — not JSON.
- Requires an authenticated Supabase user (401 otherwise); rate-limited via `agentChatLimiter`.
- Looks the puzzle up in `PUZZLES[puzzleId]` (legacy puzzles) or `ALL_MCQ_BY_ID[puzzleId]` (MCQ/GMAT) — 404 if neither exists.
- `hintsUsed` is *derived*, not stored: it's the count of prior `assistant` turns in the message history.
- System prompt built via `buildSystemPrompt()`; for MCQs it injects an explicit instruction not to reveal the answer unless `hintsUsed >= 3` and personality is `spoon_feeder`.
- **Proactive nudges:** if `trigger` is present, a synthetic user message is appended from the server-side template `TRIGGER_TEXT[trigger](triggerContext)`, prefixed `[PROACTIVE — HIDDEN FROM PLAYER]`. The client sends only a closed enum value, never literal instruction text — a deliberate anti-prompt-injection design.
- `maxOutputTokens: 350`; temperature comes from `AGENT_CONFIGS[personality].temperature`.
- **Depends on:** `lib/ai/personalities`, `lib/puzzles/data/puzzles`, `lib/puzzles/loader` (`ALL_MCQ_BY_ID`), `lib/security/schemas`, `lib/security/ratelimit`, `lib/db/supabase.server`.

### `POST` src/app/api/agent/hint/route.ts

One-shot hint generation for a legacy puzzle, based on the player's specific wrong attempt — distinct from the open-ended chat endpoint.

- Validated by `hintRequestSchema`; auth required; rate-limited via the shared `agentChatLimiter`.
- Only supports legacy `PUZZLES` (404 for MCQ ids — unlike the chat route).
- System prompt has an explicit prompt-injection defense: treats `playerAttempt` as untrusted data, instructed to ignore any embedded redirection and either give a normal hint or a brief refusal.
- `generateText` (non-streaming), `maxOutputTokens: 150`, hint capped at "under 80 words" by instruction (not enforced in code).

### `POST`/`GET` src/app/api/gmat-results/route.ts

Persists and retrieves completed GMAT Focus test results tied to a user's account.

- POST validated by `gmatResultSchema`; writes `gmatTestResults`, reads `gameSessions` + `puzzleAttempts`.
- **Anti-cheat gate:** `MIN_VERIFIED_ATTEMPTS = 1` — rejects (400) a submitted result unless at least one real `puzzleAttempts` row exists for that session, so a score can't be fabricated for a session where no grading ever occurred.
- Session resolved by `roomCode.toUpperCase()`; 404 if missing. POST rate-limited via `resultsSubmitLimiter`; GET only requires auth.
- GET returns up to 50 results ordered by `completedAt desc`.

### `GET` src/app/api/ml/analytics/route.ts

Aggregated analytics powering the `/dashboard` charts: puzzle difficulty stats, IRT skill distribution, session status counts.

- Three grouped aggregate queries run in parallel via `Promise.all` over `puzzleAttempts`, `playerSkills`, `gameSessions`.
- Returns `{ puzzleStats, skillDistribution, sessionStats }`.
- **Hardcoded admin gate:** `ADMIN_EMAIL = "sameeraagk883@gmail.com"` — only this exact address may call the route; everyone else gets **401** regardless of auth state. No rate limit applied here (unlike almost every other route).

### `GET` src/app/api/profile/route.ts

Returns the current user's stats (games created/completed, paths tried) plus display-name/avatar metadata for `/profile`. No POST — profile edits go straight through Supabase's `auth.updateUser` client-side.

- Queries `teams` filtered `WHERE createdBy = user.email`; `gamesCompleted` is the subset with `status === "completed"`; `uniquePaths` deduped via a `Set`.
- `displayName`/`avatarColor` come from Supabase `user_metadata` (default `"#05b9b6"`) — never stored in the app's own DB.

### `GET` src/app/api/puzzles/route.ts

Serves legacy (non-MCQ) puzzle definitions and set ordering for the `default_set` game mode.

- `?id=` → single sanitized puzzle; `?set=` → ordered list (empty string ⇒ `"default_set"`); 400 if neither given.
- `sanitizePuzzle()` strips `agentContext` before the response reaches the client — that field is the puzzle's answer-adjacent context used only for AI-prompt construction.
- Auth via `getUserFromRequest` (Bearer-token aware); rate-limited via `puzzlesReadLimiter`.

### `POST` src/app/api/questions/grade/route.ts

The **authoritative grading endpoint** for MCQ/GMAT questions — the only place that knows the correct answer index. Closes the loop opened by `/api/questions` stripping answers before serving.

- Validated by `mcqGradeSchema`: `{ roomCode, answers: [{ questionId, selectedIndex }] }` — structurally cannot smuggle or request the answer.
- `isCorrect = selectedIndex !== null && selectedIndex === question.answer` — explicit null check so a skipped question is never accidentally marked correct.
- Unknown question ids are silently skipped (not an error for the whole batch).
- Every graded answer inserts a `puzzleAttempts` row — this is what satisfies the `MIN_VERIFIED_ATTEMPTS` check elsewhere.
- Rate-limited via `mcqGradeLimiter` (40/min — generous enough for real adaptive-test pacing, tight enough to blunt answer-scraping by iterated guessing).
- This is half of the MCQ answer-leak fix; the other half is `ClientMCQQuestion` (`types/index.ts`) stripping `answer`/`explanation` before the client ever sees a question list.

### `GET` src/app/api/questions/route.ts

Serves a randomized/seeded set of MCQ questions for a topic path — used by both team/race mode and the GMAT test flow.

- `?path=` validated against a hardcoded `VALID_PATH_IDS` (16 ids: 13 CS + 3 core GMAT sections — *not* `gmat_full_test` or `gmat_test_N`, which the GMAT page assembles client-side instead).
- `?seed=` (e.g. the room code) drives deterministic shuffling so every player in a room sees the same question order.
- `sanitizeQuestion()` strips `answer`/`explanation` — same mechanism as `sanitizePuzzle`.

### `POST` src/app/api/rooms/complete/route.ts

Marks a session (and its team) completed with a final score — called at the end of both MCQ games and GMAT tests.

- Validated by `completeRoomSchema`; membership check (must be a `human` slot on the team) — 403 otherwise.
- **Idempotent:** if the session is already `completed`, returns success without overwriting — guards against a race between the client's own completion call and a teammate's.
- Same `MIN_VERIFIED_ATTEMPTS = 1` anti-cheat gate as `gmat-results` — comment calls it "closes the submit-a-score-with-zero-play hole."
- Updates `gameSessions` and `teams` in two separate (non-transactional) writes.

### `POST`/`GET`/`PATCH` src/app/api/rooms/route.ts

The core game-session lifecycle API — creates rooms, fetches room/session state, and grades legacy-puzzle answers with IRT skill updates. The largest/most complex route in the app.

**POST — start a session**
- Membership check: only a `human` slot on the team may start it (403 otherwise).
- Generates a 6-char `roomCode` excluding ambiguous characters (`0/O/1/I`).
- `puzzleSetId = team.selectedPath ?? "default_set"`; response branches into MCQ-mode vs legacy-mode shapes accordingly.
- Detailed Postgres error unwrapping in the catch block (`err.cause.message`/`.code`) for diagnosable 500s.

**GET — two modes**
- `?teamId=` — "lobby redirect" mode: most recent **active** session for a team, membership-checked, used to auto-redirect once a game starts.
- `?code=` — full session/game-state fetch, returns MCQ or legacy payload including `agentPersonalities` and `humanSlots` (derived from `team.slots`).

**PATCH — submit an answer (legacy puzzles only)**
- Session must be `active` (404) and caller must be a team member (403).
- Grades via `validateAnswer()`, scores via `calculateScore()` (0 if incorrect).
- Always inserts a `puzzleAttempts` row.
- **If correct:** updates the player's IRT skill in `playerSkills` via `updateTheta()` (upsert on `(userId, category)`), advances `currentPuzzleIndex`, and marks the session `completed` if it was the last puzzle.
- Returns `{ isCorrect, feedback, score, nextPuzzleId, sessionComplete }`; rate-limited via `puzzleSubmitLimiter`.

### `POST`/`GET`/`PATCH` src/app/api/teams/route.ts

Team creation, lookup, and invite-code joining — the backbone of the multiplayer lobby.

**POST — create**
- Unique invite code via `generateUniqueInviteCode()` (retries up to 5× against collisions, falls back to a longer code).
- Slot 0 is always the creator; `slotConfigs` from the UI's agent-picker convert specific slots to `type: "agent"` with a chosen personality (display name pulled from `AGENT_CONFIGS`).

**GET — lookup**
- `?invite=` is **intentionally open** (no membership check) — needed so a prospective joiner can see team info before joining.
- `?id=` **requires membership** (403 otherwise) since it exposes other members' `userId`/`displayName`.

**PATCH — join via invite code**
- 404 if code unknown; 409 if `team.status !== "forming"` (can't join a started/finished game).
- Idempotent: a user who already has a slot gets the team back unchanged rather than an error.
- Assigns the first open human slot with `slotIndex > 0`; 409 if none free.

### `POST` src/app/api/track-visit/route.ts

Lightweight, anonymous page-view logger called by `VisitTracker` on every page load.

- No auth required — intentionally anonymous. Visitor identity is a random UUID in a first-party `ce_vid` cookie (1yr, `httpOnly`, `sameSite=lax`), reused across visits, **not** tied to the Supabase account.
- Writes `path`, `visitorId`, `referrer`, `userAgent` to `pageViews`; rate-limited via `pageViewLimiter` (60/min).

### `GET` src/app/auth/callback/route.ts

Supabase magic-link/OAuth callback — exchanges the auth code for a session and redirects into the app.

- `exchangeCodeForSession(code)` → redirect to `${origin}${next}` (default `/dashboard`). On failure or missing code, redirects to `/login?error=auth_callback_failed` — though the app has no `/login` page among its routes, so this fallback path appears unreachable/vestigial in current routing.

---

## src/app — pages & layout

### src/app/layout.tsx

Root layout — global fonts, metadata, theming, and site-wide visit tracking for every route.

- Loads `Poppins` (body), `Geist_Mono`, and `Orbitron` (the cyberpunk display face used across the app) via `next/font/google`.
- `<html suppressHydrationWarning>` — required because the theme class is toggled client-side.
- Wraps children in `ThemeProvider` and mounts `VisitTracker` unconditionally — every route fires a `/api/track-visit` beacon.

### src/app/page.tsx

Public marketing/landing page (`/`) — hero, mode explainer, AI agent roster, topic tracks, CTA.

- Server component, no client state. Iterates `AGENT_CONFIGS` to render the 4 personality cards. CTAs link to `/register` (team) and `/solo` (solo).
- ⚠️ **Marketing/implementation mismatch:** the footer credits "Claude AI (claude-sonnet-4-6)" as the agent brain, but the actual chat/hint routes run on **Groq's Llama 3.3 70B**, not Anthropic's API. The `/privacy` page correctly names Groq.

### src/app/privacy/page.tsx

Static privacy policy (`/privacy`). Accurately describes real data handling: account info via Supabase, gameplay/GMAT data, θ skill profile, the anonymous `ce_vid` page-view cookie, the `gmat_pending_result` localStorage fallback, and third-party processors — Supabase, **Groq**, Upstash, Vercel. States data is not sold; deletion via emailing the contact address.

### src/app/dashboard/page.tsx

Analytics dashboard (`/dashboard`) — bar charts for attempts/hints/success-rate per puzzle group, radar chart for IRT skill distribution, sourced from `/api/ml/analytics`.

- `puzzleGroupOf()` buckets GMAT question ids (`/^(?:gdi|gq|gv)_t(\d+)_/`) into `Practice Test N` groups rather than rendering ~1000 individual bars; weighted averages computed per group.
- `PUZZLE_CHART_LIMIT = 20` caps rendered bars with a "hidden count" note.
- Uses `recharts` with a custom cyan/magenta/green palette.
- ⚠️ **Effectively admin-only in practice:** `/api/ml/analytics` enforces the hardcoded admin-email gate server-side, so a non-admin authenticated user reaches this page but silently gets a 401 → "Could not load analytics."

### src/app/game/[roomCode]/page.tsx

The core in-game screen — the single largest client page. Handles both legacy 4-puzzle-type gameplay and MCQ/quiz mode (team & race tracks), with realtime multiplayer sync.

- Dual-mode: `isMcqMode` switches between legacy puzzle components and `MCQPuzzle`. MCQ questions fetched with `seed=roomCode` so every player gets the same deterministic order.
- **Realtime sync** over a `room-state:${roomCode}` broadcast channel: `question_advance` (guarded by a ref so each client advances exactly once per index) and `player_answered` (drives the teammate-status sidebar and race leaderboard).
- **Scoring:** `mcqPoints()` (team mode — base + speed bonus) vs `racePoints()` (race mode — `speedScore = base × timeRemaining/timeLimit`; even a fast wrong answer scores 25% of speedScore).
- Five interacting timer effects (legacy countdown, MCQ countdown, solo auto-advance, multiplayer auto-advance-after-everyone-answered, multiplayer fallback-after-timer-expires) coordinated via refs to dodge stale closures.
- `handleOpeningComplete()` staggers scripted "peer agent greetings" between multiple AI teammates on the same team for immersion.

### src/app/gmat-test/[roomCode]/page.tsx

The full GMAT Focus Edition adaptive test — solo-only, 3 sections (Quant/Verbal/Data Insights), with breaks, flagging, review, and score calculation matching the real GMAT scoring model.

- Phase state machine: `loading → intro → section → review → break → results`.
- **Adaptive selection:** `adaptivePick()` targets a difficulty band from a running `skillLevel` (−2..2; hard if >0.6, easy if <−0.6), falling back to adjacent bands if the primary pool is exhausted; `applySkillDelta()` nudges by ±0.3 per answer, correctly handling a player who changes a previous answer.
- **Scoring:** `sectionScore() = 60 + weighted-correct-ratio × 30` using `DIFFICULTY_WEIGHTS { easy:0.8, medium:1.0, hard:1.3 }`; total maps onto the real 205–805 GMAT Focus scale and rounds to the actual reporting granularity (e.g. 605, 655, 705).
- **Resilient save:** `finalizeTest()` stashes the full result to `localStorage["gmat_pending_result"]` *before* attempting the POST, so a network failure never loses a completed test; a manual "RETRY SAVE" button and a mount-time flush effect both exist. The profile page independently re-flushes the same key.
- ⚠️ **Admin-gated at the route level:** redirects to `/` unless `user.email === "sameeraagk883@gmail.com"` — the entire GMAT full-test feature is fully built but currently restricted to the one admin account, even though it's reachable from `/register` and `/solo`.

### src/app/lobby/[teamId]/page.tsx

Pre-game waiting room — team roster, invite link, host-initiated start; auto-redirects all members once the game begins.

- Subscribes to a `lobby:${teamId}` broadcast channel for `game_started` events — instant redirect for non-host teammates, no polling needed.
- Separately polls `GET /api/teams?id=` every 2s (only while open slots remain) to keep the roster live as people join via invite link.
- `isHost = team.slots[0]?.userId === currentUserId`; host can start with unfilled slots remaining (warned, not blocked).

### src/app/profile/page.tsx

User profile — editable display name/avatar color, aggregate stats, and full GMAT test history with expandable wrong-answer review.

- `handleSave()` writes directly to Supabase (`auth.updateUser`) — there is no `users`/`profiles` table; it all lives in Supabase auth metadata.
- Second independent flush site for the `gmat_pending_result` localStorage key (see the GMAT test page).

### src/app/register/page.tsx

Team-creation/join flow — magic-link auth, invite-code joining, and a 3-step wizard (path → track → team config). The largest UI page in the app.

- Invite-flow branch bypasses the wizard entirely when `?invite=` resolves.
- GMAT-category paths hidden unless `isAdmin`; selecting `gmat_full_test` force-sets `maxSize = 1` and skips the track-selection step (no team/race distinction for a solo adaptive test).
- Team-name suggestions drawn from a ~30-entry programmer-joke pool, shuffled 4-at-a-time.

### src/app/solo/page.tsx

Streamlined solo-play flow — 2-step wizard (path → optional AI companion), skips the team builder and the lobby entirely.

- `startSolo()` chains `POST /api/teams` then `POST /api/rooms`, routing straight to `/gmat-test/…` or `/game/…` — solo mode never visits `/lobby` since there's no one to wait for.

### src/app/results/[roomCode]/page.tsx

Post-game results summary for legacy/MCQ games (GMAT tests have their own dedicated results phase embedded in the test page).

- `elapsedSeconds` computed client-side from `completedAt − startedAt`; toggles a celebratory "MISSION COMPLETE" vs. a neutral "RESULTS" header based on `session.status`.
- ⚠️ **Vestigial code:** declares a `PuzzleAttempt` type and a `PUZZLE_TITLES` map that are never rendered — likely leftover from an earlier, more detailed results view.

### src/app/globals.css

Tailwind v4 CSS-first entrypoint defining the whole design-token system and the two-theme (dark/light) cyberpunk visual language used across every page.

- Dark is the always-on baseline (`:root`); `.light` overrides with lighter OKLCH tokens and deliberately *desaturated* neon hex values (vivid neon on white would blow out contrast).
- Named tokens `--neon-cyan #05b9b6`, `--neon-magenta #ff00cc`, `--neon-blue #0066ff`, `--neon-green #00ff88` — referenced directly as raw hex throughout dashboard/profile/game inline styles.
- Utility classes used everywhere: `.glow-cyan`/`.glow-magenta` (text-shadow), `.box-glow-*` (button glow), `.grid-bg`, `.scanline::after` (CRT effect, disabled in light mode), animations `pulse-glow`, `flicker`, `slide-up` (applied to nearly every page's content wrapper), and an unused `typewriter` keyframe.

---

## src/components

All five puzzle components (`AlgorithmMaze`, `CipherPuzzle`, `CodeFillPuzzle`, `MCQPuzzle`, `RecursionTrace`) are "dumb"/controlled — none validate correctness client-side; they shape an answer payload and defer to `onSubmit`, with grading feedback passed back down. All puzzle-grading logic lives in `lib/puzzles` or the API layer.

### src/components/agent/AgentChatPanel.tsx

The streaming chat UI for one AI teammate. Both a chat surface and a proactive-message engine that speaks first on puzzle load, wrong answers, silence, a low timer, or a peer's greeting.

- `triggerAgentMessage(type, onComplete?, customContext?)` is the proactive-message core: guarded against concurrent calls, POSTs to `/api/agent/chat` with a `trigger` field, and streams the response word-by-word via `res.body.getReader()`. Failures are swallowed silently (a proactive message just never appears) rather than shown as an error.
- Each trigger type fires at most once per puzzle via dedicated ref guards (`hasOpenedRef`, `timerWarnFiredRef`, `silenceFiredRef`), all reset together when the puzzle/personality changes.
- `sendMessage()` (user-typed) is a separate path: aborts any in-flight request via `AbortController`, and on network failure swaps the placeholder to a "⚠️ Could not reach the agent" message.
- Heavy use of "latest value" refs (`messagesRef`, `timeRemainingRef`, …) to dodge stale closures inside `setTimeout`/`useCallback`.
- ⚠️ Reuse candidate: the fetch-stream-and-progressively-update-message loop is implemented twice (once in `triggerAgentMessage`, once in `sendMessage`) with nearly identical `reader.read()` logic.

### src/components/analytics/VisitTracker.tsx

Headless (renders `null`) component firing a page-view beacon on every route change. Watches `usePathname()`; sends via `navigator.sendBeacon` (survives unload) with a `fetch(..., {keepalive:true})` fallback.

### src/components/layout/MouseBackground.tsx

Decorative, fully client-side animated background — parallax grid, glowing orbs, and a cursor-following bloom for the cyberpunk aesthetic. Classic rAF + lerp pattern: mouse position is lerped toward a target each frame (factor `0.055`) and applied to two orbs moving in *opposite* directions for fake depth, a 3D-tilted parallax grid, and a soft trailing bloom. All DOM mutations bypass React state (direct `style` writes on refs) to sustain 60fps.

### src/components/layout/Navbar.tsx

Fixed top nav — Supabase auth state, avatar dropdown, mobile menu, theme toggle. Subscribes to `sb.auth.onAuthStateChange` to stay in sync on login/logout. A `mounted` flag gates all user-dependent rendering to avoid SSR/hydration mismatch, since Supabase auth state is only known client-side.

### src/components/layout/ThemeProvider.tsx

Thin wrapper around `next-themes`: `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}` — the app ignores OS light/dark preference and defaults to dark until the user explicitly toggles.

### src/components/layout/ThemeToggle.tsx

Sun/moon icon button flipping `next-themes`'s theme. Renders `null` until mounted to avoid a hydration mismatch on the theme-dependent icon.

### src/components/puzzle/AlgorithmMaze.tsx

Interactive grid-pathfinding puzzle — build a path from start to end by clicking cells. Clicking a cell already in the path **rewinds** to that point (`path.slice(0, idx)`) rather than resetting — a nice correction affordance. Submit is enabled once the path includes the end cell; no client-side connectivity check beyond that (full validation is server-side).

### src/components/puzzle/CipherPuzzle.tsx

Collects a decoded-plaintext guess for an intercepted ciphertext. Input is forced uppercase; Enter submits directly. No client-side cipher logic — purely a text-collection UI.

### src/components/puzzle/CodeFillPuzzle.tsx

Fill-in-the-blank code snippet with a live-updating preview between the two code halves. ⚠️ **Dead code:** dynamically imports `CodeMirror` and defines a language-extension loader, but never renders `<CodeMirror>` or calls the loader — the actual blank display is a plain `<pre>` + `<input>`.

### src/components/puzzle/MCQPuzzle.tsx

Multiple-choice UI for GMAT/CS quiz paths — selection, immediate grading, keyboard shortcuts, and multiplayer-aware advancement. The one puzzle component that owns its own network call.

- `grade()` is idempotent per question instance (guarded by a `gradedRef`), POSTs to `/api/questions/grade`, and **fails closed** — a network error still reveals the answer state but reports the answer as wrong.
- Auto-grades on timeout via an effect watching a `timedOut` prop — what makes it usable in a synchronized multiplayer quiz where a shared timer forces submission.
- Selecting an option grades immediately — there's no separate confirm step.
- Keyboard shortcuts: letter keys select an option via `charCodeAt(0) - 65`; Enter advances once revealed. Ignored while typing in an input/textarea.
- Adapts its own advance mechanism: a clickable Next/Finish button if `onNext` is passed (solo), or a "waiting for next question" message if not (room-timer-driven).

### src/components/puzzle/RecursionTrace.tsx

Visualizes a recursive call stack as frames (top-of-stack first), with select frames left blank for the player to fill by hand. Total stack depth is inferred purely from the highest `frameId` in the puzzle's `blanksInStack` — no explicit depth field needed.

### src/components/team/TeamChatPanel.tsx

Real-time chat for human teammates — architecturally distinct from `AgentChatPanel` (AI teammates, HTTP streaming). Opens a Supabase Realtime channel `room-chat:${roomCode}` with `broadcast: { self: true }` — the sender receives their own broadcast back, so a local echo needs no separate optimistic-UI branch. **No persistence**: messages live only in memory for the mount duration; a refresh loses history.

### src/components/ui/ — shadcn-style primitives (13 files)

Style wrappers around **Base UI** (`@base-ui/react/*` — not Radix, despite the shadcn convention), styled via Tailwind + `cn()` and, where variants exist, `class-variance-authority`. Mostly stateless; no game logic.

| File | Wraps | Notes |
|---|---|---|
| `BackButton.tsx` | — | Not a primitive; a "go back" nav link with a chevron, used across onboarding flows. |
| `avatar.tsx` | `@base-ui/react/avatar` | Adds `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount` extras. |
| `badge.tsx` | polymorphic `useRender` | 6 `cva` variants. |
| `button.tsx` | `@base-ui/react/button` | variant × size matrix; `active:translate-y-px` micro-interaction. |
| `card.tsx` | plain divs | `size` prop drives a `--card-spacing` CSS var. |
| `dialog.tsx` | `@base-ui/react/dialog` | Full modal set incl. portal/overlay/close button. |
| `input.tsx` | `@base-ui/react/input` | Focus-ring/disabled/aria-invalid states. |
| `label.tsx` | plain `<label>` | peer/group-disabled aware. |
| `progress.tsx` | `@base-ui/react/progress` | Composes Track+Indicator by default. |
| `scroll-area.tsx` | `@base-ui/react/scroll-area` | Root → Viewport + ScrollBar + Corner. |
| `select.tsx` | `@base-ui/react/select` | Full compound set incl. scroll up/down buttons. |
| `separator.tsx` | `@base-ui/react/separator` | Horizontal/vertical. |
| `tabs.tsx` | `@base-ui/react/tabs` | `default` pill vs `line` underline variants. |
| `tooltip.tsx` | `@base-ui/react/tooltip` | `TooltipProvider` delay overridden to `0` — instant tooltips. |

---

## src/lib

### src/lib/db/schema/*.ts

Six Drizzle ORM table definitions, barrel-exported from `schema/index.ts`.

**`teams.ts`** — root entity players/agents join before a session starts

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, random default |
| `inviteCode` | text | not null, unique |
| `maxSize` | integer | default 4 |
| `slots` | jsonb `TeamSlot[]` | default `[]` — composition stored as JSON, not a child table |
| `selectedPath` | text | default `"cs_algorithms"` |
| `gameTrack` | text | default `"team"` (vs `"race"`) |
| `status` | text | default `"forming"` |
| `updatedAt` | timestamp | defaultNow — **not** auto-refreshed on writes; must be set manually |

**`game_sessions.ts`** — one play-through of a puzzle set by a team

| Column | Type | Notes |
|---|---|---|
| `teamId` | uuid FK → teams.id | `onDelete: cascade` |
| `roomCode` | text | not null, unique — human-facing join code |
| `puzzleSetId` | text | default `"default_set"` |
| `currentPuzzleIndex` | integer | default 0 |
| `status` | text | default `"active"` |

**`puzzle_attempts.ts`** — every submission against a legacy CS puzzle

| Column | Type | Notes |
|---|---|---|
| `sessionId` | uuid FK → game_sessions.id | `onDelete: cascade` |
| `submittedAnswer` | jsonb | shape varies by puzzle type (string / record / coordinate array) |
| `attemptNumber` | integer | default 1 — supports retries up to a puzzle's `maxAttempts` |

**`player_skills.ts`** — per-user, per-category IRT ability estimate

| Column | Type | Notes |
|---|---|---|
| `category` | text | one of sorting/cipher/recursion/maze/data_structures |
| `theta` | real | default 0.0 — neutral start |
| constraint | | `unique(userId, category)` — enables upsert semantics |

**`gmat_test_results.ts`** — completed GMAT practice-test results

| Column | Type | Notes |
|---|---|---|
| `sessionId` | uuid FK, nullable | `onDelete: set null` — result survives session deletion |
| `sectionScores`, `wrongAnswers` | jsonb | shape enforced only at the API boundary via `gmatResultSchema`, not by Postgres |

**`page_views.ts`** — first-party analytics, standalone (no FKs)

| Column | Type | Notes |
|---|---|---|
| `visitorId` | text | anonymous cookie id, dedupes unique visitors |

### src/lib/db/index.ts

Initializes Drizzle over Neon's serverless HTTP driver: `drizzle(neon(DATABASE_URL!), { schema })`, exported as `db` alongside a full re-export of every schema table. Uses the HTTP driver (not a pooled TCP connection) — appropriate for serverless route handlers without guaranteed connection reuse across invocations.

### src/lib/db/supabase.ts & supabase.server.ts

Client-vs-server Supabase client factories, split so the browser bundle never pulls in `next/headers`.

**`supabase.ts` (browser-safe)**
- `getSupabaseBrowser()` — memoized singleton via `createBrowserClient`, session stored in cookies (visible to server code too, not just localStorage).
- `getSupabaseAdmin()` — service-role client, RLS-bypassing, must only run server-side.

**`supabase.server.ts`**
- `createSupabaseServerClient()` — cookie-based client for Server Components/Route Handlers.
- `getUserFromRequest(request)` — resolution order: (1) if an `Authorization: Bearer` header is present, **locally decodes the JWT** (`parseJwt`, base64 payload, checks `exp`) with *zero* network round-trip; (2) otherwise falls back to cookie-based `supabase.auth.getUser()`.

⚠️ **Security nuance:** the Bearer-token fast path does not verify the JWT signature — only structure and expiry. It trusts that the token was genuinely minted by Supabase and transported securely; any caller of `getUserFromRequest` depends on that assumption holding.

### src/lib/ml/adaptive.ts

A 1-Parameter Logistic (1PL/Rasch) IRT model with an ELO-style update rule, driving adaptive difficulty for the 6 legacy CS puzzles (distinct from the GMAT adaptive logic embedded in the GMAT test page).

- `getProbability(θ, b) = 1 / (1 + e^-(θ-b))` — standard Rasch curve; at θ = b, P(correct) = 0.5.
- `updateTheta(currentTheta, puzzleId, isCorrect, hintsUsed, timeTakenSeconds, timeLimitSeconds)`:

  ```
  pCorrect = getProbability(θ, b)
  actual = isCorrect ? 1 : 0
  hintPenalty = isCorrect ? hintsUsed * 0.05 : 0
  timePenalty = isCorrect ? max(0, (timeTaken/timeLimit - 0.5) * 0.1) : 0
  delta = 0.3 * (actual - pCorrect) - hintPenalty - timePenalty
  newθ  = clamp(θ + delta, -3, 3)
  ```

  Both penalties only apply on a *correct* answer (a wrong answer is already penalized via `actual=0`); using ≤50% of the time limit costs nothing.
- `selectNextPuzzle(θ, category, completedIds)` — filters candidates by category and completion, computes `info = |θ - b|` per candidate (Fisher information for a 1PL item is maximized when difficulty matches ability), and returns the closest match — an approximation of maximum-information item selection.

### src/lib/security/ratelimit.ts

Centralizes per-route rate limiting via Upstash Redis + `@upstash/ratelimit`, keyed by client IP.

| Limiter | Rate | Why |
|---|---|---|
| `agentChatLimiter` | 10/min | LLM calls are expensive/abusable |
| `puzzleSubmitLimiter` | 30/min | answer submissions |
| `teamCreateLimiter` | 5/min | tight, anti-spam |
| `pageViewLimiter` | 60/min | generous — just blunts bot floods |
| `mcqGradeLimiter` | 40/min | usable for real adaptive-test pacing, tight enough to throttle answer-key scraping |
| `roomLimiter` | 20/min | room/session actions |
| `resultsSubmitLimiter` | 10/min | GMAT result submission |
| `puzzlesReadLimiter` | 60/min | reading puzzle/question lists |

`withRateLimit(request, limiter, handler)` extracts IP from `x-forwarded-for` → `x-real-ip` → `"anonymous"`; on limit-exceeded returns **429** with a computed `Retry-After` header. **If Redis itself throws, the limiter fails open** — an explicit availability-over-strictness tradeoff, so a Redis outage never takes the app down.

⚠️ **Trust assumption:** limiting is strictly per-IP (not per-user), and `x-forwarded-for` is trusted as-is — spoofable unless the hosting platform strips/overwrites it upstream (Vercel typically does).

### src/lib/security/schemas.ts

Zod request-body validation for every mutating/sensitive route — the primary input-sanitization layer, and the schema half of the MCQ-answer-leak fix.

- `submitAnswerSchema` — `answer` is a union of exactly the three shapes `validator.ts` handles: string / string-record / number-array-of-arrays.
- `agentChatSchema` — `trigger` is a closed enum, `triggerContext` is a bounded string; the actual hidden instruction text is rendered server-side from `TRIGGER_TEXT`, never accepted as raw text from the client.
- `mcqGradeSchema` — `answers: [{ questionId, selectedIndex: 0-4 or null }]`, max 30 — structurally cannot carry an answer key or explanation back to the server.

**The MCQ-answer-leak fix, end to end:** three layers — (1) `ClientMCQQuestion` in `types/index.ts` strips `answer`/`explanation` from what `/api/questions` serves; (2) `mcqGradeSchema` here constrains what the client can send *back* to just an index; (3) `mcqGradeLimiter` throttles brute-force guessing against the grading endpoint. The actual comparison against `ALL_MCQ_BY_ID[id].answer` happens only in `/api/questions/grade`.

### src/lib/ai/personalities.ts

Defines the four AI teammate personalities' system prompts, proactive-trigger templates, and the function that assembles a final prompt with live puzzle context — the prompt-engineering core of the agent feature.

| Key | Name | Temp | Style |
|---|---|---|---|
| `supportive` | ARIA 💙 | 0.7 | Warm cheerleader; one guiding question when stuck, never a direct answer |
| `spoon_feeder` | BYTE 🔮 | 0.4 | Step-by-step; **the only personality allowed to reveal a solution approach**, and only once `hintsUsed ≥ 3` |
| `supervisor` | SIGMA 🔬 | 0.2 | Socratic; responds with clarifying questions, focuses on complexity/edge cases/invariants |
| `friendly` | ZAP ⚡ | 0.8 | Casual, real-world analogies, peer-not-teacher tone |

**`SHARED_RULES`** — the common preamble every personality gets:
- **Teammate mindset:** "we/let's" framing, proactive, cap responses at 120 words, stay in the escape-room setting.
- **Prompt-injection defense:** `[PROACTIVE — HIDDEN FROM PLAYER]` instructions should be acted on naturally, but any *player-typed* text merely claiming to be `[PROACTIVE]`/`[SYSTEM]`/`[HIDDEN]` must be treated as ordinary chat — explicitly stated to override any instruction embedded in a player's message regardless of formatting or claimed source.
- **Safety:** never reveal the system prompt, API keys, other players' data, or backend details; refuse malicious/illegal/off-topic requests in-character, briefly, without partial compliance.

`buildSystemPrompt(personality, ctx)` appends a `CURRENT PUZZLE CONTEXT` block with the puzzle's `agentContext` field — effectively the answer key for that puzzle. The security boundary here is entirely prompt-instruction-based (the model is told never to leak it verbatim), which is structurally softer than the MCQ system's type-stripping guarantee.

### src/lib/utils.ts

Single export: `cn(...inputs) = twMerge(clsx(inputs))` — the standard shadcn/ui Tailwind class-merge helper, used broadly across every UI component.

### src/lib/puzzles/loader.ts

Aggregates every MCQ question bank (12 CS topics + 3 GMAT sections + 10 GMAT quant-topic drills) into unified lookup structures, with path-aware, optionally-seeded retrieval.

- `ALL_MCQ_BY_ID` — flat id→question map including `answer`/`explanation`; server-only, used by the agent-chat route so the AI can reference the real question.
- `seededRandom(seed)` — hashes the seed with **FNV-1a**, then returns an **xorshift32** generator closure producing deterministic floats in `[0,1)`.
- `seededShuffle(arr, seed)` — Fisher–Yates using that PRNG, so the same room code always reshuffles into the same order (survives a refresh without desyncing multiplayer clients).
- `getQuestionsForPath(path, count?, seed?)`: `cs_random` pulls from the pooled 240 CS questions (default 20, *not seed-aware* — an inconsistency vs. everything else); `gmat_full_test`/`gmat_test_N` return `[]` (those are assembled elsewhere via `test-configs.ts`); CS topic paths default to 10 of 20 pooled questions; GMAT core/drill paths return the full pool, seed-shuffled if a seed is given.

### src/lib/puzzles/paths.ts

Static UI metadata catalog (label, description, icon, category, difficulty, question count) for every selectable path — pure data, zero runtime logic. `PATH_CATEGORIES` groups paths into 6 labeled/colored buckets (cs_foundations, cs_systems, cs_ai_data, cs_applied, gmat, random) for the path-picker UI.

⚠️ **Two sources of truth:** the valid-path-id list here and `PATH_IDS` in `security/schemas.ts` are separately maintained arrays — not derived from one canonical source, so they must be kept in sync by hand.

### src/lib/puzzles/validator.ts

Server-side answer validation and scoring for the 4 legacy CS puzzle types (cipher, code_fill, recursion_trace, maze) — MCQ/GMAT grading is handled separately via `ALL_MCQ_BY_ID`.

- `validateCipher` — uppercase/trim compare against a hardcoded answer list.
- `validateCodeFill` — collapses whitespace runs + lowercases both sides before comparing, with multiple accepted phrasings per puzzle (spaced/unspaced variants).
- `validateRecursionTrace` — rejects non-object input; returns on the first mismatched frame, naming it in the feedback.
- `validateMaze` — checks endpoints match, every cell is in-bounds and wall-free, and every step is Manhattan-adjacent to the last (rejects "teleport" steps). Accepts *any* legal connected path, not just the canonical BFS shortest path.
- `calculateScore(base, hintsUsed, timeTaken, timeLimit)`: `hintPenalty = hints × 15`; `timePenalty = floor(timeTaken/timeLimit × 30)`; result floored at 0.

⚠️ **Answer keys live in two places:** every correct-answer string is hardcoded directly in this file — independent of `PUZZLES[id].agentContext` in the data file, which describes the same answer in prose for the AI teammate. The two must be kept manually in sync.

### src/lib/puzzles/data/ — puzzle & MCQ question banks (~19 files, ~800 questions)

`data/puzzles.ts` is the hand-authored 5-puzzle legacy campaign (`PUZZLES`, keyed by id) plus `PUZZLE_SETS.default_set`, a 3-stage narrative ("Initialization Protocol" → "Code Breakers Challenge" → "Algorithm Maze — Final Escape") ordering: `caesar_cipher_01` → `bubble_sort_01` → `binary_search_01` → `factorial_trace_01` → `stack_brackets_01` → `bfs_maze_01`.

Every other file under `data/cs/` and `data/gmat/` exports arrays of the same flat shape:

```ts
type MCQQuestion = {
  id: string; path: PathId; passage?: string; question: string;
  options: readonly [4 or 5 strings];
  answer: number;       // stripped before reaching the client
  explanation: string;  // stripped before reaching the client
  difficulty: "easy" | "medium" | "hard";
}
```

**`data/cs/*.ts`** — 12 files × 20 questions = 240 CS questions (10 served per playthrough per topic)

| File | Path id | Topic |
|---|---|---|
| `algorithms.ts` | `cs_algorithms` | Sorting, searching, complexity |
| `theory.ts` | `cs_theory` | Turing machines, P vs NP, decidability |
| `discrete-math.ts` | `cs_discrete_math` | Logic, set theory, graph theory, modular arithmetic |
| `os-compilers.ts` | `cs_os_compilers` | Processes, memory, scheduling, lexers/parsers |
| `networks.ts` | `cs_networks` | TCP/IP, OSI, DNS, routing, HTTP |
| `cybersecurity.ts` | `cs_cybersecurity` | Cryptography, vulnerabilities, attack vectors |
| `ml-ai.ts` | `cs_ml_ai` | Neural nets, gradient descent, NLP, transformers |
| `databases.ts` | `cs_databases` | SQL, ACID, indexing, normalization, NoSQL |
| `data-science.ts` | `cs_data_science` | Statistics, hypothesis testing, PCA, pipelines |
| `software-engineering.ts` | `cs_software_engineering` | Design patterns, SOLID, CI/CD, system design |
| `graphics.ts` | `cs_graphics` | Rasterization, shaders, ray tracing, Bezier curves |
| `hci.ts` | `cs_hci` | Usability heuristics, accessibility, Fitts's Law |

**`data/gmat/*.ts`** — the GMAT Focus question banks and test assembly

| File | Contents |
|---|---|
| `quant.ts` | 210 questions (10 tests × 21), path `gmat_quant` |
| `verbal.ts` | 231 questions — Sentence Correction / Critical Reasoning / Reading Comprehension; RC questions share reusable `passage` constants across multiple questions in the same test |
| `data-insights.ts` | 192 questions — Data Sufficiency, Table Analysis, Graphics Interpretation, Two-Part Analysis, Multi-Source Reasoning (sub-type prefixed in the question text, not a separate field); DS questions use the standard 5-way GMAT answer choices |
| `quant-topics.ts` | 150 questions across 10 drill arrays (~15 each: arithmetic, algebra, geometry, word problems, number theory, statistics, combinatorics, coordinate geo, functions, probability) |
| `test-configs.ts` | Not a question bank — `GMAT_TEST_CONFIGS`, one entry per practice test 1–10, each listing the exact 21+23+20 question *ids* (from the files above) composing that test, with pools deliberately windowed/reused across adjacent tests so no single test repeats internally |

---

## State, types & misc

### src/store/gameStore.ts

A Zustand store shaped to hold live puzzle-session state (current puzzle, results, hint/attempt counters, elapsed time). No middleware — in-memory only, resets on reload.

⚠️ **Dead code:** grep confirms zero consumers anywhere in `src/` outside its own file. `game/[roomCode]/page.tsx` re-implements the identical state shape locally with `useState` + direct API calls instead — this store was likely early scaffolding superseded by that approach.

### src/store/teamStore.ts

A Zustand store for the currently-joined team, with slot-mutation helpers (`updateSlot`, `setAgentPersonality`) that defensively no-op if no team is loaded.

⚠️ **Also dead code:** `lobby/[teamId]/page.tsx` manages team state independently via local `useState` + a Supabase Realtime subscription, and even re-declares its own local `TeamData`/`SlotData` types structurally identical to (but not shared with) `Team`/`TeamSlot` in `@/types`.

### src/types/index.ts

The central shared type module — imported by 37 files. Pure compile-time declarations, no runtime validation (that's `security/schemas.ts`'s job).

- `PathId` — a 40-member string-literal union: 13 CS topics, 3 core GMAT sections, `gmat_full_test`, 10 `gmat_test_N`, 10 GMAT quant-topic drills.
- `ClientMCQQuestion = Omit<MCQQuestion, "answer"|"explanation"> & { answer?; explanation? }` — the sanitized shape served by `/api/questions`; the load-bearing type behind the answer-leak fix.
- `TeamSlot`, `Team`, `Puzzle`, `GameSession` — each a documented subset of its Drizzle table (e.g. `Team` omits `updatedAt`/`gameTrack`; `GameSession` omits `userId`) — treat the DB schema as the source of truth, this file as the (sometimes lagging) client contract.

⚠️ **Also unreferenced elsewhere:** `AgentMessage` and `PlayerSkill` are defined here but used nowhere outside this file — `AgentChatPanel` and `ml/adaptive.ts` both work with ad hoc/primitive shapes instead.

### src/proxy.ts

Next.js 16's renamed `middleware.ts` — Next's build tooling treats `proxy.ts`/`src/proxy.ts` as an interchangeable file-detection target for the same middleware slot (compiled output is still internally labeled `Proxy (Middleware)`). There is no separate `middleware.ts` anywhere in the repo.

1. Runs on nearly every request (matcher excludes static assets/images).
2. Wires a Supabase SSR client with a cookie adapter that refreshes auth cookies on every request — the standard "keep the session alive" pattern.
3. Calls `supabase.auth.getUser()`, then gates `PROTECTED_ROUTES = ["/lobby","/game","/results","/dashboard"]`: unauthenticated requests to these prefixes are redirected to `/?auth=required`.

### src/hooks/

Empty — not tracked by git, zero files. Hook-like logic (`useState`/`useEffect`/`useCallback` patterns) is currently written inline in every page/component rather than extracted here. Likely scaffolded for a future `useGameSession`/`useTeamRealtime`/`useSupabaseUser` that hasn't been written yet.

### src/sample-gmat-questions/

29 PNG screenshots (all dated 2026-06-28) — visual reference material used while authoring the GMAT question banks. No code, not consumed by the application.

---

## Cross-cutting findings

- **Two Zustand stores are fully dead code** — `src/store/gameStore.ts`, `src/store/teamStore.ts` are fully implemented, zero consumers anywhere in `src/`. The real pages re-implement equivalent state locally. If reviving them, the lobby page's local `TeamData`/`SlotData` types need reconciling with `Team`/`TeamSlot` from `@/types` first.
- **CodeFillPuzzle imports CodeMirror but never renders it** — `src/components/puzzle/CodeFillPuzzle.tsx`: a dynamic `CodeMirror` import and a language-extension loader are both defined and unused; the actual UI is a plain `<pre>` + `<input>`.
- **Landing page credits the wrong LLM provider** — `src/app/page.tsx` footer says "Claude AI (claude-sonnet-4-6)"; the actual agent routes run Groq's Llama 3.3 70B. `/privacy` correctly names Groq.
- **Hardcoded single-admin gate, repeated in three places** — `api/ml/analytics`, `gmat-test/[roomCode]/page.tsx`, and register/solo path visibility all independently check `email === "sameeraagk883@gmail.com"`. The fully-built GMAT full-test feature is currently reachable only by that one account.
- **`gmat_pending_result` localStorage key is flushed from two independent places** — `gmat-test/[roomCode]/page.tsx` and `profile/page.tsx` both attempt to recover and re-submit a locally-cached failed save; both are idempotent via `removeItem`, so this is safe but duplicated.
- **Path-id lists are maintained in two unlinked places** — `lib/puzzles/paths.ts` and `lib/security/schemas.ts` (`PATH_IDS`) both must be kept manually in sync; nothing derives one from the other.
- **Answer keys for legacy puzzles live in two places** — `lib/puzzles/validator.ts`'s hardcoded comparison strings and each puzzle's prose `agentContext` in `lib/puzzles/data/puzzles.ts` (fed to the AI teammate) describe the same answer independently and must be kept in sync by hand.
- **`cs_random` shuffling ignores the seed parameter** — in `lib/puzzles/loader.ts`'s `getQuestionsForPath()`, every other path branch respects a passed `seed` for deterministic multiplayer ordering; the `cs_random` branch always uses non-seeded `Math.random()`.
- **`auth/callback`'s failure redirect targets a page that doesn't exist** — `src/app/auth/callback/route.ts` redirects to `/login?error=auth_callback_failed` on a failed code exchange, but there is no `/login` route in the app; auth elsewhere is handled inline on `/register`.
