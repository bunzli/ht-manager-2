import { DumbbellIcon } from "./DumbbellIcon";

export interface DumbbellRowProps {
  fullWeeks: number;
  partialFraction: number;
  totalUnits?: number;
  programLabel?: string;
  compact?: boolean;
  maxVisible?: number;
}

export function DumbbellRow({
  fullWeeks,
  partialFraction,
  totalUnits,
  programLabel,
  compact = false,
  maxVisible = 4,
}: DumbbellRowProps) {
  const hasPartial = partialFraction > 0.001;
  const totalIcons = fullWeeks + (hasPartial ? 1 : 0);
  const displayTotal =
    totalUnits ?? fullWeeks + (hasPartial ? partialFraction : 0);

  if (totalIcons === 0) {
    return (
      <span className="text-xs text-gray-400" title="No training progress since last skill-up">
        —
      </span>
    );
  }

  const visibleFull = compact ? Math.min(fullWeeks, maxVisible) : fullWeeks;
  const hiddenFull = fullWeeks - visibleFull;
  const showPartial = hasPartial && (!compact || visibleFull < maxVisible);
  const hiddenPartial = hasPartial && compact && !showPartial;

  const label = programLabel
    ? `${displayTotal.toFixed(1)} weeks ${programLabel} training since last skill-up`
    : `${displayTotal.toFixed(1)} weeks training since last skill-up`;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-gray-700"
      title={label}
      aria-label={label}
    >
      {Array.from({ length: visibleFull }).map((_, i) => (
        <DumbbellIcon key={`f-${i}`} opacity={1} />
      ))}
      {showPartial && (
        <DumbbellIcon opacity={Math.min(1, Math.max(0.15, partialFraction))} />
      )}
      {compact && (hiddenFull > 0 || hiddenPartial) && (
        <span className="text-xs text-gray-500 ml-0.5">
          +{hiddenFull + (hiddenPartial ? 1 : 0)}
        </span>
      )}
    </span>
  );
}
