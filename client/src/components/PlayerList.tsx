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

export function PlayerList({
  players,
  selectedPlayerId,
  onPlayerClick,
  onPlayerClose,
  sortKey = "position",
  onSortChange,
}: PlayerListProps) {
  if (players.length === 0) {
    return <div className="rounded-2xl border border-dashed border-indigo-300 bg-white px-6 py-16 text-center"><p className="font-semibold text-slate-950">No players found</p><p className="mt-1 text-sm text-slate-500">Refresh the squad to populate your roster.</p></div>;
  }

  const rankByPlayerId = new Map<number, number>();
  for (const position of POSITION_RATINGS) {
    players
      .filter((player) => getEffectivePositionId(player) === position.id)
      .sort((a, b) => (b.positionScores[position.id] ?? 0) - (a.positionScores[position.id] ?? 0))
      .forEach((player, index) => rankByPlayerId.set(player.playerId, index + 1));
  }
  const positionOrder = new Map(POSITION_RATINGS.map((position, index) => [position.id, index]));
  const effectiveRating = (player: Player) => {
    const positionId = getEffectivePositionId(player);
    return player.positionScores[positionId] ?? 0;
  };
  const remainingTrainingWeeks = (player: Player) => player.trainingEstimatedWeeks == null
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
      comparison = (positionOrder.get(getEffectivePositionId(a)) ?? 0) - (positionOrder.get(getEffectivePositionId(b)) ?? 0);
      if (comparison === 0) comparison = compareDescending(effectiveRating(a), effectiveRating(b));
    } else if (sortKey === "age") {
      comparison = compareDescending(a.age, b.age);
      if (comparison === 0) comparison = compareDescending(a.ageDays, b.ageDays);
    } else if (sortKey === "tsi") comparison = compareDescending(a.tsi, b.tsi);
    else if (sortKey === "wage") comparison = compareDescending(a.salary, b.salary);
    else if (sortKey === "shirtNumber") comparison = compareAscending(a.playerNumber > 0 ? a.playerNumber : null, b.playerNumber > 0 ? b.playerNumber : null);
    else if (sortKey === "estimatedValue") comparison = compareDescending(a.estimatedValue, b.estimatedValue);
    else if (sortKey === "rating") comparison = compareDescending(effectiveRating(a), effectiveRating(b));
    else if (sortKey === "trainingRemaining") comparison = compareAscending(remainingTrainingWeeks(a), remainingTrainingWeeks(b));
    return comparison || a.playerId - b.playerId;
  });
  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? SORT_OPTIONS[0].label;

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm shadow-indigo-950/5">
      <div className="flex flex-col gap-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h3 className="text-base font-bold text-slate-950">Squad roster</h3><p className="mt-0.5 text-xs text-indigo-700/70">Sorted by {activeSortLabel.toLowerCase()} · select a player for full history</p></div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <label className="sr-only" htmlFor="squad-sort">Sort players</label>
          <select id="squad-sort" value={sortKey} onChange={(event) => onSortChange?.(event.target.value as PlayerSortKey)} className="min-h-9 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-950 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">{players.length} players</div>
        </div>
      </div>
      <div className="divide-y divide-indigo-100">
        {sortedPlayers.map((player) => {
          const selected = selectedPlayerId === player.playerId;
          return (
            <div key={player.playerId}>
              <PlayerCard player={player} positionRank={rankByPlayerId.get(player.playerId) ?? 1} selected={selected} onClick={() => onPlayerClick?.(player.playerId)} />
              {selected && <div className="border-t border-indigo-100 bg-indigo-50/30 px-3 pb-4 sm:px-5"><PlayerDetailPage playerId={player.playerId} onClose={() => onPlayerClose?.()} /></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
