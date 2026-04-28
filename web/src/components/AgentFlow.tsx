"use client";

export type AgentStatus = "queued" | "running" | "done" | "failed" | "idle";

export interface AgentStep {
  key: string;
  label: string;
  role: string;
  status: AgentStatus;
  detail?: string;
  timeMs?: number;
}

const DOT_COLOR: Record<AgentStatus, string> = {
  idle:    "var(--text-dim)",
  queued:  "var(--orange)",
  running: "var(--cyan)",
  done:    "var(--green)",
  failed:  "var(--red)",
};

const LABEL_COLOR: Record<AgentStatus, string> = {
  idle:    "var(--text-dim)",
  queued:  "var(--orange)",
  running: "var(--text-bright)",
  done:    "var(--green)",
  failed:  "var(--red)",
};

export function AgentFlow({ steps }: { steps: AgentStep[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((step, idx) => (
        <div key={step.key}>
          <div
            className={`agent-card${step.status === "running" ? " running" : step.status === "done" ? " done" : step.status === "failed" ? " fail" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            {/* Step number */}
            <div style={{
              width: 22, height: 22, borderRadius: 3, flexShrink: 0,
              background: step.status === "done" ? "rgba(0,255,136,0.15)"
                        : step.status === "running" ? "rgba(0,212,255,0.15)"
                        : step.status === "failed" ? "rgba(255,68,68,0.15)"
                        : "var(--surface)",
              border: `1px solid ${DOT_COLOR[step.status]}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: DOT_COLOR[step.status],
            }}>
              {step.status === "done" ? "✓" : step.status === "failed" ? "✗" : idx + 1}
            </div>

            {/* Label + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: LABEL_COLOR[step.status] }}>
                {step.label}
                {step.status === "running" && (
                  <span style={{ color: "var(--cyan)", marginLeft: 8, animation: "blink-cursor 1s infinite" }}>▋</span>
                )}
              </div>
              {step.detail && (
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {step.detail}
                </div>
              )}
            </div>

            {/* Time */}
            {step.timeMs !== undefined && step.status === "done" && (
              <div style={{ fontSize: 9, color: "var(--text-dim)", flexShrink: 0 }}>
                {(step.timeMs / 1000).toFixed(1)}s
              </div>
            )}

            {/* Status dot */}
            <span className={`dot dot-${step.status === "idle" ? "idle" : step.status}`} style={{ flexShrink: 0 }} />
          </div>

          {/* Connector line */}
          {idx < steps.length - 1 && (
            <div style={{
              width: 1, height: 6, marginLeft: 21,
              background: step.status === "done" ? "var(--green-dim)" : "var(--border2)",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
