export function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 75 ? "hsl(142 71% 45%)" : pct >= 45 ? "hsl(25 95% 53%)" : "hsl(0 84% 60%)";
  return (
    <div className="bg-[hsl(var(--surface-elevated))] border border-white/5 rounded-xl p-3">
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-[hsl(var(--muted-foreground))] font-code">{label}</span>
        <span className="font-bold font-code" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
      </div>
    </div>
  );
}
