"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Terminal, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[var(--dark-border)] bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Terminal
            className="w-5 h-5 text-[var(--neon-cyan)] group-hover:animate-pulse-glow"
            strokeWidth={2}
          />
          <span
            className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-widest text-[var(--neon-cyan)] glow-cyan"
          >
            CODE<span className="text-white">ESCAPE</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/#how-it-works" className="hover:text-[var(--neon-cyan)] transition-colors">
            How It Works
          </Link>
          <Link href="/dashboard" className="hover:text-[var(--neon-cyan)] transition-colors">
            Leaderboard
          </Link>
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <Link
            href="/register"
            className="px-4 py-1.5 rounded border border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 transition-all box-glow-cyan text-xs font-semibold tracking-wider"
          >
            START GAME
          </Link>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            className="text-muted-foreground hover:text-[var(--neon-cyan)]"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[var(--dark-border)] bg-background/95 px-4 py-4 flex flex-col gap-4 text-sm text-muted-foreground">
          <Link href="/#how-it-works" onClick={() => setOpen(false)} className="hover:text-[var(--neon-cyan)]">
            How It Works
          </Link>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="hover:text-[var(--neon-cyan)]">
            Leaderboard
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="text-[var(--neon-cyan)] font-semibold tracking-wider"
          >
            START GAME →
          </Link>
        </div>
      )}
    </nav>
  );
}
