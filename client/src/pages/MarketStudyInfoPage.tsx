import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarketStudyData,
} from "../hooks/useMarketStudy";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { ActionMessage } from "../components/ui/ActionMessage";
import { BackLink } from "../components/ui/BackLink";
import { StudiesSubNav } from "../components/market-study/StudiesSubNav";
import { computeMetrics, StudyMetrics } from "../components/market-study/StudyMetrics";
import { patchMarketStudy } from "../lib/api";
import type { TransferSearchParams } from "../lib/types";
import { SPECIALTY_NAMES, SKILL_LEVELS, specialtyLabel } from "../lib/skills";
import { SKILL_TYPE_LABELS, SKILL_TYPE_MAP } from "../lib/skillTypes";

interface Props {
  studyId: number;
  onBack: () => void;
}

const SKILL_VALUES = Array.from({ length: 21 }, (_, i) => i);

function parseStoredSearch(raw: string): {
  params: TransferSearchParams;
  specialties: number[];
} {
  try {
    const p = JSON.parse(raw) as TransferSearchParams & {
      specialties?: number[];
    };
    const { specialties, ...rest } = p;
    return {
      params: rest,
      specialties: Array.isArray(specialties) ? specialties : [],
    };
  } catch {
    return {
      params: {
        ageMin: 17,
        ageMax: 25,
        skillType1: 5,
        minSkillValue1: 5,
        maxSkillValue1: 20,
      },
      specialties: [],
    };
  }
}

