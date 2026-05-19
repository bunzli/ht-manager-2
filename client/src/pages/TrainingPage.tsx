import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DumbbellRow } from "../components/training/DumbbellRow";
import { TrainingProgramSelect } from "../components/training/TrainingProgramSelect";
import { PlayerAvatarFromJson } from "../components/PlayerAvatar";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { fetchPlayers } from "../lib/api";
import { displayName } from "../lib/playerUtils";
import { lastMatchRoleLabel } from "../lib/matchRoleMapping";
import { useTrainingProgramId, useTrainingProgress } from "../hooks/useTraining";
import type { Player, TrainingProgress } from "../lib/types";

interface TrainingPageProps {
  onPlayerClick: (playerId: number) => void;
}

function progressForPlayer(
  progress: TrainingProgress[],
  playerId: number,
  player: Player,
): TrainingProgress {
  const fromApi = progress.find((p) => p.playerId === playerId);
  if (fromApi) return fromApi;
  return {
    playerId,
    totalUnits: player.trainingUnits ?? 0,
    fullWeeks: player.trainingFullWeeks ?? 0,
    partialFraction: player.trainingPartial ?? 0,
    lastPopAt: player.trainingLastPopAt ?? null,
    lastMatch: {
      date: player.lastMatchDate ?? null,
      positionCode: player.lastMatchPositionCode ?? null,
      playedMinutes: player.lastMatchPlayedMinutes ?? 0,
    },
  };
}

export function TrainingPage({ onPlayerClick }: TrainingPageProps) {
  const { programId, setProgramId, programLabel } = useTrainingProgramId();
  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
  } = useTrainingProgress(programId);
  const {
    data: squadData,
    isLoading: squadLoading,
    error: squadError,
  } = useQuery({
    queryKey: ["players", programId],
    queryFn: () => fetchPlayers(programId),
  });

  const isLoading = progressLoading || squadLoading;
  const error =
    progressError instanceof Error
      ? progressError.message
      : squadError instanceof Error
        ? squadError.message
        : null;

  const players = [...(squadData?.players ?? [])].sort((a, b) => {
    const ua = progressForPlayer(
      progressData?.progress ?? [],
      a.playerId,
      a,
    ).totalUnits;
    const ub = progressForPlayer(
      progressData?.progress ?? [],
      b.playerId,
      b,
    ).totalUnits;
    return ub - ua;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Dumbbells show effective training weeks since the last skill-up for the
            selected program. Full icons = full weeks; faded icon = partial week.
            Based on minutes played and position (half rate where applicable).
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Training program</span>
          <TrainingProgramSelect value={programId} onChange={setProgramId} />
        </label>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
        CHPP only exposes each player&apos;s most recent match. Refresh after league and
        friendly for the best weekly snapshot.
      </p>

      {error && (
        <div className="mb-4">
          <ErrorAlert title="Failed to load training" message={error} />
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading training data..." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Last match</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 hidden sm:table-cell">Since pop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((player) => {
                const prog = progressForPlayer(
                  progressData?.progress ?? [],
                  player.playerId,
                  player,
                );
                return (
                  <tr
                    key={player.playerId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onPlayerClick(player.playerId)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 shrink-0 scale-75 origin-left">
                          <PlayerAvatarFromJson
                            avatarBackground={player.avatarBackground}
                            avatarLayers={player.avatarLayers}
                          />
                        </div>
                        <Link
                          to={`/squad/${player.playerId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {displayName(player)}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lastMatchRoleLabel(prog.lastMatch.positionCode)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {prog.lastMatch.playedMinutes > 0
                        ? `${prog.lastMatch.playedMinutes}′`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DumbbellRow
                        fullWeeks={prog.fullWeeks}
                        partialFraction={prog.partialFraction}
                        totalUnits={prog.totalUnits}
                        programLabel={programLabel}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {prog.lastPopAt
                        ? new Date(prog.lastPopAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {players.length === 0 && (
            <p className="px-4 py-8 text-center text-gray-500">
              No players in squad. Refresh from My Squad first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
