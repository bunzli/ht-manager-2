import { useState } from "react";
import { SKILL_TYPE_MAP } from "../../lib/skillTypes";
import { SPECIALTY_NAMES } from "../../lib/skills";
import type { ChartFilter } from "../../lib/types";

const DIMENSION_OPTIONS = [
  { value: "age", label: "Age" },
  { value: "specialty", label: "Specialty" },
  ...SKILL_TYPE_MAP.map((s) => ({ value: s.field, label: s.label })),
];

const FILTER_FIELD_OPTIONS = DIMENSION_OPTIONS;

const SPECIALTY_OPTIONS = Object.entries(SPECIALTY_NAMES)
  .filter(([, name]) => name !== "")
  .map(([id, name]) => ({ value: Number(id), label: name }));

interface Props {
  onAdd: (groupBy: string, filters: ChartFilter[]) => void;
  adding?: boolean;
}

export function CustomChartBuilder({ onAdd, adding }: Props) {
  const [groupBy, setGroupBy] = useState("age");
  const [filters, setFilters] = useState<ChartFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const availableFilterFields = FILTER_FIELD_OPTIONS.filter(
    (o) => o.value !== groupBy,
  );

  function addFilter() {
    const firstAvailable = availableFilterFields[0];
    if (!firstAvailable) return;
    setFilters((prev) => [
      ...prev,
      { field: firstAvailable.value, value: 0 },
    ]);
    setShowFilters(true);
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFilter(index: number, patch: Partial<ChartFilter>) {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function handleSubmit() {
    onAdd(groupBy, filters);
    setFilters([]);
    setShowFilters(false);
  }

  function isSkillField(field: string): boolean {
    return SKILL_TYPE_MAP.some((s) => s.field === field);
  }

  function renderValueInput(filter: ChartFilter, index: number) {
    if (filter.field === "specialty") {
      return (
        <select
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          value={filter.value}
          onChange={(e) =>
            updateFilter(index, { value: Number(e.target.value) })
          }
        >
          {SPECIALTY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="number"
        value={filter.value || ""}
        onChange={(e) =>
          updateFilter(index, { value: Number(e.target.value) || 0 })
        }
        placeholder={
          isSkillField(filter.field)
            ? "min level"
            : filter.field === "age"
              ? "year"
              : "value"
        }
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-20"
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Add Custom Chart
      </h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Group by</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value);
              setFilters((prev) =>
                prev.filter((f) => f.field !== e.target.value),
              );
            }}
          >
            {DIMENSION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={addFilter}
          disabled={availableFilterFields.length === 0}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed py-1.5"
        >
          + Add filter
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={adding}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {adding ? "Adding..." : "Add Chart"}
        </button>
      </div>

      {showFilters && filters.length > 0 && (
        <div className="mt-3 space-y-2">
          {filters.map((filter, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400">where</span>
              <select
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={filter.field}
                onChange={(e) => updateFilter(i, { field: e.target.value, value: 0 })}
              >
                {availableFilterFields.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">
                {isSkillField(filter.field)
                  ? ">="
                  : filter.field === "age"
                    ? "year"
                    : "="}
              </span>
              {renderValueInput(filter, i)}
              <button
                type="button"
                onClick={() => removeFilter(i)}
                className="text-gray-400 hover:text-red-500 text-sm"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
