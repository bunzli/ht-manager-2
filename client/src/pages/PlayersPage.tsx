import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayerList, type PlayerSortKey } from "../components/PlayerList";
import { fetchPlayers, refreshPlayers } from "../lib/api";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Link } from "react-router-dom";

export function PlayersPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<PlayerSortKey>("position");

  const { data, isLoading, error } = useQuery({
    queryKey: ["players"],
    queryFn: () => fetchPlayers(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const freshData = await refreshPlayers();
      queryClient.setQueryData(["players"], freshData);
      queryClient.invalidateQueries({ queryKey: ["training", "progress"] });
      queryClient.invalidateQueries({ queryKey: ["player"] });
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  };

  const displayError = refreshError ?? (error instanceof Error ? error.message : null);

  const players = data?.players ?? [];
  const totalTsi = players.reduce((sum, player) => sum + player.tsi, 0);
  const weeklyTsi = players.reduce((sum, player) => sum + (player.tsiVariationWeek ?? 0), 0);
  const totalValue = players.reduce((sum, player) => sum + (player.estimatedValue ?? 0), 0);
  const configuredForecasts = players.filter((player) => player.trainingEstimatedWeeks != null);
  const averageProgress = configuredForecasts.length
    ? configuredForecasts.reduce(
        (sum, player) =>
          sum + Math.min(100, ((player.trainingUnits ?? 0) / player.trainingEstimatedWeeks!) * 100),
        0,
      ) / configuredForecasts.length
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#ddd] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#507653]">My club</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#444]">
              {data?.teamName || "My Squad"}
            </h2>
            {data?.fetchedAt && (
              <p className="mt-1 text-xs text-[#777]">
                Updated {new Date(data.fetchedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/config"
              className="flex min-h-11 items-center justify-center rounded-lg border border-[#ddd] px-3 text-sm font-medium text-[#555] hover:bg-[#f2f2f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B955F]"
            >
              Training config
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
              className="min-h-11 rounded-lg bg-[#5B955F] px-3 text-sm font-medium text-white transition hover:bg-[#4a7c4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B955F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Fetching…" : "Refresh squad"}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#eee] pt-4 sm:grid-cols-4">
          {[
            [
              "Squad TSI",
              totalTsi.toLocaleString("de-DE"),
              weeklyTsi
                ? `${weeklyTsi > 0 ? "+" : ""}${weeklyTsi.toLocaleString("de-DE")} this week`
                : "No weekly baseline",
            ],
            [
              "Estimated value",
              totalValue ? `$${(totalValue * 20).toLocaleString("de-DE")}` : "Unavailable",
              totalValue ? "Current price model" : "Train the price model",
            ],
            [
              "Training",
              averageProgress == null ? "Not configured" : `${averageProgress.toFixed(0)}%`,
              averageProgress == null
                ? "Complete your setup"
                : `${configuredForecasts.length} players tracked`,
            ],
            ["Players", String(players.length), "Current squad"],
          ].map(([label, value, hint]) => (
            <div key={label} className="min-w-0">
              <p className="text-xs text-[#777]">{label}</p>
              <p className="mt-1 break-words text-lg font-semibold tabular-nums text-[#444]">
                {value}
              </p>
              <p className="mt-1 text-[11px] text-[#777]">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {displayError && (
        <div className="mb-6">
          <ErrorAlert title="Failed to load players" message={displayError} />
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading from database..." />
      ) : (
        <PlayerList
          players={data?.players ?? []}
          selectedPlayerId={selectedPlayerId}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onPlayerClick={(id) => setSelectedPlayerId((current) => (current === id ? null : id))}
          onPlayerClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
