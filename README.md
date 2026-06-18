# CodeEscape — The Algorithm Escape Room

> A cyberpunk-themed, AI-powered CS algorithm escape room built as a full-stack web application.

![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4.6-orange?logo=anthropic)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Project Overview

CodeEscape is an interactive, team-based escape room where players solve computer science algorithm puzzles to "break out" of a simulated cyberpunk mainframe. Each team is made up of human players and/or AI agent teammates — four distinct AI personalities powered by Claude — who provide real-time hints, encouragement, and guided learning as players work through puzzles involving sorting algorithms, Caesar ciphers, recursion call stacks, and graph traversal mazes.

This project was built for **CodePath WEB101: Intro to Web Development** as the capstone project. I chose this topic because I wanted to build something at the intersection of two things I genuinely care about: making CS concepts more approachable for beginners, and exploring what AI-assisted learning feels like in practice. The escape room format makes algorithm study feel like a game rather than homework.

---

## Background

This project was developed for **CodePath WEB101 — Intro to Web Development**, Summer 2026 at UT Dallas. It is a ground-up rebuild of an earlier static HTML/CSS/JS event registration page (CodeScape v1) into a production-grade, full-stack Next.js application. The rebuild introduced real interactive gameplay, a live database, AI integration, real-time team sync, and a machine learning adaptive difficulty system — none of which existed in v1.

---

## Features

### Gameplay
- **4 puzzle types**: Caesar cipher decode, code fill-in-the-blank, recursion call stack tracing, and BFS/DFS algorithm maze
- **6 puzzles total** at launch, covering sorting, divide & conquer, recursion, graph algorithms, and data structures
- **Timed stages** with a color-coded countdown bar (cyan → amber → red as time runs low)
- **Score system** with points per puzzle weighted by speed and hints used

### AI Agent System
Four distinct AI teammate personalities, each powered by `claude-sonnet-4-6`:

| Agent | Personality | Style |
|---|---|---|
| ARIA | Supportive | Validates thinking, builds confidence, never gives answers |
| BYTE | Spoon Feeder | Step-by-step micro-hints, reveals approach after 3 failures |
| SIGMA | Supervisor | Socratic questions only, time complexity focus, professional |
| ZAP | Friendly | Casual analogies, light humor, still genuinely helpful |

- Real-time streaming chat with each agent (token-by-token display)
- Agents receive full context: puzzle type, player's current wrong answer, hints already given, and time remaining
- Smart hint engine: after a wrong submission, Claude analyzes the *specific* wrong answer and generates a targeted hint — not a generic one

### Team Formation
- Magic link authentication via Supabase Auth (no passwords)
- Create a team and configure each slot: invite a human via link, or assign an AI agent
- Real-time lobby with Supabase Realtime — slot fills appear instantly across all browsers
- Host-only "Start Game" control

### Adaptive Difficulty (ML)
- Item Response Theory (IRT) model estimates each player's skill level (θ) from their performance
- θ updates after every puzzle: correct + fast → θ increases; slow + many hints → θ decreases
- Next puzzle selection is matched to current θ — struggling players get easier puzzles, fast players get harder ones

### Analytics Dashboard
- Aggregated stats across all sessions: avg attempts per puzzle, hint usage by stage, skill distribution, agent personality popularity
- Recharts bar charts and radar charts with cyberpunk color palette

### Security
- Zod validation on every API route input
- Upstash Redis rate limiting: 10 req/min on agent chat, 30/min on puzzle submit, 5/min on team create
- CSP, X-Frame-Options, HSTS, and other security headers via `next.config.ts`
- Puzzle answers never sent to the client — validation runs server-side only

---

## Implementation Details

### Architecture
The entire application is a single Next.js 16 App Router project deployed to Vercel. There is no separate backend server — all API logic lives in Next.js Route Handlers under `src/app/api/`.

