import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayerList } from "../components/PlayerList";
import { fetchPlayers, refreshPlayers } from "../lib/api";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";

interface PlayersPageProps {
  onPlayerClick: (playerId: number) => void;
}

export function PlayersPage({ onPlayerClick }: PlayersPageProps) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const freshData = await refreshPlayers();
      queryClient.setQueryData(["players"], freshData);
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {data?.teamName || "My Squad"}
          </h2>
          {data?.fetchedAt && (
            <p className="text-sm text-gray-500 mt-0.5">
              Last fetched: {new Date(data.fetchedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors self-start sm:self-auto"
        >
          {refreshing ? "Fetching from Hattrick..." : "Refresh"}
        </button>
      </div>

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
          onPlayerClick={onPlayerClick}
        />
      )}
    </div>
  );
}
