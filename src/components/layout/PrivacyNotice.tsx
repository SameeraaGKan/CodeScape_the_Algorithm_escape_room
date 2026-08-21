"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "ce_privacy_ack";

export function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Privacy notice"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:max-w-sm z-[60] rounded-lg border border-dark-border bg-dark-card/95 backdrop-blur-md shadow-2xl p-4 animate-slide-up"
    >
      <div className="flex gap-3">
        <ShieldCheck className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p>
            We use a cookie to anonymously count page visits and store your
            gameplay data to run the game and show your progress. See our{" "}
            <Link href="/privacy" className="text-neon-cyan hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={dismiss}
          className="px-4 py-1.5 rounded border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-all text-xs font-semibold tracking-wider"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
