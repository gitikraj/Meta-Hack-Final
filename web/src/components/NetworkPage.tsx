"use client";

import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function NetworkPage() {
  const { handleC2Beacon, handleLateralMove, lateralStep } = useApp();
  return (
    <div className="p-7 md:p-9 animate-fadeUp">
      <BackBtn />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight mb-1">Network &amp; Servers</h1>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-code">// Internal server access and external connectivity</p>

      {/* ATK-2 Lateral Movement */}
      <div className="glass-card rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(25_95%_53%/0.15)] text-[hsl(25_95%_60%)] font-bold tracking-wider font-code">
            ATK-2
          </span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Internal Breach — Lateral Movement</span>
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-3 font-code">
          Pivots service account across internal hosts with LDAP enumeration. Triggers pipeline after 3 hops.
        </p>
        <div className="flex gap-2 flex-wrap mb-4">
          {["DC01", "WEB02", "APP03", "DB04", "FILE05"].map((h, i) => {
            const reached = i < lateralStep;
            return (
              <div
                key={h}
                className="px-3 py-2 rounded-lg border text-[11px] font-code text-center leading-tight transition-all"
                style={{
                  background: reached ? "hsl(142 71% 45% / 0.1)" : "hsl(var(--surface-elevated))",
                  borderColor: reached ? "hsl(142 71% 45% / 0.4)" : "hsl(215 20% 60% / 0.1)",
                  color: reached ? "hsl(142 71% 55%)" : "hsl(215 16% 50%)",
                }}
              >
                <div className="font-bold">{h}</div>
                <div className="text-[9px] opacity-70">{reached ? "compromised" : "idle"}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleLateralMove}
          className="btn-pill btn-pill-primary w-full h-10 text-sm"
        >
          Access Internal Server [{lateralStep} hops]
        </button>
      </div>

      {/* ATK-5 C2 */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_70%)] font-bold tracking-wider font-code">
            ATK-5
          </span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">C2 Communication — DNS Beacon + Outbound</span>
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-3 font-code">
          Initiates a DNS beacon to a threat-actor domain followed by encrypted outbound traffic. Each click simulates one beacon cycle.
        </p>
        <button
          onClick={handleC2Beacon}
          className="btn-pill btn-pill-danger w-full h-10 text-sm"
        >
          Connect to External Server
        </button>
      </div>
    </div>
  );
}
