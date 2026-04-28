"use client";

import { type ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { Header } from "./Header";
import { LogPanel } from "./LogPanel";
import { ResultsModal } from "./ResultsModal";
import { AgentPipeline } from "./AgentPipeline";
import { PipelineInspector } from "./PipelineInspector";

export function AppShell({ children }: { children: ReactNode }) {
  const { showResults, pipelineResult, setShowResults, activeRun, setActiveRun } = useApp();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[68%] border-r border-[#ffffff06] overflow-y-auto">
          {children}
        </div>
        <LogPanel />
      </div>
      <AgentPipeline />
      <PipelineInspector run={activeRun} onClose={() => setActiveRun(null)} />
      {showResults && pipelineResult && (
        <ResultsModal result={pipelineResult} onClose={() => setShowResults(false)} />
      )}
    </div>
  );
}
