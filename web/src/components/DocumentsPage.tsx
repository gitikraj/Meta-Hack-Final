"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";
import type { DocEntry } from "@/types";

export function DocumentsPage() {
  const { docs, handleFileAccess } = useApp();
  const [opened, setOpened] = useState<number[]>([]);
  const sc: Record<string, string> = {
    CONFIDENTIAL: "hsl(25 95% 53%)",
    RESTRICTED: "hsl(0 84% 60%)",
    INTERNAL: "hsl(217 91% 60%)",
    CRITICAL: "hsl(0 73% 51%)",
  };
  const ti: Record<string, string> = { spreadsheet: "📊", csv: "📋", pdf: "📕", json: "📦", doc: "📝", zip: "🗜", env: "🔑" };
  const open = (doc: DocEntry) => { handleFileAccess(doc); setOpened((p) => Array.from(new Set([...p, doc.id]))); };

  return (
    <div className="p-7 md:p-9 animate-fadeUp">
      <BackBtn />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight mb-1">Document Library</h1>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-code">
        // Attack 2 (file access) + Attack 3 (bulk copy → upload when ≥4 files opened in 10s)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {docs.map((doc) => {
          const c = sc[doc.sens] ?? "hsl(215 16% 47%)";
          const isOpen = opened.includes(doc.id);
          return (
            <div
              key={doc.id}
              className="glass-card rounded-xl p-4 transition-colors"
              style={{ borderColor: isOpen ? `${c}40` : undefined }}
            >
              <div className="flex justify-between items-start mb-2.5">
                <span className="text-xl">{ti[doc.type] ?? "📄"}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider font-code"
                  style={{ color: c, borderColor: `${c}40`, background: `${c}15` }}
                >
                  {doc.sens}
                </span>
              </div>
              <div className="text-xs text-[hsl(var(--foreground))] mb-1 font-code break-all">{doc.name}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3 font-code">{doc.size}</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => open(doc)}
                  className="flex-1 py-1.5 [background:var(--gradient-primary)] hover:opacity-90 rounded-md text-white text-[11px] font-semibold transition-opacity"
                >
                  Open
                </button>
                <button
                  onClick={() => open(doc)}
                  className="flex-1 py-1.5 bg-[hsl(var(--surface-elevated))] border border-white/5 hover:border-white/20 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-[11px] transition-colors"
                >
                  ↓ Download
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.05)] px-4 py-3 text-[11px] text-[hsl(var(--muted-foreground))] font-code">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_70%)] font-bold tracking-wider mr-2">
          ATK-3
        </span>
        Data Theft — open 4+ files rapidly to trigger BULK_COPY → LARGE_UPLOAD
      </div>
    </div>
  );
}
