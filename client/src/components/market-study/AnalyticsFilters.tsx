import type { MarketStudyListItem } from "../../lib/types";
import { RangeSlider } from "../ui/RangeSlider";
import { MultiSelect } from "../ui/MultiSelect";
import { formatMoney } from "../../lib/format";
import { SPECIALTY_NAMES, SKILL_KEYS } from "../../lib/skills";
import type {
  AnalyticsFilterModel,
  StudySelection,
  SpecialtySelection,
} from "../../lib/analyticsFilters";
import { ANALYTICS_SPECIALTY_IDS } from "../../lib/analyticsFilters";

interface Props {
  studies: MarketStudyListItem[];
  filters: AnalyticsFilterModel;
  onChange: (next: AnalyticsFilterModel) => void;
  ageBounds: [number, number];
  priceBounds: [number, number];
}

function selectedStudySet(
  selection: StudySelection,
  allIds: number[],
): Set<number> {
  if (selection === "all") return new Set(allIds);
  return new Set(selection);
}

function selectedSpecSet(selection: SpecialtySelection): Set<number> {
  if (selection === "all") return new Set(ANALYTICS_SPECIALTY_IDS);
  return new Set(selection);
}

function toStudySelection(
  selected: Set<number>,
  allIds: number[],
): StudySelection {
  if (selected.size === 0 || selected.size === allIds.length) return "all";
  return Array.from(selected);
}

function toSpecSelection(selected: Set<number>): SpecialtySelection {
  if (selected.size === 0 || selected.size === ANALYTICS_SPECIALTY_IDS.length)
    return "all";
  return Array.from(selected);
}

export function AnalyticsFilters({
  studies,
  filters,
  onChange,
  ageBounds,
  priceBounds,
}: Props) {
  const allStudyIds = studies.map((s) => s.id);
  const studySet = selectedStudySet(filters.studyIds, allStudyIds);
  const specSet = selectedSpecSet(filters.specialtyIds);

  const studyOptions = studies.map((s) => ({ id: s.id, label: s.name }));
  const specialtyOptions = ANALYTICS_SPECIALTY_IDS.map((id) => ({
    id,
    label: SPECIALTY_NAMES[id] || `#${id}`,
  }));

  function handleToggleStudy(id: number) {
    const next = new Set(studySet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, studyIds: toStudySelection(next, allStudyIds) });
  }

  function handleOnlyStudy(id: number) {
    onChange({ ...filters, studyIds: [id] });
  }

  function handleToggleSpec(id: number) {
    const next = new Set(specSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, specialtyIds: toSpecSelection(next) });
  }

  function handleOnlySpec(id: number) {
    onChange({ ...filters, specialtyIds: [id] });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-5">
      <h3 className="text-sm font-semibold text-gray-800">Filters</h3>

      {/* All filters in one row */}
      <div className="flex flex-wrap items-end gap-4">
        <MultiSelect
          label="Market studies"
          options={studyOptions}
          selectedIds={studySet}
          onToggle={handleToggleStudy}
          onSelectAll={() => onChange({ ...filters, studyIds: "all" })}
          onSelectOnly={handleOnlyStudy}
        />
        <MultiSelect
          label="Specialties"
          options={specialtyOptions}
          selectedIds={specSet}
          onToggle={handleToggleSpec}
          onSelectAll={() => onChange({ ...filters, specialtyIds: "all" })}
          onSelectOnly={handleOnlySpec}
        />

        <div className="flex-1 min-w-[180px] max-w-[260px]">
          <RangeSlider
            label="Age"
            min={ageBounds[0]}
            max={ageBounds[1]}
            valueMin={filters.ageRange[0]}
            valueMax={filters.ageRange[1]}
            onChange={(range) => onChange({ ...filters, ageRange: range })}
          />
        </div>

        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <RangeSlider
            label="Price"
            min={priceBounds[0]}
            max={priceBounds[1]}
            valueMin={filters.priceRange[0]}
            valueMax={filters.priceRange[1]}
            format={(n) => formatMoney(n)}
            onChange={(range) => onChange({ ...filters, priceRange: range })}
          />
        </div>
      </div>

      <details className="group border border-gray-100 rounded-lg p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
          Advanced — skill ranges
        </summary>
        <div className="mt-4 grid sm:grid-cols-2 gap-6">
          {SKILL_KEYS.map((s) => {
            const [lo, hi] = filters.skillRanges[s.key] ?? [0, 20];
            return (
              <RangeSlider
                key={s.key}
                label={s.label}
                min={0}
                max={20}
                valueMin={lo}
                valueMax={hi}
                onChange={(range) =>
                  onChange({
                    ...filters,
                    skillRanges: { ...filters.skillRanges, [s.key]: range },
                  })
                }
              />
            );
          })}
        </div>
      </details>
    </div>
  );
}
