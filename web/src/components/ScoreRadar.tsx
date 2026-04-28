"use client";

interface RadarProps {
  scores: Record<string, number>; // 0–100 per dimension
  size?: number;
}

const DIMS = [
  { key: "accuracy",       label: "ACCURACY" },
  { key: "completeness",   label: "COMPLETENESS" },
  { key: "actionability",  label: "ACTIONABILITY" },
  { key: "technical_depth",label: "TECH DEPTH" },
  { key: "mitre_alignment",label: "MITRE" },
  { key: "relevance",      label: "RELEVANCE" },
];

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ScoreRadar({ scores, size = 220 }: RadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const n = DIMS.length;
  const step = 360 / n;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axes
  const axes = DIMS.map((_, i) => {
    const pt = polarToXY(i * step, maxR, cx, cy);
    return { x2: pt.x, y2: pt.y };
  });

  // Data polygon
  const pts = DIMS.map((d, i) => {
    const val = Math.min(100, Math.max(0, scores[d.key] ?? 0)) / 100;
    return polarToXY(i * step, val * maxR, cx, cy);
  });
  const poly = pts.map(p => `${p.x},${p.y}`).join(" ");

  // Label positions (slightly outside maxR)
  const labels = DIMS.map((d, i) => {
    const pt = polarToXY(i * step, maxR + 22, cx, cy);
    return { ...pt, label: d.label, value: scores[d.key] ?? 0 };
  });

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* Grid rings */}
      {rings.map(r => {
        const ringPts = DIMS.map((_, i) => polarToXY(i * step, r * maxR, cx, cy));
        const ringPoly = ringPts.map(p => `${p.x},${p.y}`).join(" ");
        return (
          <polygon
            key={r}
            points={ringPoly}
            fill="none"
            stroke="var(--border2)"
            strokeWidth={0.8}
            opacity={0.6}
          />
        );
      })}

      {/* Axes */}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x2} y2={a.y2}
          stroke="var(--border2)" strokeWidth={0.8} opacity={0.5} />
      ))}

      {/* Data fill */}
      <polygon
        points={poly}
        fill="rgba(0,212,255,0.12)"
        stroke="var(--cyan)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill="var(--cyan)" stroke="var(--bg)" strokeWidth={1.5} />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <g key={i}>
          <text
            x={l.x} y={l.y - 4}
            textAnchor="middle" dominantBaseline="middle"
            className="radar-label"
            style={{ fontSize: 8, fill: "var(--text-dim)", fontFamily: "JetBrains Mono, monospace" }}
          >
            {l.label}
          </text>
          <text
            x={l.x} y={l.y + 8}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 9, fill: "var(--cyan)", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}
          >
            {l.value.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  );
}
