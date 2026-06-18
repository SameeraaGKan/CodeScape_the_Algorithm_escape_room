<div align="center">

<img src="legacy/main.png" alt="CodeEscape — The Algorithm Escape Room" width="100%" />

<br/>

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_Sonnet-D97706?style=for-the-badge&logo=anthropic&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=for-the-badge&logo=vercel)

**Solve CS algorithm puzzles. Escape the mainframe. Built for CodePath WEB101.**

</div>

---

## what is this

CodeEscape is a cyberpunk escape room where you solve real CS algorithm puzzles — Caesar ciphers, sorting algorithms, recursion traces, BFS mazes — to break out of a simulated mainframe. You bring a team (real humans OR AI agents), race the clock, and lean on your AI teammate when you're stuck.

The AI teammates aren't just chatbots. Each one has a different personality — one will coach you through it step by step, one will only ask Socratic questions, one acts like your hype person. You pick whoever matches your vibe.

Built this for **CodePath WEB101: Intro to Web Development**, Summer 2026 at UT Dallas. Started as a static HTML/CSS/JS event page (CodeScape v1) and turned into a full production app with a real database, live AI, real-time team sync, and a machine learning difficulty engine.

<div align="center">
<img src="legacy/chll.png" alt="solving puzzles together" width="70%" />
</div>

---

## the stack

| Layer | What |
|---|---|
| Framework | Next.js 16 App Router |
| Database | Supabase (PostgreSQL + Realtime + Auth) |
| ORM | Drizzle |
| AI | Claude Sonnet via Anthropic API |
| Rate limiting | Upstash Redis |
| Styling | Tailwind CSS v4 + cyberpunk CSS vars |
| Charts | Recharts |
| Deploy | Vercel |

---

## features

**🧩 4 puzzle types**
- Caesar cipher decode
- Code fill-in-the-blank (sorting, binary search, stacks)
- Recursion call stack tracing
- BFS/DFS algorithm maze

**🤖 4 AI agent personalities**

| Agent | Vibe |
|---|---|
| ARIA 💙 | your hype girl, validates every attempt, never gives the answer |
| BYTE 🟡 | step-by-step, holds your hand, reveals the approach after 3 fails |
| SIGMA ⚪ | Socratic mode only, forces you to think, very professional |
| ZAP ⚡ | chill, uses analogies and jokes, actually helpful |

Agents get full context — your wrong answer, how many hints you've burned, time left — and respond to *your specific mistake*, not a generic hint.

**👥 Team formation**
- Magic link auth (no passwords)
- Mix human + AI slots however you want
- Real-time lobby — see your teammates join live

**📈 Adaptive difficulty (IRT)**
- Item Response Theory model tracks your skill level (θ) per puzzle category
- Breezing through sorting puzzles? Next one gets harder
- Struggling with recursion? Gets easier until you build momentum

**📊 Analytics dashboard**
- Avg attempts per puzzle, hint usage by stage, agent popularity, skill distribution — all aggregated across sessions

<div align="center">
<img src="legacy/main2.png" alt="team at the terminal" width="70%" />
</div>

---

## why i built this

I wanted to make CS algorithm study feel less like a test and more like a game. The escape room format does that — the time pressure and the team dynamic make it feel like something you're playing together, not a problem set you're grinding alone at 2am.

The AI agent system was what I was most curious to build. Having four distinct personalities means you get to choose *how* you want to be helped, not just whether you want a hint. That turned out to matter more than I expected.

---

## what i learned

- **Next.js App Router** — server components, client components, Route Handlers, when to use each one
- **Streaming AI** — built token-by-token streaming from scratch using `ReadableStream` + `TextDecoder` instead of relying on library hooks
- **Supabase Realtime** — `postgres_changes` subscriptions for live lobby updates without polling
- **Item Response Theory** — implemented a psychometric model in TypeScript to estimate player skill from performance
- **Production debugging** — read `.d.ts` declaration files to understand breaking API changes in third-party packages when docs are out of date
- Dealing with like 6 different breaking API changes across Next.js 16, AI SDK v6, Zod v4, and Supabase SSR simultaneously

---

## running it locally

### you'll need
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- An [Anthropic](https://console.anthropic.com) API key
- An [Upstash](https://upstash.com) Redis database (free tier)

### setup

```bash
# 1. clone
git clone https://github.com/SameeraaGKan/CodeScape_the_Algorithm_escape_room.git
cd CodeScape_the_Algorithm_escape_room
npm install

# 2. create .env.local with your credentials (see below)

# 3. push the database schema
npx drizzle-kit push

# 4. start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### `.env.local`

```env
# Supabase — Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase Postgres — Settings > Database > Connection string
# if your password has @ in it, encode it as %40
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres

# Anthropic — console.anthropic.com > API Keys
ANTHROPIC_API_KEY=sk-ant-...

# Upstash — upstash.com > Redis > your database > REST API
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### Supabase setup
- **Realtime**: Dashboard → Database → Replication → enable for `teams` and `game_sessions`
- **Auth**: Dashboard → Authentication → Providers → Email → enabled

### deploy to Vercel
Push to GitHub, import in Vercel, add your env vars, done. Next.js deploys with zero config.

---

## what's next

- [ ] Multiplayer puzzle sync — when your teammate solves it, everyone advances live
- [ ] More puzzles — DP (knapsack, coin change), BSTs, hash map collisions, graph coloring
- [ ] Leaderboard with Elo-style ratings
- [ ] Instructor mode — build custom puzzle sets for a specific course
- [ ] Post-game hint replay — re-read the exact agent conversation that helped you
- [ ] Public launch as a free CS study tool

---

## contributing

Pull requests are welcome. Best places to contribute:

- **New puzzles** — add to `src/lib/puzzles/data/puzzles.ts`, all 4 puzzle types already work
- **Agent personality tuning** — `src/lib/ai/personalities.ts` — tweak system prompts based on what actually helps
- **Answer validation** — `src/lib/puzzles/validator.ts` — edge cases, whitespace handling, etc.
- **Mobile layout** — the game page needs more polish on small screens

```bash
git checkout -b feature/your-thing
# make changes
npx tsc --noEmit  # make sure types pass
# open a PR
```

Don't commit `.env.local` or any API keys.

---

## troubleshooting

**`supabaseUrl is required`** — `NEXT_PUBLIC_SUPABASE_URL` is empty in your `.env.local`

**Database connection refused** — if your Supabase password has `@` in it, encode it as `%40` in `DATABASE_URL`

**Upstash warnings during build** — non-fatal, just means env vars aren't set yet

**Magic link not arriving** — check Supabase Auth logs, make sure email provider is configured

**Agent chat not responding** — check `ANTHROPIC_API_KEY` is set (no surrounding quotes needed)

---

## acknowledgments

CodePath WEB101 curriculum · Anthropic Claude API · Supabase · Vercel · Upstash

---

<div align="center">

built by **[Sameeraa Ganesan Kannan](https://sameeraagkan.github.io/)** · UTD Summer 2026

*CodePath WEB101 — Intro to Web Development*

</div>