```
src/
├── app/
│   ├── page.tsx                # Landing page
│   ├── register/               # Team formation + auth gate
│   ├── lobby/[teamId]/         # Waiting room with real-time slot updates
│   ├── game/[roomCode]/        # Puzzle engine + agent sidebar
│   ├── results/[roomCode]/     # Session summary
│   ├── dashboard/              # Analytics charts
│   └── api/                    # Route handlers (teams, rooms, agent, ML)
├── components/
│   ├── puzzle/                 # CipherPuzzle, CodeFillPuzzle, RecursionTrace, AlgorithmMaze
│   └── agent/                  # AgentChatPanel (custom streaming)
└── lib/
    ├── ai/personalities.ts     # 4 agent system prompts + context injection
    ├── ml/adaptive.ts          # IRT difficulty engine
    ├── puzzles/validator.ts    # Server-side answer checking
    └── security/               # Zod schemas + Upstash rate limiters
```

### Notable Challenges Overcome

**AI SDK v6 breaking changes** — The `ai` package completely changed its API in v6: `maxTokens` → `maxOutputTokens`, `toDataStreamResponse()` → `toTextStreamResponse()`, and `useChat` moved to a separate package with an incompatible protocol. Solved by reading type declaration files directly and building a custom streaming component using raw `fetch` + `ReadableStream`.

**Next.js 16 API changes** — `params` in dynamic route segments became a `Promise` requiring `use(params)` to unwrap in client components. Middleware was also renamed to "proxy" (`middleware.ts` → `proxy.ts`).

**Supabase client/server split** — A single `supabase.ts` importing `next/headers` caused build failures when imported by client components. Fixed by creating a lazy browser-safe singleton (`getSupabaseBrowser()`) and a separate server-only file.

**Zod v4 record type** — `z.record(valueType)` (one-argument form) was removed in Zod v4. Now requires both key and value: `z.record(z.string(), z.string())`.

**`useSearchParams` Suspense requirement** — Next.js App Router requires `useSearchParams()` to be wrapped in a `<Suspense>` boundary. Solved by splitting the register page into an inner content component wrapped by a Suspense shell.

---

## Learning Outcomes

- **Full-stack Next.js App Router**: Learned the distinction between Server Components, Client Components, Route Handlers, and proxy/middleware, and when each is appropriate.
- **Streaming AI responses**: Implemented token-by-token streaming from Claude using `ReadableStream` and `TextDecoder` — understanding how streaming works at the HTTP level rather than relying on library abstractions.
- **Real-time with Supabase**: Used `postgres_changes` subscriptions to push database updates to connected clients without polling.
- **Item Response Theory**: Implemented a psychometric model in TypeScript — the math behind estimating ability from performance rather than just tracking right/wrong.
- **TypeScript strictness**: Learned to read `.d.ts` declaration files directly to understand breaking API changes in third-party packages when docs lag behind releases.
- **Production build debugging**: Traced and fixed multiple classes of build-time errors — module boundary violations, prerender failures, missing Suspense boundaries — by reading stack traces and bundle output.

---

## Project Rationale

I picked an escape room format because it reframes CS problem-solving as exploration rather than evaluation. When you're stuck in a timed room with teammates (even AI ones), the collaborative pressure is different from a LeetCode timer — it feels more like a game than a test.

The AI agent system was the part I was most curious about. Rather than one generic "hint bot," having four distinct personalities lets a player choose how much hand-holding they want. BYTE (spoon feeder) is for someone who's completely lost; SIGMA (supervisor) is for someone who wants to be pushed. The question of *how* you deliver a hint — not just *what* the hint says — turns out to matter a lot for learning.

---

## Future Development

- **More puzzle types**: Dynamic programming (knapsack/coin change), binary search trees, hash map collision resolution, graph coloring
- **Multiplayer puzzle sync**: When one teammate solves a puzzle, all clients advance simultaneously via Supabase Realtime
- **Leaderboard**: Global and team-based scoreboards with Elo-style ratings
- **Hint replay**: After session completion, replay the exact agent conversation that helped you solve each puzzle
- **Custom puzzle builder**: Let instructors create puzzle sets via a form, stored in Supabase
- **OAuth login**: GitHub/Google OAuth alongside magic link for faster sign-in
- **Mobile polish**: Full responsive layout for tablet play in a classroom setting

