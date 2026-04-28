"use client";
import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { AgentFlow, type AgentStep } from "@/components/AgentFlow";
import { ScoreRadar } from "@/components/ScoreRadar";
import { ScoreDimBars } from "@/components/ScoreDimBars";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
const AGENT_STEPS_INIT: AgentStep[] = [
  { key: "selector",     label: "Case Selector",   role: "Picks scenario from pool",         status: "idle" },
  { key: "log_analyst",  label: "Log Analyst",      role: "Extracts IOCs & attack timeline",  status: "idle" },
  { key: "vuln_scanner", label: "Vuln Scanner",     role: "Identifies CVEs in assets",        status: "idle" },
  { key: "threat_intel", label: "Threat Intel",     role: "MITRE mapping & IOC reputation",   status: "idle" },
  { key: "orchestrator", label: "Orchestrator",     role: "Synthesizes unified briefing",      status: "idle" },
  { key: "target",       label: "Target Agent",     role: "Generates 8-section response",     status: "idle" },
  { key: "judge",        label: "Judge (SBERT)",    role: "Scores: 70% algo + 30% qual",      status: "idle" },
  { key: "rl",           label: "RL Feedback",      role: "Reward signal + buffer update",    status: "idle" },
];

type RunStatus = "idle" | "running" | "done" | "error";

