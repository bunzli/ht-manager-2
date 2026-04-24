import { useEffect, useState, useMemo, useCallback } from "react";
import {
  fetchMarketStudy,
  updateStudy,
  updateTransferPlayers,
  deleteTransferPlayers,
  deleteUnsoldPlayers,
  addCustomChart,
  deleteCustomChart,
} from "../lib/api";
import type {
  MarketStudy,
  TransferPlayerRow,
  PriceByAge,
  PriceBySpecialty,
  CustomChartConfig,
  ChartFilter,
} from "../lib/types";

export function useMarketStudyData(studyId: number) {
  const [study, setStudy] = useState<MarketStudy | null>(null);
  const [players, setPlayers] = useState<TransferPlayerRow[]>([]);
  const [priceByAge, setPriceByAge] = useState<PriceByAge[]>([]);
  const [priceBySpecialty, setPriceBySpecialty] = useState<PriceBySpecialty[]>(
    [],
  );
  const [customCharts, setCustomCharts] = useState<CustomChartConfig[]>([]);
  const [addingChart, setAddingChart] = useState(false);
  const [removingChartId, setRemovingChartId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingSelected, setUpdatingSelected] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingUnsold, setDeletingUnsold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchMarketStudy(studyId)
      .then((data) => {
        setStudy(data.study);
        setPlayers(data.players);
        setPriceByAge(data.priceByAge);
        setPriceBySpecialty(data.priceBySpecialty);
        setCustomCharts(data.customCharts ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unknown error"),
      )
      .finally(() => setLoading(false));
  }, [studyId]);

  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    setError(null);
    setActionMsg(null);
    try {
      const data = await updateStudy(studyId);
      setStudy(data.study);
      setPlayers(data.players);
      setPriceByAge(data.priceByAge);
      setPriceBySpecialty(data.priceBySpecialty);
      setCustomCharts(data.customCharts ?? []);
      const meta = (data as unknown as Record<string, unknown>)
        ._updateResult as {
        newPlayersAdded: number;
        updatedListed: number;
        ended: number;
        resolved: number;
        sold: number;
        notSold: number;
      };
      if (meta) {
        const parts: string[] = [];
        if (meta.newPlayersAdded > 0)
          parts.push(
            `${meta.newPlayersAdded} new player${meta.newPlayersAdded !== 1 ? "s" : ""} added`,
          );
        if (meta.ended > 0) parts.push(`${meta.ended} ended`);
        if (meta.sold > 0) parts.push(`${meta.sold} sold`);
        if (meta.notSold > 0) parts.push(`${meta.notSold} not sold`);
        setActionMsg(parts.length > 0 ? parts.join(" · ") : "Up to date");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }, [studyId]);

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (visibleIds: number[]) => {
      const allSelected = visibleIds.every((id) => selectedIds.has(id));
      if (allSelected) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          visibleIds.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          visibleIds.forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [selectedIds],
  );

  const handleUpdateSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setUpdatingSelected(true);
    setError(null);
    setActionMsg(null);
    try {
      const ids = Array.from(selectedIds);
      const data = await updateTransferPlayers(studyId, ids);
      const updatedMap = new Map(data.players.map((p) => [p.id, p]));
      setPlayers((prev) =>
        prev.map((p) => (updatedMap.has(p.id) ? updatedMap.get(p.id)! : p)),
      );
      const r = data._result;
      const parts: string[] = [];
      if (r.sold > 0) parts.push(`${r.sold} sold`);
      if (r.notSold > 0) parts.push(`${r.notSold} not sold`);
      if (r.stillListed > 0) parts.push(`${r.stillListed} still listed`);
      setActionMsg(
        parts.length > 0
          ? `Updated ${r.checked} player${r.checked !== 1 ? "s" : ""}: ${parts.join(" · ")}`
          : `${r.checked} player${r.checked !== 1 ? "s" : ""} checked — no changes`,
      );
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingSelected(false);
    }
  }, [studyId, selectedIds]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} player${selectedIds.size !== 1 ? "s" : ""} from this study? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setActionMsg(null);
    try {
      const ids = Array.from(selectedIds);
      await deleteTransferPlayers(studyId, ids);
      setPlayers((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setActionMsg(
        `${ids.length} player${ids.length !== 1 ? "s" : ""} deleted.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [studyId, selectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleDeleteUnsold = useCallback(async () => {
    const confirmed = window.confirm(
      "Remove all non-sold players (not sold, ended, expired) from this study? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingUnsold(true);
    setError(null);
    setActionMsg(null);
    try {
      const result = await deleteUnsoldPlayers(studyId);
      setPlayers((prev) =>
        prev.filter((p) =>
          ["listed", "sold"].includes(p.status),
        ),
      );
      setSelectedIds(new Set());
      setActionMsg(
        result.deleted === 0
          ? "No non-sold players to remove."
          : `Removed ${result.deleted} non-sold player${result.deleted === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete players");
    } finally {
      setDeletingUnsold(false);
    }
  }, [studyId]);

  const handleAddChart = useCallback(
    async (groupBy: string, filters: ChartFilter[]) => {
      setAddingChart(true);
      setError(null);
      try {
        const chart = await addCustomChart(studyId, groupBy, filters);
        setCustomCharts((prev) => [...prev, chart]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add chart");
      } finally {
        setAddingChart(false);
      }
    },
    [studyId],
  );

  const handleRemoveChart = useCallback(
    async (chartId: number) => {
      setRemovingChartId(chartId);
      setError(null);
      try {
        await deleteCustomChart(studyId, chartId);
        setCustomCharts((prev) => prev.filter((c) => c.id !== chartId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove chart",
        );
      } finally {
        setRemovingChartId(null);
      }
    },
    [studyId],
  );

  return {
    study,
    players,
    priceByAge,
    priceBySpecialty,
    customCharts,
    addingChart,
    removingChartId,
    loading,
    updating,
    updatingSelected,
    deleting,
    error,
    actionMsg,
    selectedIds,
    handleUpdate,
    toggleRow,
    toggleAll,
    handleUpdateSelected,
    handleDeleteSelected,
    clearSelection,
    handleDeleteUnsold,
    deletingUnsold,
    handleAddChart,
    handleRemoveChart,
  };
}

export type StatusFilter = "all" | "listed" | "sold" | "ended" | "not_sold";

export interface StudyFilters {
  statusFilter: StatusFilter;
  ageMin: string;
  ageMax: string;
  skillFilter: string;
  skillMinLevel: string;
  priceMin: string;
  priceMax: string;
}

export const INITIAL_FILTERS: StudyFilters = {
  statusFilter: "all",
  ageMin: "",
  ageMax: "",
  skillFilter: "",
  skillMinLevel: "",
  priceMin: "",
  priceMax: "",
};

export function useStudyFilters() {
  const [filters, setFilters] = useState<StudyFilters>(INITIAL_FILTERS);

  const updateFilter = useCallback(
    <K extends keyof StudyFilters>(key: K, value: StudyFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () =>
      filters.statusFilter !== "all" ||
      filters.ageMin !== "" ||
      filters.ageMax !== "" ||
      filters.skillFilter !== "" ||
      filters.priceMin !== "" ||
      filters.priceMax !== "",
    [filters],
  );

  return { filters, setFilters, updateFilter, clearFilters, hasActiveFilters };
}
