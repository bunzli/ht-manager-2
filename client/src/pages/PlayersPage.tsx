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
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const displayError =
    refreshError ?? (error instanceof Error ? error.message : null);

  const players = data?.players ?? [];
  const totalTsi = players.reduce((sum, player) => sum + player.tsi, 0);
  const weeklyTsi = players.reduce((sum, player) => sum + (player.tsiVariationWeek ?? 0), 0);
  const totalValue = players.reduce((sum, player) => sum + (player.estimatedValue ?? 0), 0);
  const configuredForecasts = players.filter((player) => player.trainingEstimatedWeeks != null);
  const averageProgress = configuredForecasts.length
    ? configuredForecasts.reduce((sum, player) => sum + Math.min(100, ((player.trainingUnits ?? 0) / player.trainingEstimatedWeeks!) * 100), 0) / configuredForecasts.length
    : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-5 py-6 text-white shadow-xl shadow-indigo-950/15 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Squad intelligence</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{data?.teamName || "My Squad"}</h2>
            <p className="mt-2 text-sm text-slate-400">A complete view of form, value and development.</p>
            {data?.fetchedAt && <p className="mt-1 text-xs text-slate-500">Updated {new Date(data.fetchedAt).toLocaleString()}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/config" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Training config</Link>
            <button onClick={handleRefresh} disabled={isLoading || refreshing} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{refreshing ? "Fetching…" : "Refresh squad"}</button>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-2 border-t border-white/10 pt-5 sm:grid-cols-4">
          {[
            ["Squad TSI", totalTsi.toLocaleString("de-DE"), weeklyTsi ? `${weeklyTsi > 0 ? "+" : ""}${weeklyTsi.toLocaleString("de-DE")} this week` : "No weekly baseline"],
            ["Estimated value", totalValue ? `$${(totalValue * 20).toLocaleString("de-DE")}` : "Unavailable", totalValue ? "Current price model" : "Train the price model"],
            ["Training", averageProgress == null ? "Not configured" : `${averageProgress.toFixed(0)}%`, averageProgress == null ? "Complete your setup" : `${configuredForecasts.length} players tracked`],
            ["Players", String(players.length), "Sortable roster"],
          ].map(([label, value, hint], index) => <div key={label} className={`py-2 ${index % 2 ? "border-l border-white/10 pl-4" : "pr-4"} sm:border-l sm:border-white/10 sm:px-5 sm:first:border-l-0 sm:first:pl-0`}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1.5 text-lg font-bold tracking-tight text-white sm:text-xl">{value}</p><p className="mt-0.5 text-[11px] text-slate-400">{hint}</p></div>)}
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
          onPlayerClick={(id) => setSelectedPlayerId((current) => current === id ? null : id)}
          onPlayerClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
