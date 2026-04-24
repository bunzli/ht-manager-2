import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MarketStudyForm } from "../components/MarketStudyForm";
import { ActionMessage } from "../components/ui/ActionMessage";
import { fetchMarketStudies, updateStudy } from "../lib/api";
import { formatMoney } from "../lib/format";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";

interface Props {
  onStudyClick: (id: number) => void;
}

export function MarketStudiesPage({ onStudyClick }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updateAllProgress, setUpdateAllProgress] = useState<string | null>(null);
  const [updateAllError, setUpdateAllError] = useState<string | null>(null);
  const [updateAllDone, setUpdateAllDone] = useState<string | null>(null);

  const { data: studies = [], isLoading, error } = useQuery({
    queryKey: ["market-studies"],
    queryFn: fetchMarketStudies,
  });

  function handleSaved() {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["market-studies"] });
  }

  async function handleUpdateAll() {
    if (studies.length === 0 || updatingAll) return;
    setUpdatingAll(true);
    setUpdateAllError(null);
    setUpdateAllDone(null);
    try {
      for (let i = 0; i < studies.length; i++) {
        const s = studies[i]!;
        setUpdateAllProgress(`Updating ${i + 1}/${studies.length}: ${s.name}`);
        await updateStudy(s.id);
      }
      setUpdateAllDone(
        `Updated ${studies.length} study${studies.length === 1 ? "" : "ies"}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
    } catch (err) {
      setUpdateAllError(
        err instanceof Error ? err.message : "Failed to update studies",
      );
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
    } finally {
      setUpdatingAll(false);
      setUpdateAllProgress(null);
    }
  }

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Market Studies</h2>
        {!showForm && (
          <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto w-full sm:w-auto">
            {studies.length > 0 && (
              <button
                type="button"
                onClick={handleUpdateAll}
                disabled={isLoading || updatingAll}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingAll ? "Updating…" : "Update All"}
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              + New Study
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">
              New Market Study
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Cancel
            </button>
          </div>
          <MarketStudyForm onSaved={handleSaved} />
        </div>
      )}

      {errorMessage && (
        <div className="mb-6">
          <ErrorAlert message={errorMessage} />
        </div>
      )}

      {updateAllProgress && (
        <div className="mb-4">
          <ActionMessage message={updateAllProgress} />
        </div>
      )}

      {updateAllError && (
        <div className="mb-4">
          <ActionMessage variant="error" message={updateAllError} />
        </div>
      )}

      {updateAllDone && !updatingAll && !updateAllError && (
        <div className="mb-4">
          <ActionMessage message={updateAllDone} />
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading studies..." />
      ) : studies.length === 0 && !showForm ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No studies yet</p>
          <p className="text-sm">
            Click{" "}
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-500 hover:underline"
            >
              + New Study
            </button>{" "}
            to search the transfer market and save a study.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {studies.map((s) => (
            <div
              key={s.id}
              onClick={() => onStudyClick(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStudyClick(s.id);
                }
              }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-400 transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {s.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-4 shrink-0 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">
                      {s.playerCount}
                    </p>
                    <p className="text-xs text-gray-400">Players</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">
                      {s.soldCount}
                    </p>
                    <p className="text-xs text-gray-400">Sold</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">
                      {s.listedCount}
                    </p>
                    <p className="text-xs text-gray-400">Listed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-400">
                      {s.expiredCount}
                    </p>
                    <p className="text-xs text-gray-400">Expired</p>
                  </div>
                  {s.avgFinalPrice !== null && (
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">
                        {formatMoney(s.avgFinalPrice)}
                      </p>
                      <p className="text-xs text-gray-400">Avg Sale</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
