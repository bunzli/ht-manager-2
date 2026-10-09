import { useRef } from "react";
import { useTrainingAnimation } from "../lib/useTrainingAnimation";
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
    return <HattrickSkillBar label={label} level={level} maxLevel={maxLevel} change={change} />;
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

function HattrickSkillBar({ label, level, maxLevel = 20, change }: Omit<SkillBarProps, "variant">) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pct = Math.max(0, Math.min((level / maxLevel) * 100, 100));
  const baseline = change?.oldValue.trim();
  const parsedPrevious = baseline ? Number(baseline) : NaN;
  const previous = Number.isFinite(parsedPrevious) ? parsedPrevious : level;
  const delta = Number.isFinite(level) ? level - previous : 0;
  const levelLabel = skillLabel(level);
  const fillColor = hattrickFillColor(level, maxLevel);
  const previousFillColor = hattrickFillColor(previous, maxLevel);
  const changeLabel = delta
    ? `${delta > 0 ? "+" : ""}${delta} since previous training period (${previous} → ${level})`
    : undefined;

  const display = useTrainingAnimation({
    current: level,
    previous,
    targetRef: trackRef,
    fillRef,
    labelRef,
    maxLevel,
    fillColor,
    previousFillColor,
  });

  return (
    <div
      title={changeLabel}
      className="grid grid-cols-[80px_minmax(0,1fr)_56px] items-center gap-2 text-[13px] sm:grid-cols-[88px_minmax(0,1fr)_56px]"
    >
      <span className="text-right text-[#555]">{label}</span>
      <div ref={trackRef} className="relative h-6 min-w-0 overflow-hidden bg-[#ECECEC]">
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
        <span className="absolute inset-0 flex items-center whitespace-nowrap px-1.5 text-[11px] font-medium text-[#426e46]">
          {levelLabel}
        </span>
        <span
          ref={labelRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center whitespace-nowrap px-1.5 text-[11px] font-medium text-white"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          {levelLabel}
        </span>
      </div>
      <span className="flex items-center justify-end gap-1 whitespace-nowrap font-medium tabular-nums text-[#426e46]">
        <span aria-hidden="true">{display.value}</span>
        <span className="sr-only">{level}</span>
        {display.complete && delta !== 0 && (
          <span
            aria-hidden="true"
            className={`text-[11px] font-semibold ${delta > 0 ? "text-[#426e46]" : "text-[#b43d3d]"}`}
          >
            {delta > 0 ? "+" : "−"}
            {Math.abs(delta)}
          </span>
        )}
        {changeLabel && <span className="sr-only"> · {changeLabel}</span>}
      </span>
    </div>
  );
}

function hattrickFillColor(level: number, maxLevel: number): string {
  if (maxLevel !== 8 || level >= 7) return "#5B955F";
  if (level >= 5) return "#C3A12D";
  if (level >= 3) return "#CB762E";
  return "#C75050";
}
