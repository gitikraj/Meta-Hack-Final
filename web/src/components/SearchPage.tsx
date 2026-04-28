"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function SearchPage() {
  const { handleSearch } = useApp();
  const [q, setQ] = useState("");
  const sqli = ["' OR 1=1 --", "UNION SELECT username,password FROM users", "'; DROP TABLE sessions--", "1; EXEC xp_cmdshell('whoami')"];
  return (
    <div className="p-7 md:p-9 animate-fadeUp">
      <BackBtn />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight mb-1">Workspace Search</h1>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-code">// Query documents, users and data</p>

      <div className="flex gap-2.5 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(q)}
          placeholder="Search..."
          className="flex-1 bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-lg px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none font-code placeholder:text-[hsl(var(--muted-foreground))]"
        />
        <button
          onClick={() => handleSearch(q)}
          className="btn-pill btn-pill-primary h-10 px-5 text-sm"
        >
          Search
        </button>
      </div>

      <div className="glass-card rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_70%)] font-bold tracking-wider font-code">
            ATK-6
          </span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Web Attack Simulation</span>
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-3 font-code">
          Paste a payload below then hit Search, or click a preset:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sqli.map((s) => (
            <button
              key={s}
              onClick={() => setQ(s)}
              className="px-2.5 py-1 bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-full text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary-glow)/0.4)] font-code transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
