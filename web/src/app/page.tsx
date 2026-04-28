"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScoreLineChart } from "@/components/ScoreLineChart";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stat { label: string; value: string; sub?: string; color?: string; }
interface LeaderEntry { agent_name: string; overall: number | string; verdict: string; runs?: number; }

export default function DashboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [rlStatus, setRlStatus] = useState<Record<string, unknown> | null>(null);
  const [health, setHealth] = useState<"ok" | "error" | "loading">("loading");

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(r => r.ok ? setHealth("ok") : setHealth("error"))
      .catch(() => setHealth("error"));

    fetch(`${API}/api/leaderboard`)
      .then(r => r.json()).then(setLeaderboard).catch(() => {});

    fetch(`${API}/api/rl/status`)
      .then(r => r.json()).then(setRlStatus).catch(() => {});
  }, []);

  const trajectory: number[] = (rlStatus as any)?.score_trajectory ?? [];
  const avgScore = trajectory.length
    ? (trajectory.reduce((a, b) => a + b, 0) / trajectory.length).toFixed(1)
    : "—";

  const stats: Stat[] = [
    { label: "Backend", value: health === "ok" ? "ONLINE" : health === "error" ? "OFFLINE" : "...", color: health === "ok" ? "var(--green)" : "var(--red)" },
    { label: "Scenarios", value: "10", sub: "attack cases" },
    { label: "RL Episodes", value: trajectory.length.toString(), sub: "completed" },
    { label: "Avg Score", value: avgScore.toString(), sub: "last episodes" },
    { label: "Buffer Size", value: ((rlStatus as any)?.buffer_size ?? "—").toString(), sub: "replay entries" },
    { label: "Pass Rate", value: `${(((rlStatus as any)?.pass_rate ?? 0) * 100).toFixed(0)}%`, sub: "verdict pass" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 }}>
            SECURITY OPERATIONS CENTER
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-bright)" }}>
            CyberBench <span style={{ color: "var(--cyan)" }}>Dashboard</span>
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            Multi-agent cybersecurity incident evaluation & RL self-improvement platform
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} className="panel" style={{ padding: "16px 14px" }}>
              <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color ?? "var(--text-bright)" }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Body grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Score trajectory */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em" }}>RL TRAJECTORY</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>Score per episode</div>
              </div>
              <button className="btn btn-outline" style={{ fontSize: 10 }} onClick={() => router.push("/rl")}>
                Train →
              </button>
            </div>
            <ScoreLineChart data={trajectory} width={480} height={140} />
          </div>

          {/* Quick actions */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 16 }}>QUICK ACTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "▶  Run Pipeline Evaluation", path: "/pipeline", color: "btn-cyan" },
                { label: "⚡  Start RL Training",        path: "/rl",       color: "btn-green" },
                { label: "📊  View Leaderboard",         path: "/leaderboard", color: "btn-ghost" },
                { label: "📋  Browse Scenarios",         path: "/cases",    color: "btn-ghost" },
              ].map(a => (
                <button
                  key={a.path}
                  className={`btn ${a.color}`}
                  style={{ justifyContent: "flex-start", fontSize: 11, padding: "10px 14px" }}
                  onClick={() => router.push(a.path)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard preview */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em" }}>TOP AGENTS</div>
            <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => router.push("/leaderboard")}>
              Full leaderboard →
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text-dim)", padding: "20px 0" }}>
              No runs yet — run an evaluation to see rankings.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ color: "var(--text-dim)", fontSize: 9, letterSpacing: "0.08em" }}>
                  {["#", "Agent", "Score", "Verdict", "Runs"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((e, i) => (
                  <tr key={`${e.agent_name}-${i}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--text-dim)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-bright)", fontWeight: 600 }}>{e.agent_name}</td>
                    <td style={{ padding: "8px 10px", color: Number(e.overall) >= 75 ? "var(--green)" : Number(e.overall) >= 45 ? "var(--orange)" : "var(--red)", fontWeight: 700 }}>
                      {Number(e.overall).toFixed(1)}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className={`badge badge-${e.verdict}`}>{e.verdict.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-dim)" }}>{e.runs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rate-limit disclaimer */}
        <div className="panel" style={{ padding: 14, marginTop: 20, borderLeft: "2px solid var(--orange)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 18, lineHeight: 1 }}>⚠</div>
          <div>
            <div style={{ fontSize: 10, color: "var(--orange)", letterSpacing: "0.1em", marginBottom: 4 }}>GROQ RATE LIMIT</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.7 }}>
              If any pipeline run fails, the <span style={{ color: "var(--text-bright)" }}>Groq API daily limit (100k tokens)</span> may be exhausted.
              Update <code style={{ background: "var(--surface2)", padding: "1px 4px", borderRadius: 3 }}>GROQ_API_KEY</code> in <code style={{ background: "var(--surface2)", padding: "1px 4px", borderRadius: 3 }}>.env</code> with a fresh key and restart the backend with{" "}
              <code style={{ background: "var(--surface2)", padding: "1px 4px", borderRadius: 3 }}>python -m uvicorn server.main:app --port 8000</code>.
            </div>
          </div>
        </div>

        {/* Architecture diagram */}
        <div className="panel" style={{ padding: 20, marginTop: 20 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 16 }}>PIPELINE ARCHITECTURE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { label: "Case Selector", color: "var(--cyan-dim)" },
              { label: "Log Analyst", color: "var(--cyan)" },
              { label: "Vuln Scanner", color: "var(--cyan)", parallel: true },
              { label: "Threat Intel", color: "var(--cyan)", parallel: true },
              { label: "Orchestrator", color: "var(--orange)" },
              { label: "Target Agent", color: "var(--green)" },
              { label: "Judge (SBERT)", color: "var(--yellow)" },
              { label: "RL Feedback", color: "var(--red)" },
            ].map((n, i, arr) => (
              <div key={n.label} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  padding: "6px 12px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                  border: `1px solid ${n.color}`, color: n.color,
                  background: `${n.color}15`,
                  position: "relative",
                }}>
                  {n.parallel && <span style={{ fontSize: 8, position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", color: "var(--text-dim)" }}>║</span>}
                  {n.label}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ fontSize: 14, color: "var(--border2)", padding: "0 6px" }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
