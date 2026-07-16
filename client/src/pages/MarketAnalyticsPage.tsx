import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudiesSubNav } from "../components/market-study/StudiesSubNav";
import { AnalyticsFilters } from "../components/market-study/AnalyticsFilters";
import { AgeDoubleBarChart } from "../components/market-study/AgeDoubleBarChart";
import { PriceBySpecialtyChart } from "../components/market-study/PriceBySpecialtyChart";
import { PriceBySkillChart } from "../components/market-study/PriceBySkillChart";
import { StudyResultsTable } from "../components/market-study/StudyResultsTable";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { ActionMessage } from "../components/ui/ActionMessage";
import { useAnalyticsStudyQueries } from "../hooks/useAnalyticsData";
import {
  initialAnalyticsFilters,
  filterSoldGlobal,
  filterSoldForCharts,
  filterTablePlayers,
  computeBounds,
  type AnalyticsFilterModel,
} from "../lib/analyticsFilters";
import {
  deleteTransferPlayers,
  deleteUnsoldPlayers,
  updateTransferPlayers,
} from "../lib/api";
import { INITIAL_FILTERS } from "../hooks/useMarketStudy";
import { Drawer } from "@base-ui/react/drawer";
import { displayName } from "../lib/playerUtils";
import { formatMoney, formatNumber } from "../lib/format";

