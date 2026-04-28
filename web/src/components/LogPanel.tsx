"use client";

import { useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { LogRow } from "./LogRow";

export function LogPanel() {
  const { logs } = useApp();
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  return (
    <aside className="flex-1 flex flex-col bg-[hsl(222_47%_3%)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-[hsl(var(--muted-foreground))] font-code uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--destructive))] animate-pulse-glow" />
          SOC Log Stream
        </div>
        <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-code opacity-70">
          {logs.length} events · {logs.filter((l) => l.trigger).length} triggers
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5">
        {logs.map((l) => <LogRow key={l.id} log={l} />)}
        <div ref={logEndRef} />
      </div>
    </aside>
  );
}
