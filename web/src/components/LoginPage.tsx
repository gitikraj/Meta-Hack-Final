"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";

export function LoginPage() {
  const { handleLogin, loginAttempts, handleCredStuffing, credIdx, handleVPN } = useApp();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [shake, setShake] = useState(false);
  const prev = useRef(loginAttempts);

  useEffect(() => {
    if (loginAttempts > prev.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      prev.current = loginAttempts;
      return () => clearTimeout(t);
    }
    prev.current = loginAttempts;
  }, [loginAttempts]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div
        className={`glass-card w-full max-w-md rounded-2xl p-9 ${shake ? "animate-shake" : "animate-fadeUp"}`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <span className="h-12 w-12 rounded-xl [background:var(--gradient-primary)] glow-blue flex items-center justify-center text-white font-bold text-xl">
            ◈
          </span>
        </div>
        <h1 className="text-2xl font-bold text-center text-[hsl(var(--foreground))] tracking-tight mb-1">
          CyberBench
        </h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mb-6 font-code">
          Sign in to your workspace
        </p>

        {loginAttempts >= 3 && (
          <div className="rounded-lg px-4 py-2.5 text-[11px] mb-4 border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] font-code">
            ⚠ Multiple failures detected — account may be locked
          </div>
        )}

        <div className="mb-3.5">
          <label className="block text-[11px] text-[hsl(var(--muted-foreground))] mb-1.5 tracking-wide font-code uppercase">
            Username
          </label>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="username"
            className="w-full bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-lg px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none transition-colors font-code placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[11px] text-[hsl(var(--muted-foreground))] mb-1.5 tracking-wide font-code uppercase">
            Password
          </label>
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            placeholder="password"
            onKeyDown={(e) => e.key === "Enter" && handleLogin(u, p)}
            className="w-full bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-lg px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none transition-colors font-code placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>

        <button
          onClick={() => handleLogin(u, p)}
          className="btn-pill btn-pill-primary w-full h-12 text-[15px] mt-1"
        >
          Sign In →
        </button>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center mt-3 font-code opacity-70">
          Hint: admin / admin123 · jsmith / password
        </p>

        <div className="flex items-center gap-2 my-5 text-[10px] text-[hsl(var(--muted-foreground))] tracking-widest font-code uppercase opacity-60">
          <span className="flex-1 divider" />
          Attack Simulation
          <span className="flex-1 divider" />
        </div>

        {/* Credential Stuffing */}
        <div className="mb-3">
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(25_95%_53%/0.15)] text-[hsl(25_95%_60%)] font-bold tracking-wider font-code">
              ATK-1B
            </span>
            <span className="font-semibold text-[hsl(var(--foreground))] opacity-90">Credential Stuffing</span>
            <span className="text-[hsl(var(--muted-foreground))] opacity-60">— cycles breached pairs</span>
          </div>
          <button
            onClick={handleCredStuffing}
            className="w-full px-3.5 py-2 bg-transparent border border-[hsl(0_84%_60%/0.3)] hover:bg-[hsl(0_84%_60%/0.08)] hover:border-[hsl(0_84%_60%/0.5)] rounded-lg text-[11px] text-[hsl(0_84%_70%)] tracking-wide text-left font-code transition-colors"
          >
            Run Cred Pair {credIdx + 1}/5
          </button>
        </div>

        {/* VPN */}
        <div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(25_95%_53%/0.15)] text-[hsl(25_95%_60%)] font-bold tracking-wider font-code">
              ATK-1C
            </span>
            <span className="font-semibold text-[hsl(var(--foreground))] opacity-90">VPN Login Attack</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleVPN(true)}
              className="flex-1 px-3.5 py-2 bg-transparent border border-[hsl(142_71%_45%/0.3)] hover:bg-[hsl(142_71%_45%/0.08)] rounded-lg text-[11px] text-[hsl(142_71%_55%)] font-code transition-colors"
            >
              VPN Login OK
            </button>
            <button
              onClick={() => handleVPN(false)}
              className="flex-1 px-3.5 py-2 bg-transparent border border-[hsl(0_84%_60%/0.3)] hover:bg-[hsl(0_84%_60%/0.08)] rounded-lg text-[11px] text-[hsl(0_84%_70%)] font-code transition-colors"
            >
              VPN Login Fail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
