import { PlayerCard } from "./PlayerCard";
import { POSITION_RATINGS } from "../lib/positionRatings";
import type { Player } from "../lib/types";

interface PlayerListProps {
  players: Player[];
  onPlayerClick?: (playerId: number) => void;
}

function getBestPositionId(player: Player): string {
  if (player.positionOverride) return player.positionOverride;
  return POSITION_RATINGS.reduce(
    (bestId, pos) =>
      (player.positionScores[pos.id] ?? 0) >
      (player.positionScores[bestId] ?? 0)
        ? pos.id
        : bestId,
    POSITION_RATINGS[0].id,
  );
}

export function PlayerList({ players, onPlayerClick }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <p className="text-gray-500 text-center py-12">No players found.</p>
    );
  }

  // Group players by best position, preserving POSITION_RATINGS order
  const groups = POSITION_RATINGS.map((pos) => ({
    pos,
    players: players
      .filter((p) => getBestPositionId(p) === pos.id)
      .sort(
        (a, b) =>
          (b.positionScores[pos.id] ?? 0) - (a.positionScores[pos.id] ?? 0),
      ),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="space-y-8">
      {groups.map(({ pos, players: groupPlayers }) => (
        <div key={pos.id}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {pos.label}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {groupPlayers.length}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupPlayers.map((p) => (
              <PlayerCard
                key={p.playerId}
                player={p}
                onClick={onPlayerClick ? () => onPlayerClick(p.playerId) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