function formatSearchSummary(raw: string): string {
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

export function MarketStudyInfoPage({ studyId, onBack }: Props) {
  const queryClient = useQueryClient();
  const {
    study,
    players,
    loading,
    updating,
    error,
    actionMsg,
    handleUpdate,
    handleDeleteUnsold,
    deletingUnsold,
    reload,
  } = useMarketStudyData(studyId);

  const [name, setName] = useState("");
  const [ageMin, setAgeMin] = useState(17);
  const [ageMax, setAgeMax] = useState(25);
  const [skill1Type, setSkill1Type] = useState(5);
  const [skill1Min, setSkill1Min] = useState(5);
  const [skill1Max, setSkill1Max] = useState(20);
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
  const [tsiMin, setTsiMin] = useState("");
  const [tsiMax, setTsiMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    if (!study) return;
    setName(study.name);
    const { params, specialties: specs } = parseStoredSearch(study.searchParams);
    setAgeMin(params.ageMin);
    setAgeMax(params.ageMax);
    setSkill1Type(params.skillType1);
    setSkill1Min(params.minSkillValue1);
    setSkill1Max(params.maxSkillValue1);
    if (params.skillType2 !== undefined) {
      setSkill2Type(params.skillType2);
      setSkill2Min(params.minSkillValue2 ?? 0);
      setSkill2Max(params.maxSkillValue2 ?? 20);
    } else {
      setSkill2Type(undefined);
      setSkill2Min(undefined);
      setSkill2Max(undefined);
    }
    if (params.skillType3 !== undefined) {
      setSkill3Type(params.skillType3);
      setSkill3Min(params.minSkillValue3 ?? 0);
      setSkill3Max(params.maxSkillValue3 ?? 20);
    } else {
      setSkill3Type(undefined);
      setSkill3Min(undefined);
      setSkill3Max(undefined);
    }
    if (params.skillType4 !== undefined) {
      setSkill4Type(params.skillType4);
      setSkill4Min(params.minSkillValue4 ?? 0);
      setSkill4Max(params.maxSkillValue4 ?? 20);
    } else {
      setSkill4Type(undefined);
      setSkill4Min(undefined);
      setSkill4Max(undefined);
    }
    setSpecialties(specs);
    setTsiMin(params.tsiMin !== undefined ? String(params.tsiMin) : "");
    setTsiMax(params.tsiMax !== undefined ? String(params.tsiMax) : "");
    setPriceMin(params.priceMin !== undefined ? String(params.priceMin) : "");
    setPriceMax(params.priceMax !== undefined ? String(params.priceMax) : "");
  }, [study]);

  const metrics = useMemo(() => computeMetrics(players), [players]);

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
    if (tsiMin !== "") params.tsiMin = Number(tsiMin);
    if (tsiMax !== "") params.tsiMax = Number(tsiMax);
    if (priceMin !== "") params.priceMin = Number(priceMin);
    if (priceMax !== "") params.priceMax = Number(priceMax);
    return params;
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveError("Study name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      await patchMarketStudy(studyId, {
        name: name.trim(),
        searchParams: buildParams(),
        specialties,
      });
      setSaveOk("Saved.");
      await queryClient.invalidateQueries({ queryKey: ["market-study", studyId] });
      await queryClient.invalidateQueries({ queryKey: ["market-studies"] });
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const ages = Array.from({ length: 34 }, (_, i) => i + 17);

  if (loading) {
    return <LoadingSpinner message="Loading study..." />;
  }

  if (error && !study) {
    return (
      <div>
        <StudiesSubNav />
        <BackLink onClick={onBack} label="Back to studies" />
        <div className="mt-4">
          <ErrorAlert message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StudiesSubNav />
      <BackLink onClick={onBack} label="Back to studies" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{study?.name}</h2>
          {study && (
            <p className="text-sm text-gray-400 mt-0.5">
              {formatSearchSummary(study.searchParams)} · Created{" "}
              {new Date(study.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to={`/market/analytics?studies=${studyId}`}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            View in Analytics →
          </Link>
          <button
            type="button"
            onClick={handleDeleteUnsold}
            disabled={deletingUnsold || updating}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {deletingUnsold ? "Removing…" : "Remove non-sold"}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updating || deletingUnsold}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {updating ? "Updating..." : "Update study data"}
          </button>
        </div>
      </div>

      {actionMsg && <ActionMessage message={actionMsg} />}
      {error && <ActionMessage message={error} variant="error" />}
      {saveOk && <ActionMessage message={saveOk} />}
      {saveError && <ActionMessage message={saveError} variant="error" />}

      <StudyMetrics metrics={metrics} />

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900">Edit study</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Study name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills
          </label>
          <div className="space-y-3">
            <SkillRow
              index={1}
              required
              skillType={skill1Type}
              minValue={skill1Min}
              maxValue={skill1Max}
              onTypeChange={(v) => setSkill1Type(v ?? 6)}
              onMinChange={(v) => setSkill1Min(v ?? 0)}
              onMaxChange={(v) => setSkill1Max(v ?? 20)}
            />
            <SkillRow
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
                  setSkill2Min((p) => p ?? 0);
                  setSkill2Max((p) => p ?? 20);
                }
              }}
              onMinChange={setSkill2Min}
              onMaxChange={setSkill2Max}
            />
            <SkillRow
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
                  setSkill3Min((p) => p ?? 0);
                  setSkill3Max((p) => p ?? 20);
                }
              }}
              onMinChange={setSkill3Min}
              onMaxChange={setSkill3Max}
            />
            <SkillRow
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
                  setSkill4Min((p) => p ?? 0);
                  setSkill4Max((p) => p ?? 20);
                }
              }}
              onMinChange={setSkill4Min}
              onMaxChange={setSkill4Max}
            />
          </div>
        </div>

        <details className="group border border-gray-100 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Advanced filters
          </summary>
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100">
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
                        className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer"
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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <p className="text-xs text-gray-500">
          Saving updates the stored search criteria only. Use &quot;Update study data&quot; to
          refresh listings from Hattrick.
        </p>
      </div>

      <p className="text-sm text-gray-600">
        Open{" "}
        <Link to="/market/analytics" className="text-blue-600 hover:underline">
          Analytics
        </Link>{" "}
        for charts, filters, and the full results table for one or more studies.
      </p>
    </div>
  );
}

function SkillRow({
  index,
  required,
  skillType,
  minValue,
  maxValue,
  onTypeChange,
  onMinChange,
  onMaxChange,
}: {
  index: 1 | 2 | 3 | 4;
  required?: boolean;
  skillType: number | undefined;
  minValue: number | undefined;
  maxValue: number | undefined;
  onTypeChange: (v: number | undefined) => void;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
}) {
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
