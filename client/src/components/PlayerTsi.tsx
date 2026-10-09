import { useRef } from "react";
import { formatNumber } from "../lib/format";
import type { Player } from "../lib/types";
import { useTrainingAnimation } from "../lib/useTrainingAnimation";

type TsiPlayer = Pick<Player, "tsi" | "tsiVariationTraining" | "trainingBaselineAt">;

export function PlayerTsi({ player }: { player: TsiPlayer }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const delta = player.tsiVariationTraining;
  const previous = delta != null && Number.isFinite(delta) ? player.tsi - delta : player.tsi;
  const display = useTrainingAnimation({ current: player.tsi, previous, targetRef });
  const deltaLabel = delta == null ? "(—)" : `(${delta > 0 ? "+" : ""}${formatNumber(delta)})`;

  const animatedDelta = delta == null ? null : display.complete ? delta : display.value - previous;
  const animatedDeltaLabel =
    animatedDelta == null
      ? "(—)"
      : `(${animatedDelta > 0 ? "+" : ""}${formatNumber(animatedDelta)})`;

  return (
    <div
      ref={targetRef}
      className="mt-1 flex flex-wrap items-center gap-2 text-sm italic text-[#777]"
    >
      <span aria-hidden="true" className="tabular-nums">
        TSI: {formatNumber(display.value)}
      </span>
      <span
        aria-hidden="true"
        title={
          player.trainingBaselineAt
            ? `Since previous training period · ${new Date(player.trainingBaselineAt).toLocaleString()}`
            : "No snapshot from the previous training period"
        }
        className={`inline-grid text-xs font-semibold not-italic tabular-nums ${delta == null || delta === 0 ? "text-[#777]" : delta > 0 ? "text-[#426e46]" : "text-[#b43d3d]"}`}
      >
        <span className="invisible col-start-1 row-start-1">{deltaLabel}</span>
        <span className="col-start-1 row-start-1">{animatedDeltaLabel}</span>
      </span>
      <span className="sr-only">
        TSI: {formatNumber(player.tsi)} {deltaLabel} since previous training period
      </span>
    </div>
  );
}
