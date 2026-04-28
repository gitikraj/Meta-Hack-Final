"use client";
import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { ScoreLineChart } from "@/components/ScoreLineChart";
import { ScoreRadar } from "@/components/ScoreRadar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DIFFICULTIES = ["all", "easy", "medium", "hard"];

export default function RLPage() {
  const [difficulty, setDifficulty] = useState("all");
  const [episodes, setEpisodes] = useState(10);
  const [status, setStatus] = useState<Record<string, unknown>>({ status: "idle" });
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-80), `${new Date().toLocaleTimeString()} › ${msg}`]);

  async function fetchStatus() {
    try {
      const r = await fetch(`${API}/api/rl/status`);
      const data = await r.json();
      setStatus(data);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 3000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  async function startTraining() {
    addLog(`Starting RL training — ${episodes} episodes, difficulty=${difficulty}`);
    try {
      const r = await fetch(`${API}/api/rl/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, difficulty }),
      });
      const data = await r.json();
      addLog(`Training started: ${data.status}`);
    } catch (e) {
      addLog(`✗ Failed to start: ${e}`);
    }
  }

  async function stopTraining() {
    try {
      await fetch(`${API}/api/rl/stop`, { method: "POST" });
      addLog("Stop requested.");
    } catch { /* ignore */ }
  }

  const isRunning = status.status === "running";
  const trajectory: number[] = (status.score_trajectory as number[]) ?? [];
  const dimAvg: Record<string, number> = (status.dimension_averages as Record<string, number>) ?? {};
  const episode = (status.episode as number) ?? 0;
  const maxEp = (status.max_episodes as number) ?? episodes;
  const currentScore = (status.current_score as number) ?? 0;
  const avgScore = (status.avg_score as number) ?? 0;
  const passRate = (status.pass_rate as number) ?? 0;
  const bufferSize = (status.buffer_size as number) ?? 0;
  const weakest = (status.weakest_dimension as string) ?? "—";

  const improvement = trajectory.length >= 2
    ? trajectory[trajectory.length - 1] - trajectory[0]
    : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 }}>SELF-IMPROVEMENT ENGINE</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>
            RL <span style={{ color: "var(--green)" }}>Training</span>
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            Rejection-sampling RL loop — model learns from judge feedback across episodes
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
          {/* Left controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 14 }}>CONFIG</div>

              <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>EPISODES</label>
              <input
                type="number" min={1} max={50} value={episodes}
                onChange={e => setEpisodes(parseInt(e.target.value) || 10)}
                style={{
                  width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)",
                  borderRadius: 4, padding: "7px 10px", fontSize: 11, color: "var(--text-bright)",
                  fontFamily: "inherit", marginBottom: 14, outline: "none",
                }}
              />

              <label style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginBottom: 8 }}>DIFFICULTY</label>
              <div style={{ display: "flex", gap: 5, marginBottom: 18, flexWrap: "wrap" }}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`btn ${difficulty === d ? "btn-green" : "btn-ghost"}`}
                    style={{ flex: 1, padding: "5px 0", fontSize: 10 }}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn ${isRunning ? "btn-ghost" : "btn-green"}`}
                  style={{ flex: 1, justifyContent: "center", padding: "10px" }}
                  onClick={startTraining}
                  disabled={isRunning}
                >
                  {isRunning ? "⏳ RUNNING" : "▶ START"}
                </button>
                <button
                  className="btn btn-red"
                  style={{ padding: "10px 14px" }}
                  onClick={stopTraining}
                  disabled={!isRunning}
                >
                  ■ STOP
                </button>
              </div>
            </div>

            {/* Live stats */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em" }}>LIVE STATS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`dot dot-${isRunning ? "running" : "idle"}`} />
                  <span style={{ fontSize: 9, color: "var(--text-dim)" }}>{(status.status as string)?.toUpperCase()}</span>
                </div>
              </div>

              {isRunning && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 10 }}>
                    <span style={{ color: "var(--text-dim)" }}>Progress</span>
                    <span style={{ color: "var(--cyan)" }}>{episode}/{maxEp}</span>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${maxEp ? (episode / maxEp) * 100 : 0}%`, background: "var(--cyan)" }} />
                  </div>
                </div>
              )}

              {[
                ["Current Score", `${currentScore.toFixed(1)}`, "var(--text-bright)"],
                ["Avg Score",     `${avgScore.toFixed(1)}`,    "var(--text-bright)"],
                ["Pass Rate",     `${(passRate * 100).toFixed(0)}%`, passRate >= 0.5 ? "var(--green)" : "var(--orange)"],
                ["Buffer Size",   `${bufferSize}`,             "var(--text-bright)"],
                ["Improvement",   `${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)}`, improvement >= 0 ? "var(--green)" : "var(--red)"],
                ["Weakest Dim",   weakest.replace("_", " ").toUpperCase(), "var(--orange)"],
              ].map(([k, v, c]) => (
                <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 10 }}>
                  <span style={{ color: "var(--text-dim)" }}>{k as string}</span>
                  <span style={{ color: c as string, fontWeight: 600 }}>{v as string}</span>
                </div>
              ))}
            </div>

            {/* Console */}
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
                TRAINING LOG
              </div>
              <div ref={logRef} className="terminal" style={{ height: 150, padding: 12, overflowY: "auto" }}>
                {logs.length === 0
                  ? <span style={{ color: "var(--text-dim)" }}>$ awaiting training start...</span>
                  : logs.map((l, i) => <div key={i} style={{ color: l.includes("✗") ? "var(--red)" : "var(--text-dim)" }}>{l}</div>)
                }
              </div>
            </div>
          </div>

          {/* Right: charts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Score trajectory */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: "var(--green)", letterSpacing: "0.1em", marginBottom: 16 }}>
                SCORE TRAJECTORY
                {trajectory.length >= 2 && (
                  <span style={{ color: improvement >= 0 ? "var(--green)" : "var(--red)", marginLeft: 12 }}>
                    {improvement >= 0 ? "▲" : "▼"} {Math.abs(improvement).toFixed(1)} pts overall
                  </span>
                )}
              </div>
              <ScoreLineChart data={trajectory} width={680} height={180} />
            </div>

            {/* Dimension breakdown + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
              {/* Dimension avg bars */}
              <div className="panel" style={{ padding: 20 }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 16 }}>
                  DIMENSION AVERAGES (all episodes)
                </div>
                {Object.keys(dimAvg).length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No data yet.</div>
                ) : (
                  Object.entries(dimAvg).map(([dim, val]) => (
                    <div key={dim} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase" }}>{dim.replace("_", " ")}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: val >= 75 ? "var(--green)" : val >= 45 ? "var(--orange)" : "var(--red)" }}>
                          {val.toFixed(1)}
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{
                          width: `${val}%`,
                          background: val >= 75 ? "var(--green)" : val >= 45 ? "var(--orange)" : "var(--red)",
                        }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Radar */}
              <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 16 }}>DIMENSION RADAR</div>
                <ScoreRadar scores={dimAvg} size={210} />
              </div>
            </div>

            {/* How it works */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 12 }}>HOW RL WORKS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, fontSize: 10 }}>
                {[
                  { step: "1", title: "Pick Case",    desc: "Random scenario from pool" },
                  { step: "2", title: "Get Briefing", desc: "Groq agents analyze logs, vulns, threats" },
                  { step: "3", title: "Generate",     desc: "Target agent writes 8-section response" },
                  { step: "4", title: "Score + Learn",desc: "Judge scores → reward shapes next prompt" },
                ].map(s => (
                  <div key={s.step} className="panel-inner" style={{ padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)", marginBottom: 6 }}>{s.step}</div>
                    <div style={{ fontWeight: 600, color: "var(--text-bright)", marginBottom: 4 }}>{s.title}</div>
                    <div style={{ color: "var(--text-dim)", lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
