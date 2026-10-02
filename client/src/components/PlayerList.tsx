import { Fragment, useSyncExternalStore } from "react";
import { PlayerCard } from "./PlayerCard";
import { PlayerDetailPage } from "../pages/PlayerDetailPage";
import { getEffectivePositionId, POSITION_RATINGS } from "../lib/positionRatings";
import type { Player } from "../lib/types";

export type PlayerSortKey =
  | "position"
  | "age"
  | "tsi"
  | "wage"
  | "shirtNumber"
  | "estimatedValue"
  | "rating"
  | "trainingRemaining";

const SORT_OPTIONS: { value: PlayerSortKey; label: string }[] = [
  { value: "position", label: "Position · rating" },
  { value: "age", label: "Age · old to young" },
  { value: "tsi", label: "TSI · high to low" },
  { value: "wage", label: "Wage · high to low" },
  { value: "shirtNumber", label: "Shirt number · low to high" },
  { value: "estimatedValue", label: "Estimated value · high to low" },
  { value: "rating", label: "Rating · high to low" },
  { value: "trainingRemaining", label: "Training remaining · low to high" },
];

interface PlayerListProps {
  players: Player[];
  selectedPlayerId?: number | null;
  onPlayerClick?: (playerId: number) => void;
  onPlayerClose?: () => void;
  sortKey?: PlayerSortKey;
  onSortChange?: (sortKey: PlayerSortKey) => void;
}

function subscribeColumns(onChange: () => void) {
  const queries = [
    window.matchMedia("(min-width: 768px)"),
    window.matchMedia("(min-width: 1280px)"),
  ];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}
function gridColumns() {
  return window.matchMedia("(min-width: 1280px)").matches
    ? 3
    : window.matchMedia("(min-width: 768px)").matches
      ? 2
      : 1;
}

export function PlayerList({
  players,
  selectedPlayerId,
  onPlayerClick,
  onPlayerClose,
  sortKey = "position",
  onSortChange,
}: PlayerListProps) {
  const columns = useSyncExternalStore(subscribeColumns, gridColumns, () => 1);
  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#ccc] bg-white px-6 py-16 text-center">
        <p className="font-semibold text-slate-950">No players found</p>
        <p className="mt-1 text-sm text-slate-500">Refresh the squad to populate your roster.</p>
      </div>
    );
  }

  const positionOrder = new Map(POSITION_RATINGS.map((position, index) => [position.id, index]));
  const effectiveRating = (player: Player) => {
    const positionId = getEffectivePositionId(player);
    return player.positionScores[positionId] ?? 0;
  };
  const remainingTrainingWeeks = (player: Player) =>
    player.trainingEstimatedWeeks == null
      ? null
      : player.trainingEstimatedWeeks - (player.trainingUnits ?? 0);
  const compareDescending = (a: number | null | undefined, b: number | null | undefined) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return b - a;
  };
  const compareAscending = (a: number | null | undefined, b: number | null | undefined) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  };
  const sortedPlayers = [...players].sort((a, b) => {
    let comparison = 0;
    if (sortKey === "position") {
      comparison =
        (positionOrder.get(getEffectivePositionId(a)) ?? 0) -
        (positionOrder.get(getEffectivePositionId(b)) ?? 0);
      if (comparison === 0) comparison = compareDescending(effectiveRating(a), effectiveRating(b));
    } else if (sortKey === "age") {
      comparison = compareDescending(a.age, b.age);
      if (comparison === 0) comparison = compareDescending(a.ageDays, b.ageDays);
    } else if (sortKey === "tsi") comparison = compareDescending(a.tsi, b.tsi);
    else if (sortKey === "wage") comparison = compareDescending(a.salary, b.salary);
    else if (sortKey === "shirtNumber")
      comparison = compareAscending(
        a.playerNumber > 0 ? a.playerNumber : null,
        b.playerNumber > 0 ? b.playerNumber : null,
      );
    else if (sortKey === "estimatedValue")
      comparison = compareDescending(a.estimatedValue, b.estimatedValue);
    else if (sortKey === "rating")
      comparison = compareDescending(effectiveRating(a), effectiveRating(b));
    else if (sortKey === "trainingRemaining")
      comparison = compareAscending(remainingTrainingWeeks(a), remainingTrainingWeeks(b));
    return comparison || a.playerId - b.playerId;
  });
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? SORT_OPTIONS[0].label;

  const selectedIndex = sortedPlayers.findIndex((player) => player.playerId === selectedPlayerId);
  const selectedPlayer = sortedPlayers[selectedIndex];
  const detailAfter = Math.min(
    sortedPlayers.length - 1,
    Math.ceil((selectedIndex + 1) / columns) * columns - 1,
  );
  const positionRank = selectedPlayer
    ? [...players]
        .filter(
          (player) => getEffectivePositionId(player) === getEffectivePositionId(selectedPlayer),
        )
        .sort((a, b) => effectiveRating(b) - effectiveRating(a) || a.playerId - b.playerId)
        .findIndex((player) => player.playerId === selectedPlayer.playerId) + 1
    : undefined;
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#444]">Squad roster</h3>
          <p className="mt-1 text-xs text-[#777]">
            {players.length} players · {activeSortLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#666]" htmlFor="squad-sort">
            Sort by
          </label>
          <select
            id="squad-sort"
            value={sortKey}
            onChange={(event) => onSortChange?.(event.target.value as PlayerSortKey)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#d8d8d8] bg-white px-3 text-xs text-[#444] outline-none focus:border-[#5B955F] focus:ring-2 focus:ring-[#5B955F]/20 sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedPlayers.map((player, index) => {
          const selected = selectedPlayerId === player.playerId;
          return (
            <Fragment key={player.playerId}>
              <div className="min-w-0">
                <PlayerCard
                  player={player}
                  selected={selected}
                  onClick={() => onPlayerClick?.(player.playerId)}
                />
              </div>
              {selectedPlayer && index === detailAfter && (
                <div
                  id={`player-detail-${selectedPlayer.playerId}`}
                  className="col-span-full min-w-0"
                >
                  <PlayerDetailPage
                    playerId={selectedPlayer.playerId}
                    positionRank={positionRank}
                    onClose={() => onPlayerClose?.()}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
