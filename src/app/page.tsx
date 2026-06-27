import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { MouseBackground } from "@/components/layout/MouseBackground";
import { Terminal, Zap, Brain, Users, Lock, ChevronRight, Map, Swords, UserRound } from "lucide-react";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";

export default function LandingPage() {
  const agents = Object.entries(AGENT_CONFIGS);

  return (
    <>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 overflow-hidden">
        <MouseBackground />

        <div className="relative z-10 text-center max-w-4xl w-full animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-[10px] sm:text-xs tracking-widest mb-8 max-w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse shrink-0" />
            <span className="truncate">SYSTEM ONLINE — ESCAPE SEQUENCE INITIALIZED</span>
          </div>

          <h1 className="font-[family-name:var(--font-orbitron)] text-4xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 leading-none">
            <span className="text-white" style={{ textShadow: "0 0 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.4)" }}>CODE</span>
            <span
              className="text-[var(--neon-cyan)]"
              style={{ textShadow: "0 0 15px var(--neon-cyan), 0 0 40px var(--neon-cyan)" }}
            >ESCAPE</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-200 mx-auto mb-3 whitespace-nowrap px-2">
            Choose your domain. Beat the clock. Escape with your code.
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mb-7 sm:mb-9 px-2">
            Algorithms · ML/AI · Cybersecurity · Databases · Networks · Theory · and more
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 rounded text-sm tracking-widest transition-all"
            >
              <Terminal className="w-4 h-4" />
              PLAY WITH A TEAM
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/solo"
              className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 rounded text-sm tracking-widest transition-all"
            >
              <UserRound className="w-4 h-4" />
              PLAY SOLO
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-xs sm:max-w-xl w-full px-2">
          {[
            { label: "Topics",     value: "12+" },
            { label: "Game Modes", value: "2"   },
            { label: "AI Agents",  value: "4"   },
            { label: "Questions",  value: "240+" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-black text-[var(--neon-cyan)] glow-cyan">
                {value}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground tracking-widest mt-1">{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Game Modes ───────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 max-w-5xl mx-auto">
        <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold text-center mb-4">
          <span className="text-foreground">PICK YOUR</span>{" "}
          <span className="text-[var(--neon-cyan)] glow-cyan">BATTLE STYLE</span>
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-10 sm:mb-16 max-w-xl mx-auto">
          Same questions, different dynamics. Choose how you want to compete before building your team.
        </p>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Team Mode */}
          <div className="p-5 sm:p-7 rounded border border-[var(--neon-cyan)]/30 bg-[var(--dark-card)] hover:border-[var(--neon-cyan)]/60 transition-all">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="w-10 h-10 rounded flex items-center justify-center text-xl shrink-0" style={{ background: "var(--neon-cyan)18", border: "1px solid var(--neon-cyan)40" }}>
                🤝
              </div>
              <div>
                <div className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-[var(--neon-cyan)]">TEAM MODE</div>
                <div className="text-xs text-muted-foreground italic">Collaborate to conquer</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 sm:mb-5">
              Everyone attempts every question at their own pace. The timer is the only thing that advances the game —
              no one gets left behind. A live status card shows who&apos;s done so teammates can regroup and discuss.
            </p>
            <ul className="space-y-2">
              {[
                "Live sidebar shows who's done vs still thinking",
                "Game advances when everyone answers — or time runs out",
                "Points based on speed + correctness, shared as a team",
                "Use the team chat to hint without spoiling",
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-[var(--neon-cyan)] mt-0.5 shrink-0">▸</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Race Mode */}
          <div className="p-5 sm:p-7 rounded border border-[var(--neon-green)]/30 bg-[var(--dark-card)] hover:border-[var(--neon-green)]/60 transition-all">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="w-10 h-10 rounded flex items-center justify-center text-xl shrink-0" style={{ background: "#00ff8818", border: "1px solid #00ff8840" }}>
                ⚡
              </div>
              <div>
                <div className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-[var(--neon-green)]">RACE MODE</div>
                <div className="text-xs text-muted-foreground italic">Fastest finger wins</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 sm:mb-5">
              Every player for themselves. Answer fast and correctly for maximum points.
              A live leaderboard updates in real time as your opponents lock in their answers — watch the rankings shift.
            </p>
            <ul className="space-y-2">
              {[
                "Individual leaderboard updates live as players answer",
                "Speed bonus: answer earlier = more base points",
                "Correctness multiplier: correct answers score much higher",
                "Wrong but fast still scores — don't just sit there",
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-[var(--neon-green)] mt-0.5 shrink-0">▸</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 max-w-6xl mx-auto border-t border-[var(--dark-border)]">
        <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold text-center mb-4">
          <span className="text-[var(--neon-cyan)] glow-cyan">HOW IT</span>{" "}
          <span className="text-foreground">WORKS</span>
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-10 sm:mb-16 max-w-xl mx-auto">
          Three setup steps, then you&apos;re in.
        </p>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {[
            {
              icon: <Map className="w-6 h-6" />,
              step: "01",
              color: "var(--neon-cyan)",
              title: "Pick Your Challenge",
              desc: "Choose from 12+ CS topic tracks — Algorithms, ML/AI, Cybersecurity, Databases, Networks, and more. Or grab a Random Mix for a wildcard session. Each track draws 10 curated questions from a pool of 20+.",
            },
            {
              icon: <Swords className="w-6 h-6" />,
              step: "02",
              color: "#00ff88",
              title: "Choose Your Game Mode",
              desc: "Team Mode keeps everyone moving together — live status cards, shared score, and time to collaborate. Race Mode flips it competitive — individual leaderboard, speed bonuses, and no mercy.",
            },
            {
              icon: <Users className="w-6 h-6" />,
              step: "03",
              color: "#a855f7",
              title: "Build Your Team",
              desc: "Go solo or invite friends (up to 6 players). Any open human slot can be filled with an AI agent instead — choose a personality: ARIA (supportive), BYTE (step-by-step), SIGMA (Socratic), or ZAP (casual).",
            },
            {
              icon: <Brain className="w-6 h-6" />,
              step: "04",
              color: "#ff00cc",
              title: "Race the Clock",
              desc: "Answer fast and correctly for maximum points. Your AI teammate reacts in real time — checking in if you're quiet, reacting to wrong answers, warning you when time is low. Results and ranking wait on the other side.",
            },
          ].map(({ icon, step, color, title, desc }) => (
            <div
              key={step}
              className="relative p-5 sm:p-7 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] hover:border-[var(--neon-cyan)]/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 w-10 h-10 rounded flex items-center justify-center"
                  style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
                >
                  {icon}
                </div>
                <div>
                  <div className="font-[family-name:var(--font-orbitron)] text-[10px] tracking-widest mb-1" style={{ color }}>
                    STEP {step}
                  </div>
                  <h3 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agent Roster ─────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-[var(--dark-card)] border-y border-[var(--dark-border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold text-center mb-4">
            <span className="text-foreground">CHOOSE YOUR</span>{" "}
            <span className="text-[var(--neon-magenta)] glow-magenta">AI AGENTS</span>
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-10 sm:mb-16 max-w-lg mx-auto">
            Each agent has a distinct personality. Pick the style that matches how you want to be helped.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {agents.map(([key, config]) => (
              <div
                key={key}
                className="p-4 sm:p-5 rounded border border-[var(--dark-border)] bg-card hover:scale-[1.02] transition-all"
              >
                <div className="text-3xl mb-3">{config.emoji}</div>
                <div
                  className="font-[family-name:var(--font-orbitron)] text-sm font-bold mb-1"
                  style={{ color: config.color }}
                >
                  {config.name}
                </div>
                <div className="text-xs text-muted-foreground mb-3 italic">{config.tagline}</div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{config.description}</p>
                <div
                  className="text-xs italic text-muted-foreground border-l-2 pl-3"
                  style={{ borderColor: config.color }}
                >
                  {config.exampleQuote}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Topic Tracks ──────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
        <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold text-center mb-4">
          <span className="text-[var(--neon-cyan)] glow-cyan">12 TRACKS.</span>{" "}
          <span className="text-foreground">ONE ESCAPE ROOM.</span>
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-10 sm:mb-16 max-w-xl mx-auto">
          Every track pulls 10 randomized questions from a curated bank. No two sessions are the same.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: "⚡", label: "Algorithms & Data Structures", diff: "Intermediate", color: "#05b9b6" },
            { icon: "∞", label: "Computational Theory",          diff: "Advanced",     color: "#05b9b6" },
            { icon: "∑", label: "Discrete Mathematics",          diff: "Intermediate", color: "#05b9b6" },
            { icon: "🖥", label: "OS & Compilers",               diff: "Advanced",     color: "#0066ff" },
            { icon: "🌐", label: "Computer Networks",            diff: "Intermediate", color: "#0066ff" },
            { icon: "🔐", label: "Cybersecurity",                diff: "Intermediate", color: "#0066ff" },
            { icon: "🧬", label: "Machine Learning & AI",        diff: "Advanced",     color: "#ff00cc" },
            { icon: "🗄", label: "Databases",                    diff: "Intermediate", color: "#ff00cc" },
            { icon: "📈", label: "Data Science",                 diff: "Intermediate", color: "#ff00cc" },
            { icon: "🏗", label: "Software Engineering",         diff: "Intermediate", color: "#00ff88" },
            { icon: "🎨", label: "Computer Graphics",            diff: "Advanced",     color: "#00ff88" },
            { icon: "👆", label: "HCI & UX",                    diff: "Beginner",     color: "#00ff88" },
          ].map(({ icon, label, diff, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 sm:p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] hover:border-[var(--neon-cyan)]/30 transition-all"
            >
              <span className="text-xl shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-foreground font-medium truncate">{label}</div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded border shrink-0 tracking-widest"
                style={{ color, borderColor: `${color}50`, background: `${color}15` }}
              >
                {diff}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solo Play ─────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-[var(--dark-card)] border-y border-[var(--dark-border)]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 w-full text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] text-xs tracking-widest mb-6">
              <UserRound className="w-3 h-3" />
              NO TEAM REQUIRED
            </div>
            <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold mb-4">
              <span className="text-foreground">FLYING</span>{" "}
              <span className="text-[var(--neon-cyan)] glow-cyan">SOLO?</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
              No teammates, no waiting for a lobby to fill. Pick a topic, optionally grab an AI agent for company,
              and jump straight into the questions. Your results still count toward your profile and the leaderboard.
            </p>
            <ul className="space-y-2 mb-8 text-left">
              {[
                "Pick any of the 12+ CS topic tracks",
                "Optional AI agent companion — or go it completely alone",
                "Same timer, same scoring, full results page after",
                "Skip straight from path selection to the game — no team builder",
              ].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-[var(--neon-cyan)] mt-0.5 shrink-0">▸</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[var(--neon-cyan)] text-black font-bold rounded text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
            >
              <UserRound className="w-4 h-4" />
              START SOLO SESSION
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-xs sm:max-w-sm mx-auto md:mx-0">
            {[
              { emoji: "🧠", label: "Just Me", sub: "No hints. Pure focus." },
              { emoji: "🤖", label: "Me + ARIA", sub: "Supportive & warm" },
              { emoji: "⚡", label: "Me + ZAP", sub: "Casual & quick" },
              { emoji: "🔬", label: "Me + SIGMA", sub: "Socratic method" },
            ].map(({ emoji, label, sub }) => (
              <div key={label} className="p-3 sm:p-4 rounded border border-[var(--dark-border)] bg-card text-center">
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="text-xs font-semibold text-foreground mb-0.5">{label}</div>
                <div className="text-[11px] text-muted-foreground italic">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 text-center grid-bg border-t border-[var(--dark-border)]">
        <div className="max-w-2xl mx-auto">
          <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--neon-cyan)] mx-auto mb-6 animate-pulse-glow" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-4xl font-black mb-6">
            <span className="text-foreground">YOUR KNOWLEDGE</span>{" "}
            <span className="text-[var(--neon-cyan)] glow-cyan">IS THE KEY.</span>
          </h2>
          <p className="text-muted-foreground mb-4 leading-relaxed text-sm sm:text-base">
            Pick a topic, pick a mode, build your crew — and race the clock with an AI agent that has your back.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-8 sm:mb-10 tracking-widest">
            Powered by Claude AI (claude-sonnet-4-6) · Team & Race Modes · Real-time leaderboard
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3 sm:py-4 bg-[var(--neon-cyan)] text-black font-bold rounded text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
            >
              <Terminal className="w-4 h-4" />
              PLAY WITH A TEAM
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/solo"
              className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3 sm:py-4 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 rounded text-sm tracking-widest transition-all"
            >
              <UserRound className="w-4 h-4" />
              PLAY SOLO
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--dark-border)] py-6 sm:py-8 px-4 text-center text-xs text-muted-foreground">
        <p className="font-[family-name:var(--font-orbitron)] text-[var(--neon-cyan)]/40 mb-2">CODEESCAPE</p>
        <p>Built with Next.js 15 · Supabase · Claude AI (claude-sonnet-4-6) · Tailwind CSS · Vercel</p>
        <p className="mt-2">
          Built by{" "}
          <a
            href="https://sameeraagkan.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--neon-cyan)] hover:underline"
          >
            Sameeraa
          </a>
        </p>
      </footer>
    </>
  );
}
