import { skillLabel, skillColor } from "../lib/skills";
import type { PlayerChange } from "../lib/types";

interface SkillBarProps {
  label: string;
  level: number;
  maxLevel?: number;
  change?: PlayerChange;
  variant?: "graded" | "hattrick";
}

export function SkillBar({
  label,
  level,
  maxLevel = 20,
  change,
  variant = "graded",
}: SkillBarProps) {
  const pct = Math.max(0, Math.min((level / maxLevel) * 100, 100));
  const color = skillColor(level);
  const levelLabel = skillLabel(level);

  if (variant === "hattrick") {
    const delta = change ? Number(change.newValue) - Number(change.oldValue) : 0;
    return (
      <div className="grid grid-cols-[80px_minmax(0,1fr)_24px] items-center gap-2 text-[13px] sm:grid-cols-[88px_minmax(0,1fr)_24px]">
        <span className="text-right text-[#555]">{label}</span>
        <div className="relative h-6 min-w-0 bg-[#ECECEC]">
          <div className="absolute inset-y-0 left-0 bg-[#5B955F]" style={{ width: `${pct}%` }} />
          <span className="relative flex h-full items-center whitespace-nowrap px-1.5 text-[11px] font-medium text-[#1e3520]">
            {levelLabel}
          </span>
        </div>
        <span
          className="text-right tabular-nums text-[#555]"
          title={delta ? `Change: ${delta > 0 ? "+" : ""}${delta}` : undefined}
        >
          {level}
        </span>
      </div>
    );
  }

  const changeDir = change
    ? Number(change.newValue) > Number(change.oldValue)
      ? "up"
      : "down"
    : null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-gray-600 text-right">{label}</span>

      <div className="flex-1 bg-gray-200 rounded-full h-5 relative overflow-hidden">
        {/* Dark label visible over the gray area */}
        <span className="absolute inset-0 flex items-center px-2.5 text-xs text-gray-500 pointer-events-none select-none whitespace-nowrap">
          {levelLabel}
        </span>
        {/* Colored fill – clips the white label to only show over the bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full overflow-hidden ${color}`}
          style={{ width: `${pct}%` }}
        >
          <span
            className="absolute top-0 left-0 h-full flex items-center px-2.5 text-xs text-white pointer-events-none select-none whitespace-nowrap"
            style={{ width: pct > 0 ? `${(100 / pct) * 100}%` : "0" }}
          >
            {levelLabel}
          </span>
        </div>
      </div>

      <span className="w-10 shrink-0 flex items-center gap-1">
        <span className="font-medium tabular-nums">{level}</span>
        {changeDir === "up" && (
          <span className="text-green-600 text-xs font-bold ml-auto">
            +{Number(change!.newValue) - Number(change!.oldValue)}
          </span>
        )}
        {changeDir === "down" && (
          <span className="text-red-500 text-xs font-bold ml-auto">
            {Number(change!.newValue) - Number(change!.oldValue)}
          </span>
        )}
      </span>
    </div>
  );
}
