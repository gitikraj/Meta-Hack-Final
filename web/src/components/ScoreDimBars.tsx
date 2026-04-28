"use client";

interface DimBarsProps {
  algorithmic: Record<string, number>;
  qualitative: Record<string, number>;
}

const ALGO_DIMS = [
  { key: "technique_match",   label: "MITRE Technique",  weight: "25%" },
  { key: "ioc_match",         label: "IOC Match",         weight: "20%" },
  { key: "action_match",      label: "Action Match",      weight: "20%" },
  { key: "root_cause_match",  label: "Root Cause",        weight: "15%" },
  { key: "blast_radius_match",label: "Blast Radius",      weight: "10%" },
  { key: "completeness",      label: "Completeness",      weight: "10%" },
];

const QUAL_DIMS = [
  { key: "reasoning_quality", label: "Reasoning Quality" },
  { key: "actionability",     label: "Actionability" },
  { key: "technical_depth",   label: "Technical Depth" },
];

function DimBar({ label, value, weight, color }: { label: string; value: number; weight?: string; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          {label}
          {weight && <span style={{ color: "var(--border2)", marginLeft: 4 }}>({weight})</span>}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value.toFixed(1)}</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${value}%`,
            background: value >= 75 ? "var(--green)" : value >= 45 ? "var(--orange)" : "var(--red)",
          }}
        />
      </div>
    </div>
  );
}

export function ScoreDimBars({ algorithmic, qualitative }: DimBarsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Algorithmic */}
      <div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 12, letterSpacing: "0.08em" }}>
          ALGORITHMIC <span style={{ color: "var(--cyan)" }}>70%</span>
        </div>
        {ALGO_DIMS.map(d => (
          <DimBar
            key={d.key}
            label={d.label}
            value={algorithmic[d.key] ?? 0}
            weight={d.weight}
            color={algorithmic[d.key] >= 75 ? "var(--green)" : algorithmic[d.key] >= 45 ? "var(--orange)" : "var(--text)"}
          />
        ))}
      </div>

      {/* Qualitative */}
      <div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 12, letterSpacing: "0.08em" }}>
          QUALITATIVE <span style={{ color: "var(--orange)" }}>30%</span>
        </div>
        {QUAL_DIMS.map(d => (
          <DimBar
            key={d.key}
            label={d.label}
            value={qualitative[d.key] ?? 0}
            color={qualitative[d.key] >= 75 ? "var(--green)" : qualitative[d.key] >= 45 ? "var(--orange)" : "var(--text)"}
          />
        ))}
      </div>
    </div>
  );
}
