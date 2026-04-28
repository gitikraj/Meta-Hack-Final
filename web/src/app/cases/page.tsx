"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Case {
  case_id: string;
  goal: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  tags: string[];
}

const DIFF_COLOR = { easy: "var(--green)", medium: "var(--orange)", hard: "var(--red)" };
const CAT_ICON: Record<string, string> = {
  network: "🌐", appsec: "🔒", malware: "🦠", cloud: "☁️", incident: "🚨",
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ difficulty: "all", category: "all" });

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(() => fetch(`${API}/api/leaderboard`))
      .catch(() => {});

    // Load scenarios from backend pool endpoint
    fetch(`${API}/api/pool`)
      .then(r => r.json())
      .then(data => { setCases(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(async () => {
        // Fallback: read directly via Python endpoint
        try {
          const r = await fetch(`${API}/api/cases`);
          const data = await r.json();
          setCases(Array.isArray(data) ? data : []);
        } catch { /* ignore */ }
        setLoading(false);
      });
  }, []);

  const DIFFICULTIES = ["all", "easy", "medium", "hard"];
  const CATEGORIES = ["all", ...Array.from(new Set(cases.map(c => c.category)))];

  const filtered = cases.filter(c =>
    (filter.difficulty === "all" || c.difficulty === filter.difficulty) &&
    (filter.category === "all" || c.category === filter.category)
  );

  function runCase(caseId: string) {
    router.push(`/pipeline?case_id=${caseId}`);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 }}>SCENARIO POOL</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>
            Attack <span style={{ color: "var(--red)" }}>Cases</span>
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            10 synthetic attack scenarios — click any card to run an evaluation
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>DIFFICULTY:</span>
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={`btn ${filter.difficulty === d ? "btn-cyan" : "btn-ghost"}`}
                style={{ fontSize: 10, padding: "5px 10px" }}
                onClick={() => setFilter(f => ({ ...f, difficulty: d }))}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>CATEGORY:</span>
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`btn ${filter.category === c ? "btn-cyan" : "btn-ghost"}`}
                style={{ fontSize: 10, padding: "5px 10px" }}
                onClick={() => setFilter(f => ({ ...f, category: c }))}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", fontSize: 11 }}>
            Loading scenarios...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              No scenarios match. The pool endpoint may need to be added to the FastAPI server.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map(c => (
              <div
                key={c.case_id}
                className="panel"
                style={{ padding: 18, cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cyan-dim)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 12px rgba(0,212,255,0.1)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{CAT_ICON[c.category] ?? "🔍"}</span>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600 }}>{c.case_id}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{c.category.toUpperCase()}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: "3px 8px", borderRadius: 3, fontWeight: 700,
                    color: DIFF_COLOR[c.difficulty], border: `1px solid ${DIFF_COLOR[c.difficulty]}`,
                    background: `${DIFF_COLOR[c.difficulty]}15`,
                  }}>
                    {c.difficulty.toUpperCase()}
                  </span>
                </div>

                {/* Goal */}
                <div style={{ fontSize: 11, color: "var(--text-bright)", lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
                  {c.goal}
                </div>

                {/* Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                  {c.tags?.map(tag => (
                    <span key={tag} style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 3,
                      background: "var(--surface2)", color: "var(--text-dim)",
                      border: "1px solid var(--border2)",
                    }}>{tag}</span>
                  ))}
                </div>

                {/* Run button */}
                <button
                  className="btn btn-outline"
                  style={{ width: "100%", justifyContent: "center", fontSize: 10 }}
                  onClick={() => runCase(c.case_id)}
                >
                  ▶ Evaluate this scenario
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Static fallback: hardcoded scenario list for when API isn't available */}
        {!loading && filtered.length === 0 && cases.length === 0 && (
          <div className="panel" style={{ padding: 20, marginTop: 20 }}>
            <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 16 }}>SCENARIO SUMMARY (Static)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ color: "var(--text-dim)", fontSize: 9 }}>
                  {["ID", "Goal", "Difficulty", "Category", "Tags"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["case_101", "VPN login + exfiltration", "hard",   "network",  "vpn, lateral_movement"],
                  ["case_102", "SQL injection → DB dump",  "medium", "appsec",   "sqli, web, database"],
                  ["case_103", "Ransomware attack",         "hard",   "malware",  "ransomware, phishing"],
                  ["case_104", "S3 misconfiguration",       "medium", "cloud",    "aws, s3"],
                  ["case_105", "SSH brute-force",           "easy",   "network",  "ssh, brute_force"],
                  ["case_106", "Insider threat",            "medium", "incident", "insider_threat"],
                  ["case_107", "Supply chain (npm)",        "hard",   "appsec",   "supply_chain, npm"],
                  ["case_108", "DNS tunneling exfil",       "medium", "network",  "dns_tunneling"],
                  ["case_109", "K8s privilege escalation",  "hard",   "cloud",    "kubernetes"],
                  ["case_110", "API abuse / scraping",      "easy",   "appsec",   "api_abuse"],
                ].map(([id, goal, diff, cat, tags]) => (
                  <tr key={id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--cyan)", fontWeight: 600 }}>{id}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-bright)" }}>{goal}</td>
                    <td style={{ padding: "8px 10px", color: DIFF_COLOR[diff as keyof typeof DIFF_COLOR] }}>{diff}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-dim)" }}>{cat}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-dim)", fontSize: 10 }}>{tags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
