import { useCallback, useMemo, useRef } from "react";
import {
  useMarketStudyData,
  useStudyFilters,
  INITIAL_FILTERS,
} from "../hooks/useMarketStudy";
import type { StudyFilters as StudyFiltersState } from "../hooks/useMarketStudy";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { ActionMessage } from "../components/ui/ActionMessage";
import { BackLink } from "../components/ui/BackLink";
import { StudyMetrics, computeMetrics } from "../components/market-study/StudyMetrics";
import { StudyFilters } from "../components/market-study/StudyFilters";
import { StudyCharts } from "../components/market-study/StudyCharts";
import { CustomChartBuilder } from "../components/market-study/CustomChartBuilder";
import { CustomChart } from "../components/market-study/CustomChart";
import { StudyResultsTable, applyFilters } from "../components/market-study/StudyResultsTable";
import { specialtyLabel } from "../lib/skills";
import { SKILL_TYPE_MAP, SKILL_TYPE_LABELS } from "../lib/skillTypes";
import type { TransferSearchParams, CustomChartConfig } from "../lib/types";

interface Props {
  studyId: number;
  onBack: () => void;
}

function formatSearchParams(raw: string): string {
  try {
    const p = JSON.parse(raw) as TransferSearchParams & {
      specialties?: number[];
    };
    const parts: string[] = [];
    parts.push(`Age ${p.ageMin}–${p.ageMax}`);
    if (p.skillType1)
      parts.push(
        `${SKILL_TYPE_LABELS[p.skillType1] ?? "Skill"} ${p.minSkillValue1}–${p.maxSkillValue1}`,
      );
    if (p.skillType2)
      parts.push(
        `${SKILL_TYPE_LABELS[p.skillType2] ?? "Skill"} ${p.minSkillValue2}–${p.maxSkillValue2}`,
      );
    if (p.specialties?.length)
      parts.push(
        `Spec: ${p.specialties.map((s) => specialtyLabel(s) || String(s)).join(", ")}`,
      );
    return parts.join(" · ");
  } catch {
    return raw;
  }
}

const FIELD_TO_SKILL_TYPE: Record<string, string> = Object.fromEntries(
  SKILL_TYPE_MAP.map((s) => [s.field, String(s.id)]),
);

function buildFiltersFromBar(
  config: CustomChartConfig,
  bucketKey: number,
): StudyFiltersState {
  const f: StudyFiltersState = { ...INITIAL_FILTERS, statusFilter: "sold" };

  const applyDimension = (field: string, value: number) => {
    if (field === "age") {
      f.ageMin = String(value);
      f.ageMax = String(value);
    } else if (FIELD_TO_SKILL_TYPE[field] && !f.skillFilter) {
      f.skillFilter = FIELD_TO_SKILL_TYPE[field];
      f.skillMinLevel = String(value);
    }
  };

  applyDimension(config.groupBy, bucketKey);

  for (const cf of config.filters) {
    applyDimension(cf.field, cf.value);
  }

  return f;
}

export function MarketStudyDetailPage({ studyId, onBack }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const {
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
  } = useMarketStudyData(studyId);

  const { filters, setFilters, updateFilter, clearFilters, hasActiveFilters } =
    useStudyFilters();

  const handleBarClick = useCallback(
    (config: CustomChartConfig, bucketKey: number) => {
      setFilters(buildFiltersFromBar(config, bucketKey));
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    },
    [setFilters],
  );

  const filtered = useMemo(
    () => applyFilters(players, filters),
    [players, filters],
  );
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  if (loading) {
    return <LoadingSpinner message="Loading study..." />;
  }

  if (error && !study) {
    return (
      <div>
        <BackLink onClick={onBack} label="Back to studies" />
        <div className="mt-4">
          <ErrorAlert message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackLink onClick={onBack} label="Back to studies" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{study?.name}</h2>
          {study && (
            <p className="text-sm text-gray-400 mt-0.5">
              {formatSearchParams(study.searchParams)} · Created{" "}
              {new Date(study.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDeleteUnsold}
            disabled={deletingUnsold || updating}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {deletingUnsold ? "Removing…" : "Remove non-sold"}
          </button>
          <button
            onClick={handleUpdate}
            disabled={updating || deletingUnsold}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {updating ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      {actionMsg && <ActionMessage message={actionMsg} />}
      {error && <ActionMessage message={error} variant="error" />}

      <StudyMetrics metrics={metrics} />
      <StudyFilters
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} player
            {selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Clear selection
            </button>
            <button
              onClick={handleUpdateSelected}
              disabled={updatingSelected || deleting}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {updatingSelected
                ? "Updating…"
                : `Update ${selectedIds.size} player${selectedIds.size !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={deleting || updatingSelected}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {deleting
                ? "Deleting…"
                : `Delete ${selectedIds.size} player${selectedIds.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      <StudyCharts priceByAge={priceByAge} priceBySpecialty={priceBySpecialty} />

      <CustomChartBuilder onAdd={handleAddChart} adding={addingChart} />

      {customCharts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {customCharts.map((chart, i) => (
            <CustomChart
              key={chart.id}
              config={chart}
              players={players}
              colorIndex={i}
              onRemove={handleRemoveChart}
              onBarClick={handleBarClick}
              removing={removingChartId === chart.id}
            />
          ))}
        </div>
      )}

      <div ref={tableRef}>
        <StudyResultsTable
          players={players}
          filters={filters}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      </div>
    </div>
  );
}
