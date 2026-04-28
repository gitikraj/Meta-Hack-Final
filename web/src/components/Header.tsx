"use client";

import { useApp } from "@/context/AppContext";

export function Header() {
  const { user, pipelineRunning, pipelineAgents, signOut } = useApp();
  const runningAgent = pipelineAgents.find((a) => a.status === "running");
  const doneCount = pipelineAgents.filter((a) => a.status === "done").length;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[hsl(var(--surface-glass))] backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-lg [background:var(--gradient-primary)] glow-blue flex items-center justify-center text-white font-bold text-base">
          ◈
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-wider text-[hsl(var(--foreground))] font-code">
            CyberBench
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary-glow))] tracking-wider font-code border border-[hsl(var(--primary)/0.2)]">
            ENTERPRISE
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          {pipelineRunning && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary-glow))] animate-pulse-glow" />
              <span className="text-[10px] text-[hsl(var(--primary-glow))] font-code">
                {runningAgent ? runningAgent.name : "Initializing…"}{" "}
                <span className="opacity-60">({doneCount}/{pipelineAgents.length})</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] font-code">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse-glow" />
            {user}
          </div>
          <button
            onClick={signOut}
            className="text-[11px] px-3 py-1.5 bg-transparent border border-white/10 hover:border-white/20 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-md transition-colors font-code"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
