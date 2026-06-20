"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Terminal, Sun, Moon, LogOut, User2, BarChart2 } from "lucide-react";
import { useTheme } from "next-themes";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { User, Session, AuthChangeEvent, UserResponse } from "@supabase/supabase-js";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const sb = getSupabaseBrowser();
    // getUser() fetches fresh user including latest metadata
    sb.auth.getUser().then(({ data: { user } }: UserResponse) => setUser(user));
    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (_e: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function signOut() {
    setDropdownOpen(false);
    await getSupabaseBrowser().auth.signOut();
  }

  const avatarColor = (user?.user_metadata?.avatar_color as string | undefined) ?? "#05b9b6";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? "";
  const initial = (displayName || user?.email || "?")[0].toUpperCase();
  const nameLabel = displayName || user?.email?.split("@")[0] || "";

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[var(--dark-border)] bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Terminal
            className="w-5 h-5 text-[var(--neon-cyan)] group-hover:animate-pulse-glow"
            strokeWidth={2}
          />
          <span className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-widest text-[var(--neon-cyan)] glow-cyan">
            CODE<span className="text-foreground">ESCAPE</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/#how-it-works" className="hover:text-[var(--neon-cyan)] transition-colors">
            How It Works
          </Link>
          {mounted && user && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Leaderboard
            </Link>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {mounted && user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Avatar button */}
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-orbitron)] font-black text-sm text-black transition-transform hover:scale-105 focus:outline-none"
                style={{
                  background: avatarColor,
                  boxShadow: `0 0 14px ${avatarColor}66`,
                }}
                aria-label="Account menu"
              >
                {initial}
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] shadow-2xl z-50 overflow-hidden animate-slide-up">
                  <div className="px-4 py-3 border-b border-[var(--dark-border)]">
                    <p className="text-sm font-semibold text-foreground truncate">{nameLabel}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <User2 className="w-4 h-4" />
                      My Profile
                    </Link>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            mounted && (
              <Link
                href="/register"
                className="px-4 py-1.5 rounded border border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 transition-all box-glow-cyan text-xs font-semibold tracking-wider"
              >
                START GAME
              </Link>
            )
          )}
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
          {user ? (
            <>
              {/* Mobile user chip */}
              <div className="flex items-center gap-2 py-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
                  style={{ background: avatarColor }}
                >
                  {initial}
                </div>
                <span className="text-xs text-muted-foreground truncate">{nameLabel || user.email}</span>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 hover:text-[var(--neon-cyan)]"
              >
                <BarChart2 className="w-4 h-4" />
                Leaderboard
              </Link>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 hover:text-[var(--neon-cyan)]"
              >
                <User2 className="w-4 h-4" />
                My Profile
              </Link>
              <button
                onClick={() => { void signOut(); setOpen(false); }}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="text-[var(--neon-cyan)] font-semibold tracking-wider"
            >
              START GAME →
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
