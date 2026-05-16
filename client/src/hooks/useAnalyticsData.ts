import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchMarketStudy, fetchMarketStudies } from "../lib/api";
import { fetchStudyPredictions } from "../lib/priceModelApi";
import type { TransferPlayerRow } from "../lib/types";
import type { StudySelection } from "../lib/analyticsFilters";

function resolveStudyIds(
  selection: StudySelection,
  allStudies: { id: number }[],
): number[] {
  const allIds = allStudies.map((s) => s.id);
  if (selection === "all") return allIds;
  return selection.filter((id) => allIds.includes(id));
}

export function useAnalyticsStudyQueries(studySelection: StudySelection) {
  const { data: studyList = [], isLoading: listLoading } = useQuery({
    queryKey: ["market-studies"],
    queryFn: fetchMarketStudies,
  });

  const sortedIds = useMemo(() => {
    const ids = resolveStudyIds(studySelection, studyList);
    return [...ids].sort((a, b) => a - b);
  }, [studySelection, studyList]);

  const detailQueries = useQueries({
    queries: sortedIds.map((id) => ({
      queryKey: ["market-study", id],
      queryFn: () => fetchMarketStudy(id),
      enabled: id > 0,
    })),
  });

  const mergedPlayers = useMemo(() => {
    const rows: TransferPlayerRow[] = [];
    for (const q of detailQueries) {
      if (q.data?.players) rows.push(...q.data.players);
    }
    return rows;
  }, [detailQueries]);

  const studyNamesById = useMemo(
    () => Object.fromEntries(studyList.map((s) => [s.id, s.name])),
    [studyList],
  );

  const detailLoading = detailQueries.some((q) => q.isLoading);
  const detailError = detailQueries.find((q) => q.error)?.error;

  const predictionQueries = useQueries({
    queries: sortedIds.map((id) => ({
      queryKey: ["priceModel", "predict", "study", id],
      queryFn: () => fetchStudyPredictions(id),
      enabled: id > 0,
      retry: false,
    })),
  });

  const mergedPredictions = useMemo(() => {
    const out: Record<number, number> = {};
    for (const q of predictionQueries) {
      if (q.data?.predictions) {
        Object.assign(out, q.data.predictions);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }, [predictionQueries]);

  return {
    studyList,
    studyNamesById,
    mergedPlayers,
    listLoading,
    detailLoading,
    detailError:
      detailError instanceof Error ? detailError.message : null,
    mergedPredictions,
    activeStudyIds: sortedIds,
    refetchDetails: () =>
      Promise.all(detailQueries.map((q) => q.refetch())),
  };
}