export default function PipelinePage() {
  const [difficulty, setDifficulty] = useState<string>("all");
  const [agentName, setAgentName] = useState("CyberBench-v1");
  const [steps, setSteps] = useState<AgentStep[]>(AGENT_STEPS_INIT);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<"flow" | "scores" | "response">("flow");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} › ${msg}`]);

  const updateStep = (key: string, patch: Partial<AgentStep>) =>
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));

  const resetSteps = () => setSteps(AGENT_STEPS_INIT.map(s => ({ ...s, status: "idle" as const })));

  // Map backend stage string to step key
  function stageToKey(stage: string): string {
    if (stage.includes("Case")) return "selector";
    if (stage.includes("Log")) return "log_analyst";
    if (stage.includes("Vuln")) return "vuln_scanner";
    if (stage.includes("Threat")) return "threat_intel";
    if (stage.includes("Orchestrator")) return "orchestrator";
    if (stage.includes("Target")) return "target";
    if (stage.includes("Judge")) return "judge";
    if (stage.includes("RL") || stage.includes("Metrics")) return "rl";
    return "";
  }

  async function runPipeline() {
    if (status === "running") return;
    resetSteps();
    setResult(null);
    setLogs([]);
    setStatus("running");
    setActiveTab("flow");
    addLog(`Starting pipeline — agent: ${agentName}, difficulty: ${difficulty}`);

    // POST trigger to backend
    try {
      const body = {
        trigger_type: "MANUAL_EVAL",
        detail: `Manual evaluation — difficulty=${difficulty}`,
        meta: { difficulty, agentName },
        logs: [],
        session_ip: "dashboard",
        agent_name: agentName,
        agent_description: "CyberBench SOC dashboard evaluation agent.",
      };
      const res = await fetch(`${API}/api/pipeline/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { run_id } = await res.json();
      addLog(`Run queued: ${run_id.slice(0, 12)}...`);

      // Mark selector done immediately
      updateStep("selector", { status: "done" });

      // Poll results
      let prevStage = "";
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${API}/api/pipeline/results/${run_id}`);
          const data = await r.json();
          const stage: string = data.stage ?? "";

          if (stage && stage !== prevStage) {
            prevStage = stage;
            addLog(`Stage: ${stage}`);
            const key = stageToKey(stage);
            if (key) {
              // Mark previous steps done, current running
              let found = false;
              setSteps(prev => prev.map(s => {
                if (s.key === key) { found = true; return { ...s, status: "running" }; }
                if (!found) return { ...s, status: s.status === "idle" ? "done" : s.status };
                return s;
              }));
            }
          }

          if (data.status === "completed") {
            clearInterval(pollRef.current!);
            setSteps(prev => prev.map(s => ({ ...s, status: "done" })));

            // Annotate timing
            const times = data.processing_times_ms ?? {};
            setSteps(prev => prev.map(s => ({
              ...s,
              timeMs: times[s.key] ?? times[s.key + "_agent"] ?? undefined,
            })));

            setResult(data);
            setStatus("done");
            setActiveTab("scores");
            addLog(`✓ Complete — Score: ${data.scores?.overall?.toFixed(1)} | Verdict: ${data.verdict?.toUpperCase()}`);
          } else if (data.status === "failed") {
            clearInterval(pollRef.current!);
            setStatus("error");
            addLog("✗ Pipeline failed — check backend logs.");
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch (e) {
      setStatus("error");
      addLog(`✗ Could not reach backend: ${e}`);
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const scores = result?.scores as Record<string, number> | undefined;
  const radarScores = result?.rl_feedback
    ? (result.rl_feedback as Record<string, unknown>).dimension_scores as Record<string, number>
    : {};
  const verdict: string = (result?.verdict as string) ?? "";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 }}>EVALUATION ENGINE</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>Pipeline <span style={{ color: "var(--cyan)" }}>Runner</span></h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
          {/* Left: controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Config panel */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 14 }}>RUN CONFIG</div>

              <label style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginBottom: 6 }}>AGENT NAME</label>
              <input
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                style={{
                  width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)",
                  borderRadius: 4, padding: "7px 10px", fontSize: 11, color: "var(--text-bright)",
                  fontFamily: "inherit", marginBottom: 14, outline: "none",
                }}
              />

              <label style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginBottom: 8 }}>DIFFICULTY</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`btn ${difficulty === d ? "btn-cyan" : "btn-ghost"}`}
                    style={{ flex: 1, padding: "5px 0", fontSize: 10 }}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                className={`btn ${status === "running" ? "btn-ghost" : "btn-cyan"}`}
                style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 12 }}
                onClick={runPipeline}
                disabled={status === "running"}
              >
                {status === "running" ? "⏳ RUNNING..." : "▶  RUN PIPELINE"}
              </button>
            </div>

            {/* Groq rate-limit disclaimer */}
            <div className="panel" style={{ padding: 14, borderLeft: "2px solid var(--orange)" }}>
              <div style={{ fontSize: 9, color: "var(--orange)", letterSpacing: "0.1em", marginBottom: 6 }}>NOTE</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.7 }}>
                If the pipeline fails or hangs, the <span style={{ color: "var(--text-bright)" }}>Groq API rate limit</span> may be exhausted (100k tokens/day free tier).
                Update <code style={{ background: "var(--surface2)", padding: "1px 4px", borderRadius: 3 }}>GROQ_API_KEY</code> in <code style={{ background: "var(--surface2)", padding: "1px 4px", borderRadius: 3 }}>.env</code> and restart the backend.
              </div>
            </div>

            {/* Score summary */}
            {scores && (
              <div className="panel animate-in" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, color: "var(--cyan)", letterSpacing: "0.1em", marginBottom: 14 }}>RESULT</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: scores.overall >= 75 ? "var(--green)" : scores.overall >= 45 ? "var(--orange)" : "var(--red)" }}>
                    {scores.overall?.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>/100</div>
                  <span className={`badge badge-${verdict}`}>{verdict.toUpperCase()}</span>
                </div>
                <div className="score-bar-track" style={{ marginBottom: 16 }}>
                  <div className="score-bar-fill" style={{ width: `${scores.overall}%`, background: scores.overall >= 75 ? "var(--green)" : scores.overall >= 45 ? "var(--orange)" : "var(--red)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 10 }}>
                  {[
                    ["Algorithmic", `${scores.algorithmic_total?.toFixed(1)}`],
                    ["Qualitative", `${scores.qualitative_total?.toFixed(1)}`],
                    ["Case", (result?.case_id as string) ?? "—"],
                    ["Difficulty", (result?.difficulty as string)?.toUpperCase() ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: "var(--text-dim)" }}>{k}</div>
                      <div style={{ color: "var(--text-bright)", fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terminal log */}
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
                CONSOLE LOG
              </div>
              <div ref={logRef} className="terminal" style={{ height: 180, padding: 12, overflowY: "auto" }}>
                {logs.length === 0
                  ? <span style={{ color: "var(--text-dim)" }}>$ awaiting run...</span>
                  : logs.map((l, i) => (
                    <div key={i} style={{ color: l.includes("✓") ? "var(--green)" : l.includes("✗") ? "var(--red)" : "var(--text-dim)" }}>{l}</div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Right: main content */}
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
              {(["flow", "scores", "response"] as const).map(tab => (
                <button
                  key={tab}
                  className={`nav-tab${activeTab === tab ? " active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "flow" ? "Agent Flow" : tab === "scores" ? "Score Breakdown" : "Response"}
                </button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {/* Agent Flow tab */}
              {activeTab === "flow" && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 16 }}>
                    10-stage pipeline — each agent runs in sequence (vuln scanner + threat intel run in parallel)
                  </div>
                  <AgentFlow steps={steps} />

                  {!!result?.agent_confidence && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 10, letterSpacing: "0.08em" }}>AGENT CONFIDENCE</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {Object.entries(result.agent_confidence as Record<string, string>).map(([k, v]) => (
                          <div key={k} className="panel-inner" style={{ padding: "8px 12px", flex: 1 }}>
                            <div style={{ fontSize: 9, color: "var(--text-dim)", marginBottom: 4 }}>{k.replace("_", " ").toUpperCase()}</div>
                            <div style={{ fontSize: 11, color: v === "HIGH" ? "var(--green)" : v === "MEDIUM" ? "var(--orange)" : "var(--red)", fontWeight: 700 }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scores tab */}
              {activeTab === "scores" && scores && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, marginBottom: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 10 }}>RL DIMENSIONS</div>
                      <ScoreRadar scores={Object.keys(radarScores).length ? radarScores : {
                        accuracy: scores.technique_match ?? 0,
                        completeness: scores.completeness ?? 0,
                        actionability: scores.action_match ?? 0,
                        technical_depth: scores.qualitative_total ?? 0,
                        mitre_alignment: scores.technique_match ?? 0,
                        relevance: ((scores.root_cause_match ?? 0) + (scores.blast_radius_match ?? 0)) / 2,
                      }} size={200} />
                    </div>
                    <div>
                      <ScoreDimBars
                        algorithmic={{
                          technique_match: scores.technique_match ?? 0,
                          ioc_match: scores.ioc_match ?? 0,
                          action_match: scores.action_match ?? 0,
                          root_cause_match: scores.root_cause_match ?? 0,
                          blast_radius_match: scores.blast_radius_match ?? 0,
                          completeness: scores.completeness ?? 0,
                        }}
                        qualitative={{
                          reasoning_quality: scores.reasoning_quality ?? 0,
                          actionability: scores.actionability ?? 0,
                          technical_depth: scores.technical_depth ?? 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Strengths / Gaps */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[
                      { label: "STRENGTHS", value: result?.strengths as string, color: "var(--green)" },
                      { label: "GAPS",      value: result?.gaps as string,      color: "var(--red)" },
                    ].map(item => item.value && (
                      <div key={item.label} className="panel-inner" style={{ padding: 14 }}>
                        <div style={{ fontSize: 9, color: item.color, letterSpacing: "0.1em", marginBottom: 8 }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.6 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response tab */}
              {activeTab === "response" && result && (
                <div>
                  <div className="terminal" style={{ height: 500, padding: 16, whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.8, color: "var(--text)", overflowY: "auto" }}>
                    {(result?.target_response as string) ?? "Response not available."}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {activeTab !== "flow" && !result && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 }}>
                  <div style={{ fontSize: 32, opacity: 0.3 }}>⚡</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Run a pipeline evaluation to see results here.</div>
                  <button className="btn btn-cyan" onClick={runPipeline} disabled={status === "running"}>
                    ▶ Run Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
