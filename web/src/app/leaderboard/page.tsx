"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Entry {
  agent_name: string;
  overall: number | string;
  verdict: string;
  runs?: number;
  difficulty?: string;
  category?: string;
  case_id?: string;
  algorithmic_total?: number | string;
  qualitative_total?: number | string;
  technique_match?: number | string;
  action_match?: number | string;
  completeness?: number | string;
}

const fmt = (v: number | string | undefined): string =>
  v !== undefined && v !== null ? Number(v).toFixed(1) : "—";

const num = (v: number | string): number => Number(v);

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("overall");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`${API}/api/leaderboard?sort_by=${sortBy}&top=50`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sortBy]);

  const filtered = filter === "all"
    ? entries
    : entries.filter(e => e.verdict === filter);

  const overallNum = (e: Entry) => num(e.overall);

  const SORT_OPTS = ["overall", "technique_match", "action_match", "completeness"];
  const FILTERS = ["all", "pass", "partial", "fail"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 }}>AGENT RANKINGS</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>
            Leader<span style={{ color: "var(--cyan)" }}>board</span>
          </h1>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>SORT:</span>
            {SORT_OPTS.map(o => (
              <button
                key={o}
                className={`btn ${sortBy === o ? "btn-cyan" : "btn-ghost"}`}
                style={{ fontSize: 10, padding: "5px 10px" }}
                onClick={() => setSortBy(o)}
              >
                {o.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>FILTER:</span>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? (f === "pass" ? "btn-green" : f === "fail" ? "btn-red" : "btn-cyan") : "btn-ghost"}`}
                style={{ fontSize: 10, padding: "5px 10px" }}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}>
            {filtered.length} entries
          </span>
        </div>

        {/* Table */}
        <div className="panel" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 11 }}>
              Loading leaderboard...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🏆</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No entries yet. Run a pipeline evaluation to appear here.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {["#", "Agent", "Overall", "Verdict", "Algorithmic", "Qualitative", "Technique", "Actions", "Complete", "Runs", "Case"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em", fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={`${e.agent_name}-${i}`}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "10px 14px", color: i === 0 ? "var(--yellow)" : i === 1 ? "var(--text-dim)" : "var(--border2)", fontWeight: 700 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-bright)", fontWeight: 600 }}>{e.agent_name}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: overallNum(e) >= 75 ? "var(--green)" : overallNum(e) >= 45 ? "var(--orange)" : "var(--red)" }}>
                      {fmt(e.overall)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`badge badge-${e.verdict}`}>{e.verdict?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{fmt(e.algorithmic_total)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{fmt(e.qualitative_total)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{fmt(e.technique_match)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{fmt(e.action_match)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{fmt(e.completeness)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)" }}>{e.runs ?? 1}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)", fontSize: 10 }}>{e.case_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
