import { skillLabel, skillColor } from "../lib/skills";
import type { SkillChange, PlayerChange } from "../lib/types";

interface SkillBarProps {
  label: string;
  level: number;
  maxLevel?: number;
  change?: SkillChange | PlayerChange;
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
  const color = skillColor(level, maxLevel);
  const levelLabel = skillLabel(level);

  if (variant === "hattrick") {
    const previous = change ? Number(change.oldValue) : level;
    const delta = Number.isFinite(previous) ? level - previous : 0;
    const previousPct = Number.isFinite(previous)
      ? Math.max(0, Math.min((previous / maxLevel) * 100, 100))
      : pct;
    const palette =
      maxLevel === 8
        ? level >= 7
          ? { base: "#5B955F", dark: "#346238", light: "#BDD6BF" }
          : level >= 5
            ? { base: "#C3A12D", dark: "#887019", light: "#F0DFA2" }
            : level >= 3
              ? { base: "#CB762E", dark: "#914B15", light: "#F1C8A6" }
              : { base: "#C75050", dark: "#8D2D2D", light: "#EDBABA" }
        : { base: "#5B955F", dark: "#346238", light: "#BDD6BF" };
    const changeLabel = delta
      ? `${delta > 0 ? "+" : ""}${delta} since previous training period (${previous} → ${level})`
      : undefined;
    return (
      <div
        title={changeLabel}
        className="grid grid-cols-[80px_minmax(0,1fr)_24px] items-center gap-2 text-[13px] sm:grid-cols-[88px_minmax(0,1fr)_24px]"
      >
        <span className="text-right text-[#555]">{label}</span>
        <div className="relative h-6 min-w-0 overflow-hidden bg-[#ECECEC]">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${pct}%`, backgroundColor: palette.base }}
          />
          {delta !== 0 && (
            <div
              aria-hidden="true"
              data-change={delta > 0 ? "increase" : "decrease"}
              className="absolute inset-y-0"
              style={{
                left: `${Math.min(pct, previousPct)}%`,
                width: `${Math.abs(pct - previousPct)}%`,
                backgroundColor: delta > 0 ? palette.dark : palette.light,
              }}
            />
          )}
          <span className="absolute inset-0 flex items-center whitespace-nowrap px-1.5 text-[11px] font-medium text-[#426e46]">
            {levelLabel}
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center whitespace-nowrap px-1.5 text-[11px] font-medium text-white"
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          >
            {levelLabel}
          </span>
        </div>
        <span className="text-right font-medium tabular-nums text-[#426e46]">
          {level}
          {changeLabel && <span className="sr-only"> · {changeLabel}</span>}
        </span>
      </div>
    );
  }

  const changeDir =
    change && Number(change.newValue) !== Number(change.oldValue)
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
