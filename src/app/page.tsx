import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Terminal, Zap, Brain, Users, Lock, ChevronRight } from "lucide-react";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";

export default function LandingPage() {
  const agents = Object.entries(AGENT_CONFIGS);

  return (
    <>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 overflow-hidden grid-bg">
        <div className="pointer-events-none absolute inset-0 scanline" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--neon-cyan)]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--neon-magenta)]/5 blur-3xl" />

        <div className="relative z-10 text-center max-w-4xl animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
            SYSTEM ONLINE — ESCAPE SEQUENCE INITIALIZED
          </div>

          <h1 className="font-[family-name:var(--font-orbitron)] text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="text-white">CODE</span>
            <span className="text-[var(--neon-cyan)] glow-cyan">ESCAPE</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            An algorithm-powered escape room where you race against the clock,
            crack CS puzzles, and choose your teammates — human or AI.
          </p>
          <p className="text-sm text-gray-600 mb-12">
            Sorting · Recursion · Ciphers · Data Structures · Graph Traversal
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[var(--neon-cyan)] text-black font-bold rounded text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
            >
              <Terminal className="w-4 h-4" />
              INITIALIZE TEAM
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 text-gray-400 hover:border-[var(--neon-cyan)]/50 hover:text-[var(--neon-cyan)] rounded text-sm tracking-widest transition-all"
            >
              HOW IT WORKS
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-20 grid grid-cols-3 gap-8 max-w-lg w-full">
          {[
            { label: "Puzzles", value: "6" },
            { label: "AI Agents", value: "4" },
            { label: "Stages", value: "3" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-[var(--neon-cyan)] glow-cyan">
                {value}
              </div>
              <div className="text-xs text-gray-500 tracking-widest mt-1">{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 max-w-6xl mx-auto">
        <h2 className="font-[family-name:var(--font-orbitron)] text-3xl font-bold text-center mb-16">
          <span className="text-[var(--neon-cyan)] glow-cyan">HOW IT</span>{" "}
          <span className="text-white">WORKS</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-6 h-6" />,
              step: "01",
              title: "Form Your Team",
              desc: "Create a team of up to 6. Fill each slot with a friend via invite link or pick an AI agent with your preferred personality.",
            },
            {
              icon: <Brain className="w-6 h-6" />,
              step: "02",
              title: "Solve CS Puzzles",
              desc: "Work through 6 algorithm challenges across 3 stages. Sorting, recursion, ciphers, mazes — all in a neon cyberpunk escape room.",
            },
            {
              icon: <Zap className="w-6 h-6" />,
              step: "03",
              title: "AI Adapts to You",
              desc: "Our IRT-based ML engine tracks your skill and adjusts difficulty in real-time. Agents give personalized help based on your specific wrong answers.",
            },
          ].map(({ icon, step, title, desc }) => (
            <div
              key={step}
              className="relative p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] hover:border-[var(--neon-cyan)]/40 transition-all group"
            >
              <div className="text-[var(--neon-cyan)] mb-4">{icon}</div>
              <div className="font-[family-name:var(--font-orbitron)] text-xs text-gray-600 mb-2">
                STEP {step}
              </div>
              <h3 className="font-semibold text-white mb-3">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agent Roster ─────────────────────────────────── */}
      <section className="py-24 px-4 bg-[var(--dark-card)] border-y border-[var(--dark-border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-orbitron)] text-3xl font-bold text-center mb-4">
            <span className="text-white">CHOOSE YOUR</span>{" "}
            <span className="text-[var(--neon-magenta)] glow-magenta">AI AGENTS</span>
          </h2>
          <p className="text-gray-500 text-center text-sm mb-16 max-w-lg mx-auto">
            Each agent has a distinct personality. Pick the style that matches how you want to be helped.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map(([key, config]) => (
              <div
                key={key}
                className="p-5 rounded border border-[var(--dark-border)] bg-black hover:scale-[1.02] transition-all"
              >
                <div className="text-3xl mb-3">{config.emoji}</div>
                <div
                  className="font-[family-name:var(--font-orbitron)] text-sm font-bold mb-1"
                  style={{ color: config.color }}
                >
                  {config.name}
                </div>
                <div className="text-xs text-gray-500 mb-3 italic">{config.tagline}</div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{config.description}</p>
                <div
                  className="text-xs italic text-gray-600 border-l-2 pl-3"
                  style={{ borderColor: config.color }}
                >
                  {config.exampleQuote}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stages ────────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <h2 className="font-[family-name:var(--font-orbitron)] text-3xl font-bold text-center mb-16">
          <span className="text-[var(--neon-cyan)] glow-cyan">3 STAGES.</span>{" "}
          <span className="text-white">6 PUZZLES.</span>
        </h2>

        <div className="space-y-4">
          {[
            { stage: "Stage 01", title: "Initialization Protocol", desc: "Decrypt an intercepted transmission using Caesar cipher fundamentals.", difficulty: "Easy", color: "#00ff88" },
            { stage: "Stage 02", title: "Code Breakers Challenge", desc: "Restore corrupted sorting algorithms, fix binary search, validate bracket sequences, and trace recursive call stacks.", difficulty: "Medium", color: "#05b9b6" },
            { stage: "Stage 03", title: "Algorithm Maze — Final Escape", desc: "Navigate the Algorithm Maze using BFS graph traversal to find the escape route.", difficulty: "Hard", color: "#ff00cc" },
          ].map(({ stage, title, desc, difficulty, color }) => (
            <div key={stage} className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] hover:border-[var(--neon-cyan)]/30 transition-all">
              <div className="font-[family-name:var(--font-orbitron)] text-xs font-bold shrink-0 w-20" style={{ color }}>{stage}</div>
              <div className="flex-1">
                <div className="font-semibold text-white mb-1">{title}</div>
                <div className="text-sm text-gray-500">{desc}</div>
              </div>
              <div className="text-xs px-2 py-1 rounded border shrink-0" style={{ color, borderColor: color, background: `${color}18` }}>{difficulty}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center grid-bg border-t border-[var(--dark-border)]">
        <div className="max-w-2xl mx-auto">
          <Lock className="w-12 h-12 text-[var(--neon-cyan)] mx-auto mb-6 animate-pulse-glow" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-4xl font-black mb-6">
            <span className="text-white">THE EXIT IS</span>{" "}
            <span className="text-[var(--neon-cyan)] glow-cyan">LOCKED.</span>
          </h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            Form your team, pick your agents, and crack the algorithm maze to escape.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[var(--neon-cyan)] text-black font-bold rounded text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
          >
            <Terminal className="w-4 h-4" />
            BEGIN ESCAPE SEQUENCE
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--dark-border)] py-8 px-4 text-center text-xs text-gray-600">
        <p className="font-[family-name:var(--font-orbitron)] text-[var(--neon-cyan)]/40 mb-2">CODEESCAPE</p>
        <p>Built with Next.js · Supabase · Claude AI · Tailwind CSS</p>
      </footer>
    </>
  );
}
