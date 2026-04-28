import { tagColor } from "@/constants";
import type { LogEntry } from "@/types";

export function LogRow({ log }: { log: LogEntry }) {
  const color = tagColor(log.tag);
  return (
    <div
      className="flex gap-2 items-start px-3.5 py-1.5 mb-px text-[11px] leading-relaxed font-code animate-fadeIn"
      style={{
        borderLeft: `3px solid ${color}`,
        background: log.trigger ? "hsl(48 96% 60% / 0.05)" : "transparent",
      }}
    >
      <span className="text-[hsl(var(--muted-foreground))] opacity-60 min-w-[64px] shrink-0">{log.ts}</span>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider min-w-[124px] shrink-0 text-center"
        style={{ color, borderColor: `${color}40`, background: `${color}15` }}
      >
        {log.tag}
      </span>
      <span
        className="break-words flex-1"
        style={{ color: log.trigger ? "hsl(48 96% 70%)" : "hsl(215 16% 65%)" }}
      >
        {log.message}
      </span>
    </div>
  );
}
