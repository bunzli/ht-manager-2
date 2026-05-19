import { PlayerCard } from "./PlayerCard";
import {
  getEffectivePositionId,
  POSITION_RATINGS,
} from "../lib/positionRatings";
import type { Player } from "../lib/types";

/** Alternating on the page's bg-gray-50: white vs slightly darker slate. */
const SECTION_BG = [
  "bg-white border border-gray-200",
  "bg-slate-100 border border-slate-200",
] as const;

interface PlayerListProps {
  players: Player[];
  onPlayerClick?: (playerId: number) => void;
  trainingProgramLabel?: string;
}

export function PlayerList({
  players,
  onPlayerClick,
  trainingProgramLabel,
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <p className="text-gray-500 text-center py-12">No players found.</p>
    );
  }

  // Group players by best position, preserving POSITION_RATINGS order
  const groups = POSITION_RATINGS.map((pos) => ({
    pos,
    players: players
      .filter((p) => getEffectivePositionId(p) === pos.id)
      .sort(
        (a, b) =>
          (b.positionScores[pos.id] ?? 0) - (a.positionScores[pos.id] ?? 0),
      ),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="space-y-3">
      {groups.map(({ pos, players: groupPlayers }, index) => (
        <div
          key={pos.id}
          className={`rounded-xl p-4 ${SECTION_BG[index % 2]}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {pos.label}
            </h3>
            <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
              {groupPlayers.length}
            </span>
            <div className="flex-1 h-px bg-black/10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupPlayers.map((p) => (
              <PlayerCard
                key={p.playerId}
                player={p}
                trainingProgramLabel={trainingProgramLabel}
                onClick={onPlayerClick ? () => onPlayerClick(p.playerId) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
