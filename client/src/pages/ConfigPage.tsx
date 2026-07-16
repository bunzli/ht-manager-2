import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrainingProgramSelect } from "../components/training/TrainingProgramSelect";
import { fetchTrainingSettings, updateTrainingSettings } from "../lib/trainingApi";
import { TRAINING_PROGRAMS } from "../lib/trainingPrograms";
import { ErrorAlert } from "../components/ui/ErrorAlert";

const FOCUS_LABELS: Record<string, string> = {
  scorerSkill: "Scoring",
  setPiecesSkill: "Set pieces",
};

export function ConfigPage() {
  const client = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["training", "settings"],
    queryFn: fetchTrainingSettings,
  });
  const [programId, setProgramId] = useState(8);
  const [focus, setFocus] = useState<string | null>(null);
  const [baseWeeks, setBaseWeeks] = useState("");
  const [ageIncrement, setAgeIncrement] = useState("");
  const [skillIncrement, setSkillIncrement] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setProgramId(settings.trainingTypeId ?? 8);
    setFocus(settings.trainingFocusSkillKey);
    setBaseWeeks(settings.estimateBaseWeeks?.toString() ?? "");
    setAgeIncrement(settings.estimateAgeIncrementWeeks?.toString() ?? "");
    setSkillIncrement(settings.estimateSkillIncrementWeeks?.toString() ?? "");
  }, [settings]);

  const program = TRAINING_PROGRAMS.find((item) => item.id === programId);
  const focusOptions = program?.popSkillKeys ?? [];
  const hasForecast = baseWeeks !== "" && ageIncrement !== "" && skillIncrement !== "";

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await updateTrainingSettings({
        trainingTypeId: programId,
        trainingFocusSkillKey: focusOptions.length > 1 ? focus : undefined,
        estimateBaseWeeks: baseWeeks === "" ? null : Number(baseWeeks),
        estimateAgeIncrementWeeks: ageIncrement === "" ? null : Number(ageIncrement),
        estimateSkillIncrementWeeks: skillIncrement === "" ? null : Number(skillIncrement),
      });
      await client.invalidateQueries({ queryKey: ["training"] });
      await client.invalidateQueries({ queryKey: ["players"] });
      setMessage("Configuration saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save configuration");
    } finally {
      setSaving(false);
    }
  }

  if (error instanceof Error) return <ErrorAlert title="Config unavailable" message={error.message} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Team setup</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Training configuration</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          This configuration is the source of truth for squad progress. Update it when you deliberately change your training plan.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Active training</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Training program
            <TrainingProgramSelect
              value={programId}
              onChange={(id) => {
                setProgramId(id);
                const next = TRAINING_PROGRAMS.find((item) => item.id === id);
                setFocus(next?.popSkillKeys[0] ?? null);
              }}
            />
          </label>
          {focusOptions.length > 1 && (
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Forecast focus
              <select
                value={focus ?? focusOptions[0]}
                onChange={(event) => setFocus(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {focusOptions.map((key) => <option key={key} value={key}>{FOCUS_LABELS[key] ?? key}</option>)}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Skill-up forecast</h3>
        <p className="mt-1 text-sm text-slate-600">
          Effective weeks = base at 17.00 years / level 1 + age increment + skill-level increment.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Base weeks", baseWeeks, setBaseWeeks, "At age 17, skill 1"],
            ["Weeks / age year", ageIncrement, setAgeIncrement, "Uses exact age days"],
            ["Weeks / skill level", skillIncrement, setSkillIncrement, "For the focused skill"],
          ].map(([label, value, setter, hint]) => (
            <label key={label as string} className="grid gap-1.5 text-sm font-medium text-slate-700">
              {label as string}
              <input
                type="number"
                min="0"
                step="0.1"
                value={value as string}
                onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-xs font-normal text-slate-500">{hint as string}</span>
            </label>
          ))}
        </div>
        {!hasForecast && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Enter all three values to enable squad forecast bars.</p>}
      </section>

      {message && <p className={`rounded-lg px-3 py-2 text-sm ${message === "Configuration saved." ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
      <button type="button" onClick={save} disabled={saving || isLoading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Saving…" : "Save configuration"}
      </button>
    </div>
  );
}
