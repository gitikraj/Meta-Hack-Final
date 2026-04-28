"use client";

import { useApp } from "@/context/AppContext";

export function AgentPipeline() {
  const { pipelineRunning, pipelineStage, pipelineAgents } = useApp();
  if (!pipelineRunning) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="w-[680px] max-w-[90vw] glass-card rounded-2xl p-7 border border-[hsl(var(--primary)/0.2)] shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary-glow))] animate-pulse-glow" />
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] font-code">Multi-Agent Pipeline Running</h3>
        </div>
        <p className="text-[12px] text-[hsl(var(--muted-foreground))] mb-5 font-code">{pipelineStage || "Initializing…"}</p>
        <div className="grid grid-cols-3 gap-3">
          {pipelineAgents.map((a) => (
            <div
              key={a.key}
              className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-xl p-3"
              style={{
                borderColor:
                  a.status === "running" ? "hsl(var(--primary) / 0.4)"
                  : a.status === "done" ? "hsl(var(--success) / 0.3)"
                  : a.status === "failed" ? "hsl(var(--destructive) / 0.4)"
                  : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{a.icon}</span>
                <span className="text-[12px] font-semibold text-[hsl(var(--foreground))] font-code">{a.name}</span>
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-1.5 font-code">{a.role}</div>
              <div
                className="text-[10px] font-medium font-code"
                style={{
                  color:
                    a.status === "running" ? "hsl(var(--primary-glow))"
                    : a.status === "done" ? "hsl(var(--success))"
                    : a.status === "failed" ? "hsl(var(--destructive))"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {a.status === "running" ? "● running" : a.status === "done" ? "✓ done" : a.status === "failed" ? "✗ failed" : "○ queued"}
              </div>
              {a.detail && (
                <div className="text-[9px] text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2 font-code">{a.detail}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
