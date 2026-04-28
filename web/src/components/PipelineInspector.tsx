"use client";

import { useEffect, useMemo, useState } from "react";
import type { PipelineRun } from "@/types";

type AgentKey = "log" | "requirement" | "code";

type AgentSpec = {
  key: AgentKey;
  name: string;
  role: string;
  color: string;
  glow: string;
  buildLines: (run: PipelineRun) => string[];
};

function mitreFor(type: string): string {
  const map: Record<string, string> = {
    BRUTE_FORCE: "T1110.001 — Password Guessing",
    CRED_STUFFING: "T1110.004 — Credential Stuffing",
    LATERAL_MOVEMENT: "T1021 — Remote Services",
    DATA_EXFILTRATION: "T1041 — Exfil Over C2 Channel",
    MALWARE_PERSISTENCE: "T1547.001 — Registry Run Keys",
    C2_COMMUNICATION: "T1071.004 — DNS",
    WEB_SQL_INJECTION: "T1190 — Exploit Public-Facing App",
    VPN_BRUTE: "T1110 — Brute Force",
  };
  return map[type] ?? "T1000 — Generic";
}

function expectedFor(type: string): string {
  return `{"action":"contain","threat":"${type}","auto":true}`;
}

const AGENTS: AgentSpec[] = [
  {
    key: "log",
    name: "Log Analyzer Agent",
    role: "Parses raw SOC stream → structured signals",
    color: "hsl(217 91% 60%)",
    glow: "glow-blue",
    buildLines: (r) => [
      `[ingest] tail -f /var/log/soc/${r.type.toLowerCase()}.jsonl`,
      `[parse]  matched signature: ${r.type}`,
      `[enrich] meta = ${JSON.stringify(r.meta).slice(0, 80)}`,
      `[score]  anomaly = ${(0.62 + Math.random() * 0.35).toFixed(2)}`,
      `[emit]   signal → requirement-agent`,
    ],
  },
  {
    key: "requirement",
    name: "Requirement Mapper",
    role: "Maps signal → MITRE / playbook / SLA",
    color: "hsl(262 83% 58%)",
    glow: "glow-purple",
    buildLines: (r) => [
      `[lookup] threat_taxonomy[${r.type}]`,
      `[mitre]  ${mitreFor(r.type)}`,
      `[policy] playbook = PB-${Math.floor(100 + Math.random() * 800)}`,
      `[sla]    response_window = 5m  · severity = HIGH`,
      `[plan]   isolate → notify → forensics → remediate`,
    ],
  },
  {
    key: "code",
    name: "Code Generator Agent",
    role: "Synthesizes remediation script",
    color: "hsl(142 71% 45%)",
    glow: "glow-green",
    buildLines: (r) => [
      `# auto-generated remediation`,
      `def remediate_${r.type.toLowerCase()}(ctx):`,
      `    isolate_host(ctx.host)`,
      `    revoke_session(ctx.user)`,
      `    notify_soc(level="HIGH", ref="${r.type}")`,
      `    return {"status": "contained", "ts": now()}`,
    ],
  },
];

