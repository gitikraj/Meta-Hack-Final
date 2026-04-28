"use client";

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  label?: string;
}

export function ScoreLineChart({ data, width = 400, height = 120, label = "Score" }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 11 }}>
        No data yet
      </div>
    );
  }

  const pad = { top: 12, right: 12, bottom: 24, left: 36 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const minV = 0;
  const maxV = 100;

  const toX = (i: number) => data.length === 1 ? W / 2 : (i / (data.length - 1)) * W;
  const toY = (v: number) => H - ((v - minV) / (maxV - minV)) * H;

  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H} L0,${H} Z`;

  // Y grid lines
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={0} y1={toY(v)} x2={W} y2={toY(v)}
              stroke="var(--border)" strokeWidth={0.8} strokeDasharray="3,4"
            />
            <text
              x={-6} y={toY(v)}
              textAnchor="end" dominantBaseline="middle"
              style={{ fontSize: 8, fill: "var(--text-dim)", fontFamily: "JetBrains Mono, monospace" }}
            >{v}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(0,212,255,0.06)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3}
            fill={data[i] >= 75 ? "var(--green)" : data[i] >= 45 ? "var(--orange)" : "var(--red)"}
            stroke="var(--bg)" strokeWidth={1.5}
          />
        ))}

        {/* X axis episode labels */}
        {pts.map((p, i) => (
          i % Math.max(1, Math.floor(pts.length / 6)) === 0 && (
            <text
              key={i} x={p.x} y={H + 14}
              textAnchor="middle"
              style={{ fontSize: 8, fill: "var(--text-dim)", fontFamily: "JetBrains Mono, monospace" }}
            >
              {i + 1}
            </text>
          )
        ))}

        {/* X axis label */}
        <text
          x={W / 2} y={H + 22}
          textAnchor="middle"
          style={{ fontSize: 8, fill: "var(--text-dim)", fontFamily: "JetBrains Mono, monospace" }}
        >
          Episode
        </text>
      </g>
    </svg>
  );
}
