"use client";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { path: "/",            label: "Dashboard" },
  { path: "/pipeline",   label: "Pipeline" },
  { path: "/rl",         label: "RL Training" },
  { path: "/leaderboard",label: "Leaderboard" },
  { path: "/cases",      label: "Cases" },
];

export function Navbar() {
  const path = usePathname();
  const router = useRouter();

  return (
    <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 32 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: "linear-gradient(135deg, var(--cyan), var(--green))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#000",
          }}>C</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-bright)", letterSpacing: "0.05em" }}>
            CYBER<span style={{ color: "var(--cyan)" }}>BENCH</span>
          </span>
          <span style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 3,
            background: "rgba(0,212,255,0.1)", color: "var(--cyan)",
            border: "1px solid var(--cyan-dim)", letterSpacing: "0.1em", fontWeight: 600,
          }}>SOC</span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: "flex", gap: 0, flex: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.path}
              className={`nav-tab${path === tab.path ? " active" : ""}`}
              onClick={() => router.push(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text-dim)" }}>
          <span className="dot dot-done" />
          ONLINE
        </div>
      </div>
    </header>
  );
}