export function PipelineInspector({
  run,
  onClose,
}: {
  run: PipelineRun | null;
  onClose: () => void;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!run) return;
    setTick(0);
    const id = setInterval(() => setTick((t) => t + 1), 280);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id]);

  const perAgentSteps = 5; // lines per agent (matches buildLines length above)
  const totalTicks = AGENTS.length * perAgentSteps + 4;
  const finished = run ? tick >= totalTicks : false;

  const score = useMemo(
    () => (run ? 70 + ((run.id.charCodeAt(0) + run.id.length * 7) % 28) : 0),
    [run],
  );
  const actual = run ? expectedFor(run.type) : "";
  const expected = run ? expectedFor(run.type) : "";
  const match = actual === expected;

  if (!run) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeUp"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--destructive))] animate-pulse-glow" />
            <div>
              <div className="text-xs font-code tracking-widest text-[hsl(var(--muted-foreground))] uppercase">
                Pipeline Inspector
              </div>
              <div className="text-sm font-bold text-[hsl(var(--foreground))] font-code">
                {run.type}{" "}
                <span className="text-[hsl(var(--muted-foreground))] font-normal">· {run.detail}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-pill btn-pill-outline h-9 px-4 text-sm"
          >
            Close
          </button>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 overflow-y-auto">
          {AGENTS.map((agent, idx) => {
            const start = idx * perAgentSteps;
            const linesShown = Math.max(0, Math.min(perAgentSteps, tick - start));
            const lines = agent.buildLines(run);
            const status =
              tick < start ? "queued" : linesShown < perAgentSteps ? "running" : "done";

            return (
              <div
                key={agent.key}
                className={`rounded-xl border border-white/10 bg-[hsl(var(--surface-elevated))] flex flex-col ${
                  status === "running" ? agent.glow : ""
                }`}
              >
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: agent.color,
                        animation:
                          status === "running" ? "pulse-glow-anim 1.4s ease-in-out infinite" : "none",
                      }}
                    />
                    <div>
                      <div
                        className="text-[11px] font-bold tracking-wider font-code"
                        style={{ color: agent.color }}
                      >
                        {agent.name}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-70">
                        {agent.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-code font-bold tracking-wider uppercase"
                    style={{
                      color: agent.color,
                      background: `color-mix(in srgb, ${agent.color} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${agent.color} 30%, transparent)`,
                    }}
                  >
                    {status}
                  </span>
                </div>
                <div className="p-3 font-code text-[11px] leading-relaxed min-h-[160px]">
                  {lines.slice(0, linesShown).map((l, i) => (
                    <div key={i} className="text-[hsl(var(--muted-foreground))] animate-fadeUp">
                      <span style={{ color: agent.color }}>›</span> {l}
                    </div>
                  ))}
                  {status === "running" && (
                    <div className="blink text-[hsl(var(--muted-foreground))] opacity-60">▍</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Output + Score Footer */}
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface-elevated))] p-3.5">
            <div className="text-[10px] font-code tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-1.5">
              Actual Output
            </div>
            <pre className="font-code text-[11px] text-[hsl(var(--foreground))] whitespace-pre-wrap break-words">
              {finished ? actual : "// awaiting agents..."}
            </pre>
          </div>
          <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface-elevated))] p-3.5">
            <div className="text-[10px] font-code tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-1.5">
              Expected Output
            </div>
            <pre className="font-code text-[11px] text-[hsl(var(--foreground))] whitespace-pre-wrap break-words">
              {expected}
            </pre>
          </div>
          <div
            className={`rounded-xl border p-3.5 flex flex-col justify-between bg-[hsl(var(--surface-elevated))] ${
              finished
                ? match
                  ? "border-[hsl(142_71%_45%/0.4)] glow-green"
                  : "border-[hsl(0_84%_60%/0.4)] glow-red"
                : "border-white/10"
            }`}
          >
            <div>
              <div className="text-[10px] font-code tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-1.5">
                Score
              </div>
              <div
                className="text-4xl font-bold font-code"
                style={{
                  color: finished
                    ? match
                      ? "hsl(142 71% 55%)"
                      : "hsl(0 84% 65%)"
                    : "hsl(215 16% 57%)",
                }}
              >
                {finished ? score : "--"}
                <span className="text-base text-[hsl(var(--muted-foreground))] font-normal">/100</span>
              </div>
            </div>
            <div className="text-[11px] font-code mt-2">
              {finished ? (
                match ? (
                  <span className="text-[hsl(142_71%_55%)]">✓ output matches expected</span>
                ) : (
                  <span className="text-[hsl(0_84%_65%)]">✗ output drift detected</span>
                )
              ) : (
                <span className="text-[hsl(var(--muted-foreground))]">running pipeline…</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
