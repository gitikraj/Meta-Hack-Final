"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Upload, Globe } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { API_BASE } from "@/constants";
import type { RLStatus } from "@/types";

const TILES = [
  {
    key: "search",
    icon: <Search className="h-5 w-5" />,
    label: "Search",
    sub: "Query workspace data",
    color: "hsl(262 83% 58%)",
  },
  {
    key: "documents",
    icon: <FileText className="h-5 w-5" />,
    label: "Documents",
    sub: "8 files · sensitive data",
    color: "hsl(217 91% 60%)",
  },
  {
    key: "upload",
    icon: <Upload className="h-5 w-5" />,
    label: "Scripts & Upload",
    sub: "Execute & upload files",
    color: "hsl(142 71% 45%)",
  },
  {
    key: "network",
    icon: <Globe className="h-5 w-5" />,
    label: "Network",
    sub: "Internal servers & C2",
    color: "hsl(25 95% 53%)",
  },
];

const STATS: [string, string][] = [
  ["47", "Active Users"],
  ["1,204", "Documents"],
  ["98.2%", "Uptime"],
  ["3", "Active Alerts"],
];

export function DashboardPage() {
  const { user, navigate } = useApp();
  const [rlStatus, setRlStatus] = useState<RLStatus | null>(null);
  const [rlLoading, setRlLoading] = useState(false);
  const rlPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRlStatus = useCallback(() => {
    if (rlPollRef.current) clearInterval(rlPollRef.current);
    rlPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/rl/status`);
        const data: RLStatus = await r.json();
        setRlStatus(data);
        if (data.status !== "running") {
          if (rlPollRef.current) clearInterval(rlPollRef.current);
          setRlLoading(false);
        }
      } catch { /* retry */ }
    }, 2000);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/rl/status`).then(r => r.json()).then(setRlStatus).catch(() => {});
    return () => { if (rlPollRef.current) clearInterval(rlPollRef.current); };
  }, []);

  const startRlTraining = async (episodes: number) => {
    setRlLoading(true);
    try {
      await fetch(`${API_BASE}/api/rl/train`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, difficulty: "all", early_stop: 95.0 }),
      });
      pollRlStatus();
    } catch { setRlLoading(false); }
  };

  const stopRl = async () => {
    try { await fetch(`${API_BASE}/api/rl/stop`, { method: "POST" }); } catch {}
  };

  const traj = rlStatus?.score_trajectory ?? [];
  const dimAvgs = rlStatus?.dimension_averages ?? {};

  return (
    <div className="p-7 md:p-9 animate-fadeUp">
      {/* Welcome */}
      <div className="mb-6">
        <p className="text-xs text-[hsl(var(--muted-foreground))] font-code mb-1">Good morning,</p>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">{user}</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-code">
          // CyberBench Enterprise Dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {STATS.map(([v, l]) => (
          <div key={l} className="glass-card rounded-xl px-4 py-3.5">
            <div className="text-xl font-bold text-[hsl(var(--foreground))] font-code">{v}</div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 uppercase tracking-wider font-code">
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
        {TILES.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(t.key)}
            className="glass-card rounded-xl p-5 text-left hover:-translate-y-0.5 transition-all"
            style={{ borderColor: `${t.color}20` }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{
                background: `${t.color}15`,
                color: t.color,
                boxShadow: `0 0 20px ${t.color}25`,
              }}
            >
              {t.icon}
            </div>
            <div className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">{t.label}</div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-code">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* RL Self-Improvement Panel */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] tracking-widest uppercase font-code mb-0.5">
              RL Self-Improvement
            </div>
            <div className="text-[15px] text-[hsl(var(--foreground))] font-semibold">
              Train the agent on past incidents
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-pill btn-pill-primary h-9 px-4 text-[11px] disabled:opacity-40"
              disabled={rlLoading || rlStatus?.status === "running"}
              onClick={() => startRlTraining(5)}
            >
              Train 5 ep
            </button>
            <button
              className="btn-pill btn-pill-purple h-9 px-4 text-[11px] disabled:opacity-40"
              disabled={rlLoading || rlStatus?.status === "running"}
              onClick={() => startRlTraining(10)}
            >
              Train 10 ep
            </button>
            <button
              className="btn-pill btn-pill-danger h-9 px-4 text-[11px] disabled:opacity-40"
              disabled={rlStatus?.status !== "running"}
              onClick={stopRl}
            >
              Stop
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {(
            [
              ["Status", rlStatus?.status ?? "idle"],
              ["Episodes", `${rlStatus?.episode ?? 0}/${rlStatus?.max_episodes ?? 0}`],
              ["Avg Score", (rlStatus?.avg_score ?? 0).toFixed(1)],
              ["Pass Rate", `${Math.round((rlStatus?.pass_rate ?? 0) * 100)}%`],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-lg p-3">
              <div className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-code mb-1">
                {label}
              </div>
              <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] font-code">{value}</div>
            </div>
          ))}
        </div>

        {traj.length > 0 && (
          <div className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-xl p-3 mb-3">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-code mb-2 uppercase tracking-wider">
              Score Trajectory
            </div>
            <div className="flex items-end gap-0.5 h-20">
              {traj.slice(-30).map((s, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${Math.max(3, s)}%`,
                    background: `hsl(var(--primary) / ${0.4 + (s / 100) * 0.5})`,
                  }}
                  title={`${s}`}
                />
              ))}
            </div>
          </div>
        )}

        {Object.keys(dimAvgs).length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(dimAvgs).map(([k, v]) => (
              <div
                key={k}
                className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-lg p-2 text-center"
              >
                <div className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-code">{k}</div>
                <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] font-code">
                  {Number(v).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
