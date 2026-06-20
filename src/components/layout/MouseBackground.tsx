"use client";
import { useEffect, useRef } from "react";

export function MouseBackground() {
  const gridRef = useRef<HTMLDivElement>(null);
  const orbCyan = useRef<HTMLDivElement>(null);
  const orbMagenta = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const cursorGlow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    // target (raw mouse, -0.5 → 0.5)
    let tx = 0, ty = 0;
    // current (lerped)
    let cx = 0, cy = 0;
    // raw pixel position for cursor glow
    let px = 0, py = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      px = e.clientX;
      py = e.clientY;

      // cursor glow follows instantly
      if (cursorGlow.current) {
        cursorGlow.current.style.left = `${px}px`;
        cursorGlow.current.style.top = `${py}px`;
        cursorGlow.current.style.opacity = "1";
      }
    };

    const onLeave = () => {
      if (cursorGlow.current) cursorGlow.current.style.opacity = "0";
    };

    const tick = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;

      // Orb parallax — opposite directions for depth
      if (orbCyan.current)
        orbCyan.current.style.transform = `translate(${cx * 120}px, ${cy * 90}px)`;
      if (orbMagenta.current)
        orbMagenta.current.style.transform = `translate(${-cx * 90}px, ${-cy * 120}px)`;

      // Grid warp — perspective tilt + bg-position shift
      if (gridRef.current) {
        gridRef.current.style.backgroundPosition =
          `${50 + cx * 18}% ${50 + cy * 18}%`;
        gridRef.current.style.transform =
          `perspective(900px) rotateX(${cy * -5}deg) rotateY(${cx * 5}deg) scale(1.08)`;
      }

      // Soft lens bloom that trails the mouse
      if (lensRef.current) {
        const lx = (cx + 0.5) * 100;
        const ly = (cy + 0.5) * 100;
        lensRef.current.style.background =
          `radial-gradient(ellipse 55% 45% at ${lx}% ${ly}%, rgba(5,185,182,0.04) 0%, transparent 70%)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grid — oversized so perspective tilt never shows edges */}
      <div
        ref={gridRef}
        className="absolute inset-[-12%] grid-bg"
        style={{ transformOrigin: "center center", willChange: "transform" }}
      />

      {/* Scanlines */}
      <div className="absolute inset-0 scanline" />

      {/* Cyan orb */}
      <div
        ref={orbCyan}
        className="absolute top-1/4 left-1/4 w-[24rem] h-[24rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--neon-cyan) 0%, transparent 70%)",
          opacity: 0.045,
          willChange: "transform",
        }}
      />

      {/* Magenta orb */}
      <div
        ref={orbMagenta}
        className="absolute bottom-1/4 right-1/4 w-[24rem] h-[24rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--neon-magenta) 0%, transparent 70%)",
          opacity: 0.045,
          willChange: "transform",
        }}
      />

      {/* Lerped bloom that softly follows cursor */}
      <div ref={lensRef} className="absolute inset-0" />

      {/* Instant cursor glow */}
      <div
        ref={cursorGlow}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--neon-cyan) 0%, transparent 70%)",
          opacity: 0,
          transition: "opacity 0.3s ease",
          willChange: "transform, left, top",
          transform: "translate(-50%, -50%)",
          position: "fixed",
        }}
      />
    </div>
  );
}
