import { SKILL_TYPE_LABELS } from "../../lib/skillTypes";
import type { StudyFilters as FiltersState, StatusFilter } from "../../hooks/useMarketStudy";

interface Props {
  filters: FiltersState;
  onFilterChange: <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K],
  ) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function StudyFilters({
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={filters.statusFilter}
            onChange={(e) =>
              onFilterChange(
                "statusFilter",
                e.target.value as StatusFilter,
              )
            }
          >
            <option value="all">All</option>
            <option value="listed">Listed</option>
            <option value="sold">Sold</option>
            <option value="ended">Ended</option>
            <option value="not_sold">Not sold</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Age</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="min"
              value={filters.ageMin}
              onChange={(e) => onFilterChange("ageMin", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-16"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="max"
              value={filters.ageMax}
              onChange={(e) => onFilterChange("ageMax", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-16"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Skill</label>
          <div className="flex items-center gap-1">
            <select
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              value={filters.skillFilter}
              onChange={(e) => onFilterChange("skillFilter", e.target.value)}
            >
              <option value="">Any</option>
              {Object.entries(SKILL_TYPE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="min"
              value={filters.skillMinLevel}
              onChange={(e) =>
                onFilterChange("skillMinLevel", e.target.value)
              }
              disabled={!filters.skillFilter}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-16 disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Price</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="min"
              value={filters.priceMin}
              onChange={(e) => onFilterChange("priceMin", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="max"
              value={filters.priceMax}
              onChange={(e) => onFilterChange("priceMax", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 py-1.5"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