export function MarketAnalyticsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AnalyticsFilterModel>(() =>
    initialAnalyticsFilters(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingSelected, setUpdatingSelected] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingUnsold, setDeletingUnsold] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const boundsInitialized = useRef(false);
  const urlInitDone = useRef(false);

  const {
    studyList,
    studyNamesById,
    mergedPlayers,
    listLoading,
    detailLoading,
    detailError,
    mergedPredictions,
    activeStudyIds,
    refetchDetails,
  } = useAnalyticsStudyQueries(filters.studyIds);

  useEffect(() => {
    if (urlInitDone.current) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("studies");
    if (raw) {
      const ids = raw
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0);
      if (ids.length > 0) {
        setFilters((f) => ({ ...f, studyIds: ids }));
      }
    }
    urlInitDone.current = true;
  }, []);

  const bounds = useMemo(() => computeBounds(mergedPlayers), [mergedPlayers]);

  useEffect(() => {
    if (boundsInitialized.current || mergedPlayers.length === 0) return;
    setFilters((f) => ({
      ...f,
      ageRange: bounds.age,
      priceRange: bounds.price,
    }));
    boundsInitialized.current = true;
  }, [mergedPlayers.length, bounds]);

  const soldGlobal = useMemo(
    () =>
      filterSoldGlobal(mergedPlayers, {
        studyIds: filters.studyIds,
        ageRange: filters.ageRange,
        priceRange: filters.priceRange,
        skillRanges: filters.skillRanges,
      }),
    [mergedPlayers, filters],
  );

  const soldForSpecialtyCharts = useMemo(() => {
    const { tableStatus: _t, ...rest } = filters;
    return filterSoldForCharts(mergedPlayers, rest);
  }, [mergedPlayers, filters]);

  const tablePlayers = useMemo(
    () => filterTablePlayers(mergedPlayers, filters),
    [mergedPlayers, filters],
  );

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((visibleIds: number[]) => {
    setSelectedIds((prev) => {
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleUpdateSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setUpdatingSelected(true);
    setError(null);
    setActionMsg(null);
    try {
      const byStudy = new Map<number, number[]>();
      for (const id of selectedIds) {
        const row = mergedPlayers.find((p) => p.id === id);
        const sid = row?.marketStudyId;
        if (sid == null) continue;
        if (!byStudy.has(sid)) byStudy.set(sid, []);
        byStudy.get(sid)!.push(id);
      }
      const parts: string[] = [];
      for (const [sid, ids] of byStudy) {
        const data = await updateTransferPlayers(sid, ids);
        const r = data._result;
        if (r.sold > 0) parts.push(`${r.sold} sold`);
        if (r.notSold > 0) parts.push(`${r.notSold} not sold`);
      }
      setActionMsg(parts.length ? parts.join(" · ") : "Players updated.");
      setSelectedIds(new Set());
      await refetchDetails();
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingSelected(false);
    }
  }, [selectedIds, mergedPlayers, refetchDetails, queryClient]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(
      `Delete ${selectedIds.size} player row(s) from their studies? This cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    setActionMsg(null);
    try {
      const byStudy = new Map<number, number[]>();
      for (const id of selectedIds) {
        const row = mergedPlayers.find((p) => p.id === id);
        const sid = row?.marketStudyId;
        if (sid == null) continue;
        if (!byStudy.has(sid)) byStudy.set(sid, []);
        byStudy.get(sid)!.push(id);
      }
      let total = 0;
      for (const [sid, ids] of byStudy) {
        const r = await deleteTransferPlayers(sid, ids);
        total += r.deleted;
      }
      setActionMsg(`Deleted ${total} row(s).`);
      setSelectedIds(new Set());
      await refetchDetails();
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, mergedPlayers, refetchDetails, queryClient]);

  const handleDeleteUnsoldAll = useCallback(async () => {
    const ok = window.confirm(
      "Remove all non-sold players from every selected study? This cannot be undone.",
    );
    if (!ok) return;
    setDeletingUnsold(true);
    setError(null);
    setActionMsg(null);
    try {
      let total = 0;
      for (const sid of activeStudyIds) {
        const r = await deleteUnsoldPlayers(sid);
        total += r.deleted;
      }
      setActionMsg(
        total === 0
          ? "No non-sold players to remove."
          : `Removed ${total} non-sold row(s) across studies.`,
      );
      await refetchDetails();
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove players");
    } finally {
      setDeletingUnsold(false);
    }
  }, [activeStudyIds, refetchDetails, queryClient]);

  const loading = listLoading || detailLoading;

  return (
    <div className="space-y-5">
      <StudiesSubNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Market analytics</h2>
        <button
          type="button"
          onClick={handleDeleteUnsoldAll}
          disabled={deletingUnsold || activeStudyIds.length === 0}
          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium self-start"
        >
          {deletingUnsold ? "Removing…" : "Remove non-sold (all selected studies)"}
        </button>
      </div>

      {detailError && (
        <ErrorAlert message={detailError} />
      )}

      {loading && mergedPlayers.length === 0 ? (
        <LoadingSpinner message="Loading study data..." />
      ) : studyList.length === 0 ? (
        <p className="text-gray-500">No market studies yet.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <AnalyticsFilters studies={studyList} filters={filters} onChange={setFilters} ageBounds={bounds.age} priceBounds={bounds.price} />
          </div>
          <Drawer.Root open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
            <Drawer.Trigger className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm md:hidden">
              Filters · {filters.studyIds === "all" ? "all studies" : `${filters.studyIds.length} studies`}
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Backdrop className="fixed inset-0 z-40 bg-slate-950/40" />
              <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
                <Drawer.Popup className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />
                  <div className="mb-4 flex items-center justify-between"><Drawer.Title className="text-lg font-bold text-slate-950">Analytics filters</Drawer.Title><Drawer.Close className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600">Done</Drawer.Close></div>
                  <AnalyticsFilters studies={studyList} filters={filters} onChange={setFilters} ageBounds={bounds.age} priceBounds={bounds.price} />
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>

          {actionMsg && <ActionMessage message={actionMsg} />}
          {error && <ActionMessage message={error} variant="error" />}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AgeDoubleBarChart
              soldGlobal={soldGlobal}
              specialtyIds={filters.specialtyIds}
            />
            <PriceBySpecialtyChart soldPlayers={soldForSpecialtyCharts} />
          </div>
          <PriceBySkillChart
            soldPlayers={soldForSpecialtyCharts}
            specialtyIds={filters.specialtyIds}
          />

          {selectedIds.size > 0 && (
            <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 shadow-lg md:static md:shadow-none">
              <span className="text-sm text-blue-700 font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-blue-600 underline"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpdateSelected}
                  disabled={updatingSelected || deleting}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {updatingSelected ? "Updating…" : "Update selected"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={deleting || updatingSelected}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete selected"}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Players</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Status</label>
                <select
                  className="border border-gray-300 rounded-md px-2 h-8 text-sm"
                  value={filters.tableStatus}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      tableStatus: e.target.value as typeof f.tableStatus,
                    }))
                  }
                >
                  <option value="listed">Listed</option>
                  <option value="all">All</option>
                  <option value="sold">Sold</option>
                  <option value="ended">Ended</option>
                  <option value="not_sold">Not sold / expired</option>
                </select>
              </div>
            </div>
            <div className="hidden md:block"><StudyResultsTable players={tablePlayers} filters={INITIAL_FILTERS} skipFilters showStudyColumn={activeStudyIds.length > 1} studyNamesById={studyNamesById} selectedIds={selectedIds} onToggleRow={toggleRow} onToggleAll={toggleAll} predictions={mergedPredictions} /></div>
            <div className="space-y-2 md:hidden">
              {tablePlayers.map((player) => {
                const price = player.status === "listed" ? (player.highestBid || player.askingPrice) : player.finalPrice;
                return <button type="button" key={player.id} onClick={() => toggleRow(player.id)} className={`w-full rounded-xl border p-3 text-left shadow-sm ${selectedIds.has(player.id) ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{displayName(player.playerDetails)}</p><p className="mt-0.5 text-xs text-slate-500">{player.playerDetails.age}y · TSI {formatNumber(player.playerDetails.tsi)} · {player.status}</p></div><span className="text-sm font-semibold text-slate-800">{price == null ? "—" : formatMoney(price)}</span></div>
                  <div className="mt-2 flex gap-3 text-xs text-slate-500"><span>Form {player.playerDetails.playerForm}</span><span>Spec {player.playerDetails.specialty || "—"}</span>{mergedPredictions?.[player.id] != null && <span>Est. {formatMoney(mergedPredictions[player.id])}</span>}</div>
                </button>;
              })}
              {tablePlayers.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No players match the current filters.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
