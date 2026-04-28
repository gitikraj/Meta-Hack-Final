"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function UploadPage() {
  const { handleRunScript } = useApp();
  const scripts = ["invoice_macro.xlsm", "report_update.docm", "system_patch.bat", "helper_svc.exe", "update_tool.ps1"];
  const [ran, setRan] = useState<string[]>([]);
  const run = (name: string) => { handleRunScript(name); setRan((p) => [...p, name]); };
  return (
    <div className="p-7 md:p-9 animate-fadeUp">
      <BackBtn />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight mb-1">Scripts &amp; File Upload</h1>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-code">// Execute workspace scripts and upload documents</p>

      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(142_71%_45%/0.15)] text-[hsl(142_71%_55%)] font-bold tracking-wider font-code">
            ATK-4
          </span>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Malware / Persistence Simulation</span>
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-code">
          Running any script below triggers: PROCESS_SPAWN → SCHED_TASK → REG_WRITE
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {scripts.map((s) => {
          const isRan = ran.includes(s);
          return (
            <div
              key={s}
              className="glass-card flex items-center gap-3 rounded-lg px-4 py-3 transition-colors"
              style={{ borderColor: isRan ? "hsl(0 84% 60% / 0.4)" : undefined }}
            >
              <span className="text-lg">📜</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[hsl(var(--foreground))] font-code break-all">{s}</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Workspace automation script</div>
              </div>
              <button
                onClick={() => run(s)}
                disabled={isRan}
                className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  isRan
                    ? "bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)] text-[hsl(0_84%_70%)]"
                    : "[background:var(--gradient-primary)] text-white shadow-[var(--shadow-primary)] hover:opacity-90"
                }`}
              >
                {isRan ? "Ran" : "Run"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
