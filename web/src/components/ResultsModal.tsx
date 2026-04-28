"use client";

import { ScoreBar } from "./ScoreBar";
import type { PipelineResult } from "@/types";

const ALGO_FIELDS: { key: keyof NonNullable<PipelineResult["scores"]>; label: string }[] = [
  { key: "technique_match", label: "Technique Match" },
  { key: "ioc_match", label: "IOC Match" },
  { key: "action_match", label: "Action Match" },
  { key: "root_cause_match", label: "Root Cause" },
  { key: "blast_radius_match", label: "Blast Radius" },
  { key: "completeness", label: "Completeness" },
];
const QUAL_FIELDS: { key: keyof NonNullable<PipelineResult["scores"]>; label: string }[] = [
  { key: "reasoning_quality", label: "Reasoning Quality" },
  { key: "actionability", label: "Actionability" },
  { key: "technical_depth", label: "Technical Depth" },
];

export function ResultsModal({ result, onClose }: { result: PipelineResult; onClose: () => void }) {
  const s = result.scores;
  const verdictColor =
    result.verdict === "pass"
      ? "hsl(142 71% 45%)"
      : result.verdict === "partial"
        ? "hsl(25 95% 53%)"
        : "hsl(0 84% 60%)";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-[920px] max-w-[95vw] glass-card rounded-2xl p-7 border border-white/10 shadow-2xl shadow-black/60 my-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-code mb-1">
              Pipeline Result
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-[hsl(var(--foreground))] font-code">
                {s?.overall?.toFixed(1) ?? "—"}
                <span className="text-[14px] text-[hsl(var(--muted-foreground))] font-normal">/100</span>
              </div>
              <div
                className="text-[12px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full font-code"
                style={{ color: verdictColor, background: `${verdictColor}15`, border: `1px solid ${verdictColor}40` }}
              >
                {result.verdict || "unknown"}
              </div>
            </div>
          </div>
          <button
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-2xl leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {s && (
          <>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-code mb-2 mt-4">
              Algorithmic (70%) · Total {s.algorithmic_total?.toFixed(1)}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {ALGO_FIELDS.map((f) => <ScoreBar key={f.key} label={f.label} value={Number(s[f.key] ?? 0)} />)}
            </div>

            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-code mb-2 mt-4">
              Qualitative (30%) · Total {s.qualitative_total?.toFixed(1)}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {QUAL_FIELDS.map((f) => <ScoreBar key={f.key} label={f.label} value={Number(s[f.key] ?? 0)} />)}
            </div>
          </>
        )}

        {(result.strengths || result.gaps || result.recommendation) && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Box title="Strengths" body={result.strengths} color="hsl(142 71% 45%)" />
            <Box title="Gaps" body={result.gaps} color="hsl(0 84% 60%)" />
            <Box title="Recommendation" body={result.recommendation} color="hsl(217 91% 60%)" />
          </div>
        )}

        {result.rl_feedback && (
          <div className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-xl p-4 mb-3">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-code mb-2">
              RL Feedback
            </div>
            <div className="grid grid-cols-4 gap-3 text-[12px]">
              <div>
                <div className="text-[hsl(var(--muted-foreground))] text-[10px] font-code">Episode</div>
                <div className="text-[hsl(var(--foreground))] font-semibold font-code">#{result.rl_feedback.episode_id}</div>
              </div>
              <div>
                <div className="text-[hsl(var(--muted-foreground))] text-[10px] font-code">Shaped reward</div>
                <div className="text-[hsl(var(--foreground))] font-semibold font-code">{result.rl_feedback.shaped_reward.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[hsl(var(--muted-foreground))] text-[10px] font-code">Strongest</div>
                <div className="text-[hsl(var(--success))] font-semibold font-code">{result.rl_feedback.strongest_dimension}</div>
              </div>
              <div>
                <div className="text-[hsl(var(--muted-foreground))] text-[10px] font-code">Weakest</div>
                <div className="text-[hsl(var(--destructive))] font-semibold font-code">{result.rl_feedback.weakest_dimension}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn-pill btn-pill-primary h-9 px-5 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Box({ title, body, color }: { title: string; body?: string; color: string }) {
  return (
    <div className="bg-[hsl(var(--surface-elevated))] border rounded-xl p-3" style={{ borderColor: `${color}30` }}>
      <div className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold font-code" style={{ color }}>
        {title}
      </div>
      <div className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-6 font-code">
        {body || "—"}
      </div>
    </div>
  );
}
