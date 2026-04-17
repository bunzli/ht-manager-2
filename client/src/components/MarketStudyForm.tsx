import { useState } from "react";
import { previewMarketStudy, createMarketStudy } from "../lib/api";
import type { TransferSearchParams, TransferSearchResponse } from "../lib/types";
import { TransferResultCard } from "./TransferResultCard";
import { ErrorAlert } from "./ui/ErrorAlert";
import { SPECIALTY_NAMES, SKILL_LEVELS } from "../lib/skills";
import { SKILL_TYPE_MAP } from "../lib/skillTypes";

const SKILL_VALUES = Array.from({ length: 21 }, (_, i) => i);

interface SkillFilterProps {
  index: 1 | 2 | 3 | 4;
  required?: boolean;
  skillType: number | undefined;
  minValue: number | undefined;
  maxValue: number | undefined;
  onTypeChange: (v: number | undefined) => void;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
}

function SkillFilter({
  index,
  required,
  skillType,
  minValue,
  maxValue,
  onTypeChange,
  onMinChange,
  onMaxChange,
}: SkillFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="text-sm text-gray-600 w-16 shrink-0">
        Skill {index}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm flex-1 min-w-[130px]"
        value={skillType ?? ""}
        onChange={(e) =>
          onTypeChange(e.target.value ? Number(e.target.value) : undefined)
        }
      >
        {!required && <option value="">— Any —</option>}
        {SKILL_TYPE_MAP.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-36"
        value={minValue ?? 0}
        onChange={(e) => onMinChange(Number(e.target.value))}
        disabled={!required && skillType === undefined}
      >
        {SKILL_VALUES.map((v) => (
          <option key={v} value={v}>
            {v} – {SKILL_LEVELS[v] ?? v}
          </option>
        ))}
      </select>
      <span className="text-gray-400 text-sm">–</span>
      <select
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-36"
        value={maxValue ?? 20}
        onChange={(e) => onMaxChange(Number(e.target.value))}
        disabled={!required && skillType === undefined}
      >
        {SKILL_VALUES.map((v) => (
          <option key={v} value={v}>
            {v} – {SKILL_LEVELS[v] ?? v}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  onSaved: () => void;
}

export function MarketStudyForm({ onSaved }: Props) {
  const [name, setName] = useState("");
  const [ageMin, setAgeMin] = useState(17);
  const [ageMax, setAgeMax] = useState(25);

  const [skill1Type, setSkill1Type] = useState<number>(5);
  const [skill1Min, setSkill1Min] = useState<number>(5);
  const [skill1Max, setSkill1Max] = useState<number>(20);

  const [skill2Type, setSkill2Type] = useState<number | undefined>(undefined);
  const [skill2Min, setSkill2Min] = useState<number | undefined>(undefined);
  const [skill2Max, setSkill2Max] = useState<number | undefined>(undefined);

  const [skill3Type, setSkill3Type] = useState<number | undefined>(undefined);
  const [skill3Min, setSkill3Min] = useState<number | undefined>(undefined);
  const [skill3Max, setSkill3Max] = useState<number | undefined>(undefined);

  const [skill4Type, setSkill4Type] = useState<number | undefined>(undefined);
  const [skill4Min, setSkill4Min] = useState<number | undefined>(undefined);
  const [skill4Max, setSkill4Max] = useState<number | undefined>(undefined);

  const [specialties, setSpecialties] = useState<number[]>([]);
  const [tsiMin, setTsiMin] = useState<string>("");
  const [tsiMax, setTsiMax] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<TransferSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildParams(): TransferSearchParams {
    const params: TransferSearchParams = {
      ageMin,
      ageMax,
      skillType1: skill1Type,
      minSkillValue1: skill1Min,
      maxSkillValue1: skill1Max,
    };

    if (skill2Type !== undefined) {
      params.skillType2 = skill2Type;
      params.minSkillValue2 = skill2Min ?? 0;
      params.maxSkillValue2 = skill2Max ?? 20;
    }
    if (skill3Type !== undefined) {
      params.skillType3 = skill3Type;
      params.minSkillValue3 = skill3Min ?? 0;
      params.maxSkillValue3 = skill3Max ?? 20;
    }
    if (skill4Type !== undefined) {
      params.skillType4 = skill4Type;
      params.minSkillValue4 = skill4Min ?? 0;
      params.maxSkillValue4 = skill4Max ?? 20;
    }
    // specialty is handled separately via specialties array
    if (tsiMin !== "") params.tsiMin = Number(tsiMin);
    if (tsiMax !== "") params.tsiMax = Number(tsiMax);
    if (priceMin !== "") params.priceMin = Number(priceMin);
    if (priceMax !== "") params.priceMax = Number(priceMax);

    return params;
  }

  async function handleSearch() {
    setError(null);
    setResults(null);
    setSearching(true);
    try {
      const data = await previewMarketStudy(buildParams(), specialties);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Please enter a study name before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createMarketStudy(name.trim(), buildParams(), specialties);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const ages = Array.from({ length: 34 }, (_, i) => i + 17);

  return (
    <div className="space-y-6">
      {/* Study name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Study name
        </label>
        <input
          type="text"
          placeholder="e.g. Young scorers U21"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Age range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Age range
        </label>
        <div className="flex items-center gap-3">
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={ageMin}
            onChange={(e) => setAgeMin(Number(e.target.value))}
          >
            {ages.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span className="text-gray-400 text-sm">–</span>
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={ageMax}
            onChange={(e) => setAgeMax(Number(e.target.value))}
          >
            {ages.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skills
        </label>
        <div className="space-y-3">
          <SkillFilter
            index={1}
            required
            skillType={skill1Type}
            minValue={skill1Min}
            maxValue={skill1Max}
            onTypeChange={(v) => setSkill1Type(v ?? 6)}
            onMinChange={(v) => setSkill1Min(v ?? 0)}
            onMaxChange={(v) => setSkill1Max(v ?? 20)}
          />
          <SkillFilter
            index={2}
            skillType={skill2Type}
            minValue={skill2Min}
            maxValue={skill2Max}
            onTypeChange={(v) => {
              setSkill2Type(v);
              if (v === undefined) {
                setSkill2Min(undefined);
                setSkill2Max(undefined);
              } else {
                setSkill2Min((prev) => prev ?? 0);
                setSkill2Max((prev) => prev ?? 20);
              }
            }}
            onMinChange={setSkill2Min}
            onMaxChange={setSkill2Max}
          />
          <SkillFilter
            index={3}
            skillType={skill3Type}
            minValue={skill3Min}
            maxValue={skill3Max}
            onTypeChange={(v) => {
              setSkill3Type(v);
              if (v === undefined) {
                setSkill3Min(undefined);
                setSkill3Max(undefined);
              } else {
                setSkill3Min((prev) => prev ?? 0);
                setSkill3Max((prev) => prev ?? 20);
              }
            }}
            onMinChange={setSkill3Min}
            onMaxChange={setSkill3Max}
          />
          <SkillFilter
            index={4}
            skillType={skill4Type}
            minValue={skill4Min}
            maxValue={skill4Max}
            onTypeChange={(v) => {
              setSkill4Type(v);
              if (v === undefined) {
                setSkill4Min(undefined);
                setSkill4Max(undefined);
              } else {
                setSkill4Min((prev) => prev ?? 0);
                setSkill4Max((prev) => prev ?? 20);
              }
            }}
            onMinChange={setSkill4Min}
            onMaxChange={setSkill4Max}
          />
        </div>
      </div>

      {/* Advanced filters */}
      <details className="group" open>
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
          Advanced filters
          <span className="ml-1 text-gray-400 group-open:hidden">▸</span>
          <span className="ml-1 text-gray-400 hidden group-open:inline">▾</span>
        </summary>
        <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100">
          {/* Specialty */}
          <div className="flex flex-wrap gap-2">
            <label className="text-sm text-gray-600 w-20 shrink-0 pt-1">
              Specialty
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {Object.entries(SPECIALTY_NAMES)
                .filter(([, label]) => label !== "")
                .map(([id, label]) => {
                  const numId = Number(id);
                  const checked = specialties.includes(numId);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={checked}
                        onChange={() =>
                          setSpecialties((prev) =>
                            checked
                              ? prev.filter((s) => s !== numId)
                              : [...prev, numId],
                          )
                        }
                      />
                      {label}
                    </label>
                  );
                })}
            </div>
          </div>

          {/* TSI */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600 w-20 shrink-0">TSI</label>
            <input
              type="number"
              placeholder="min"
              value={tsiMin}
              onChange={(e) => setTsiMin(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="max"
              value={tsiMax}
              onChange={(e) => setTsiMax(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600 w-20 shrink-0">
              Price ($)
            </label>
            <input
              type="number"
              placeholder="min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-24"
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {searching ? "Searching..." : "Search"}
        </button>
        {results !== null && (
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            title={!name.trim() ? "Enter a study name first" : undefined}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Study"}
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Results */}
      {results !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              Results
              <span className="ml-2 text-sm font-normal text-gray-500">
                {results.ItemCount === -1
                  ? "100+ players found (showing first 25)"
                  : `${results.ItemCount} player${results.ItemCount !== 1 ? "s" : ""} found`}
              </span>
            </h3>
          </div>

          {results.Results.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No players found matching your criteria.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.Results.map((r) => (
                <TransferResultCard key={r.PlayerId} result={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
