<div align="center">

<img src="public/screenshots/hero.png" alt="CodeEscape — The Algorithm Escape Room" width="100%" />

<br/><br/>

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_Sonnet-D97706?style=for-the-badge&logo=anthropic&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=for-the-badge&logo=vercel)

**Solve CS algorithm puzzles. Escape the mainframe. Built for CodePath WEB101.**

</div>

---

## Project Overview

CodeEscape is an interactive, team-based escape room where players solve computer science algorithm puzzles to "break out" of a simulated cyberpunk mainframe. Each team is made up of human players and/or AI agent teammates — four distinct AI personalities powered by Claude — who provide real-time hints, encouragement, and guided learning as players work through puzzles involving sorting algorithms, Caesar ciphers, recursion call stacks, and graph traversal mazes.

This project was built for **CodePath WEB101: Intro to Web Development** as the capstone project. I chose this topic because I wanted to build something at the intersection of two things I genuinely care about: making CS concepts more approachable for beginners, and exploring what AI-assisted learning feels like in practice. The escape room format makes algorithm study feel like a game rather than homework.

<div align="center">
<img src="public/screenshots/puzzle.png" alt="Players solving puzzles together" width="70%" />
</div>

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
| ARIA 💙 | Supportive | Validates thinking, builds confidence, never gives answers |
| BYTE 🟡 | Spoon Feeder | Step-by-step micro-hints, reveals approach after 3 failures |
| SIGMA ⚪ | Supervisor | Socratic questions only, time complexity focus, professional |
| ZAP ⚡ | Friendly | Casual analogies, light humor, still genuinely helpful |

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
- CSP, X-Frame-Options, HSTS, and other security headers
- Puzzle answers never sent to the client — validation runs server-side only

<div align="center">
<img src="public/screenshots/team.png" alt="Team at the terminal" width="70%" />
</div>

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

**AI SDK v6 breaking changes** — The `ai` package completely changed its API in v6. Solved by reading type declaration files directly and building a custom streaming component using raw `fetch` + `ReadableStream` instead of fighting the new SDK hooks.

**Next.js 16 API changes** — `params` in dynamic route segments became a `Promise` requiring `use(params)` to unwrap. Middleware was also renamed to "proxy" (`middleware.ts` → `proxy.ts`).

**Supabase client/server split** — A single file importing `next/headers` caused client component build failures. Fixed with a lazy browser-safe singleton and a separate server-only module.

**Zod v4 record type** — `z.record(valueType)` was removed in Zod v4. Now requires both key and value: `z.record(z.string(), z.string())`.

---

## Learning Outcomes

- **Full-stack Next.js App Router** — server components, client components, Route Handlers, and when each is appropriate
- **Streaming AI responses** — implemented token-by-token streaming from Claude using `ReadableStream` + `TextDecoder` at the HTTP level
- **Real-time with Supabase** — `postgres_changes` subscriptions for live lobby updates without polling
- **Item Response Theory** — implemented a psychometric model in TypeScript to estimate ability from performance
- **Production debugging** — read `.d.ts` declaration files to understand breaking API changes when documentation lags behind releases
- Navigating 6 simultaneous breaking API changes across Next.js 16, AI SDK v6, Zod v4, and Supabase SSR

---

## Project Rationale

The escape room format reframes CS problem-solving as exploration rather than evaluation. The collaborative pressure of a timed room with teammates feels like a game rather than a test.

The AI agent system was the most interesting part to build. Four distinct personalities let a player choose *how* they want to be helped, not just whether they want a hint. BYTE is for someone who's lost; SIGMA is for someone who wants to be pushed. The way a hint is delivered matters as much as what the hint says.

---

## Future Development

- **More puzzle types** — dynamic programming, binary search trees, hash map collisions, graph coloring
- **Multiplayer puzzle sync** — when one teammate solves a puzzle, all clients advance simultaneously
- **Leaderboard** — global and team-based scoreboards with Elo-style ratings
- **Hint replay** — after session completion, replay the agent conversation that helped you
- **Custom puzzle builder** — let instructors create puzzle sets for specific courses
- **OAuth login** — GitHub/Google alongside magic link

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
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Supabase Postgres — Settings > Database > Connection string
# NOTE: URL-encode special characters in your password 
DATABASE_URL=...

# Anthropic Claude API — console.anthropic.com > API Keys
ANTHROPIC_API_KEY=...

# Upstash Redis — upstash.com > Redis > Create Database > REST API section
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Push the database schema
```bash
npx drizzle-kit push
```

### 4. Enable Supabase Realtime
Dashboard → **Database** → **Replication** → enable for `teams` and `game_sessions`

### 5. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploying to Vercel
Push to GitHub, import at [vercel.com](https://vercel.com), add all environment variables under Settings → Environment Variables, and deploy. Next.js deploys with zero config.

---

## Contributing

Contributions are welcome. Best places to contribute:

- **New puzzles** — add to `src/lib/puzzles/data/puzzles.ts`, all 4 puzzle types already supported
- **Agent personality tuning** — `src/lib/ai/personalities.ts`
- **Answer validation edge cases** — `src/lib/puzzles/validator.ts`
- **Mobile layout polish** — the game page sidebar on small screens

```bash
git checkout -b feature/your-thing
npx tsc --noEmit   # verify types pass
# open a pull request
```

Please do not commit `.env.local` or any API keys.

---

## Troubleshooting

**Upstash warnings during build** — non-fatal, disappear once env vars are set

**Magic link not arriving** — check Supabase Auth logs; verify email provider is configured

**Agent chat not responding** — verify `ANTHROPIC_API_KEY` is set (no surrounding quotes needed)

---

## Acknowledgments

CodePath WEB101 curriculum · Anthropic Claude API · Supabase · Vercel · Upstash

---

<div align="center">

Built by **[Sameeraa](https://sameeraagkan.github.io/)** &nbsp;·&nbsp;Summer 2026


</div>