---

## Future Plans

The immediate next step is a live playtest session with classmates to gather feedback on puzzle difficulty calibration and agent personality usefulness. After that:

1. **v2.1** — Multiplayer puzzle sync so teams feel connected during gameplay, not just in the lobby
2. **v2.2** — Instructor dashboard: create custom puzzle sets for specific courses (e.g., a UTD CS 2336 puzzle pack)
3. **v3.0** — Open the platform publicly as a free CS study tool, with a community puzzle contribution system

---

## Running the Code

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key
- An [Upstash](https://upstash.com) Redis database (free tier works)

### 1. Clone and install
```bash
git clone https://github.com/SameeraaGKan/CodeScape_the_Algorithm_escape_room.git
cd CodeScape_the_Algorithm_escape_room
npm install
```

### 2. Set up environment variables
Create a `.env.local` file in the project root:

```env
# Supabase — from your Supabase project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase Postgres — Settings > Database > Connection string (Transaction pooler)
# NOTE: URL-encode special characters in your password (@ becomes %40)
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres

# Anthropic Claude API — console.anthropic.com > API Keys
ANTHROPIC_API_KEY=sk-ant-...

# Upstash Redis — upstash.com > Redis > Create Database > REST API section
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### 3. Push the database schema
```bash
npx drizzle-kit push
```

### 4. Enable Supabase Realtime
In your Supabase dashboard → **Database** → **Replication**, enable realtime for the `teams` and `game_sessions` tables.

### 5. Enable Supabase Auth
In your Supabase dashboard → **Authentication** → **Providers**, ensure **Email** is enabled.

### 6. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Build for production
```bash
npm run build
npm start
```

### Deploying to Vercel
1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add all environment variables under Settings → Environment Variables
4. Deploy — Next.js deploys with zero config

---

## Contributing

Contributions are welcome. Areas where help is especially appreciated:

- **New puzzles**: Add definitions to `src/lib/puzzles/data/puzzles.ts` following the existing schema. All four puzzle types are already supported — just add data.
- **Answer validation edge cases**: `src/lib/puzzles/validator.ts` — improve normalization (whitespace handling, case sensitivity per puzzle type)
- **Agent personality tuning**: `src/lib/ai/personalities.ts` — refine system prompts based on playtesting feedback
- **Accessibility**: Keyboard navigation and screen reader support could be improved throughout
- **Mobile layout**: The game page sidebar collapses to tabs on mobile — more polish needed

To contribute:
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-puzzle`
3. Run `npx tsc --noEmit` to verify no type errors before submitting
4. Open a pull request describing what you added and why

Please do not commit `.env.local` or any API keys.

---

## Troubleshooting

**`supabaseUrl is required` error during build** — Your `NEXT_PUBLIC_SUPABASE_URL` is empty or missing in `.env.local`.

**`DATABASE_URL` connection refused** — If your Supabase password contains `@`, it must be URL-encoded as `%40` in the connection string.

**Upstash Redis warnings during build** — These are expected if env vars aren't set; they're non-fatal warnings. Set your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to silence them.

**Magic link not arriving** — Check Supabase Auth logs in your dashboard. Ensure your Supabase project's email provider is configured and the redirect URL matches your local or production URL.

**Agent chat not streaming** — Verify `ANTHROPIC_API_KEY` is set correctly (no surrounding quotes needed in `.env.local`).

---

## Acknowledgments

- **CodePath** for the WEB101 curriculum and the project structure that pushed me to build something real
- **Anthropic** for the Claude API
- **Supabase** for auth + real-time + PostgreSQL in one free-tier package
- **Vercel** for Next.js and zero-config deployment
- **Upstash** for serverless Redis on the free tier

---

## License

MIT — do whatever you want with it, just don't use it to cheat on your actual CS homework.
