import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchPlayer, setPositionOverride } from "../lib/api";
import { SkillBar } from "../components/SkillBar";
import { PositionRatingsCard } from "../components/PositionRatingsCard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { skillLabel, specialtyLabel, SKILL_KEYS } from "../lib/skills";
import { formatMoney, formatNumber } from "../lib/format";
import { displayName } from "../lib/playerUtils";
import { lastMatchRoleLabel } from "../lib/matchRoleMapping";
import type { Player, PlayerChange } from "../lib/types";

interface Props {
  playerId: number;
  onClose: () => void;
}

const CHANGE_LABELS: Record<string, string> = {
  staminaSkill: "Stamina", keeperSkill: "Keeper", playmakerSkill: "Playmaking", scorerSkill: "Scoring",
  passingSkill: "Passing", wingerSkill: "Winger", defenderSkill: "Defending", setPiecesSkill: "Set Pieces",
  playerForm: "Form", experience: "Experience", loyalty: "Loyalty", leadership: "Leadership", tsi: "TSI", salary: "Salary",
};

function Chart({ title, dataKey, color, data }: { title: string; dataKey: "tsi" | "salary" | "trainingSkill"; color: string; data: Array<Record<string, number | string | null>> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3 h-48">
        {data.length < 2 ? <p className="grid h-full place-items-center text-sm text-slate-400">More refresh history is needed for a chart.</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -14, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={36} />
              <YAxis tick={{ fontSize: 10 }} width={42} />
              <Tooltip formatter={(value) => typeof value === "number" ? formatNumber(value) : "—"} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function changeValue(change: PlayerChange) {
  if (change.key === "salary") return `${formatMoney(Number(change.oldValue))} → ${formatMoney(Number(change.newValue))}`;
  if (change.key === "tsi") return `${formatNumber(Number(change.oldValue))} → ${formatNumber(Number(change.newValue))}`;
  if (change.key.endsWith("Skill") || change.key === "playerForm") return `${skillLabel(Number(change.oldValue))} → ${skillLabel(Number(change.newValue))}`;
  return `${change.oldValue} → ${change.newValue}`;
}

export function PlayerDetailPage({ playerId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [overrideSaving, setOverrideSaving] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["player", playerId], queryFn: () => fetchPlayer(playerId) });
  const player = data?.player;

  async function setOverride(value: string | null) {
    if (!player) return;
    setOverrideSaving(true);
    try {
      await setPositionOverride(player.playerId, value);
      await queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      await queryClient.invalidateQueries({ queryKey: ["players"] });
    } finally {
      setOverrideSaving(false);
    }
  }

  if (isLoading) return <div className="py-8"><LoadingSpinner message="Loading player detail…" /></div>;
  if (!player || error instanceof Error) return <ErrorAlert title="Player unavailable" message={error instanceof Error ? error.message : "Player not found"} />;

  const history = (data?.history ?? []).map((point) => ({ ...point, date: new Date(point.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));
  const trainingProgress = player.trainingEstimatedWeeks == null ? null : Math.min(100, ((player.trainingUnits ?? 0) / player.trainingEstimatedWeeks) * 100);

  return (
    <section className="mt-6 scroll-mt-6 rounded-2xl border border-indigo-200 bg-slate-50 p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Selected player</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{displayName(player)}</h3>
          <p className="mt-1 text-sm text-slate-600">{player.age}y {player.ageDays}d · {specialtyLabel(player.specialty) || "No specialty"} · #{player.playerNumber || "—"}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Close detail</button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TSI", formatNumber(player.tsi)], ["Wage", formatMoney(player.salary)], ["Est. value", player.estimatedValue == null ? "Not trained" : formatMoney(player.estimatedValue)], ["Last match", `${lastMatchRoleLabel(player.lastMatchPositionCode)}${player.lastMatchPlayedMinutes ? ` · ${player.lastMatchPlayedMinutes}′` : ""}`],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">All skills</h4>
          <div className="mt-3 space-y-2">{SKILL_KEYS.map(({ key, label }) => <SkillBar key={key} label={label} level={player[key as keyof Player] as number} />)}</div>
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex justify-between gap-4"><h4 className="text-sm font-semibold text-slate-800">Training progress</h4><span className="text-xs text-slate-500">{player.trainingFocusSkillKey?.replace("Skill", "") ?? "Training"}</span></div>
            {trainingProgress == null ? <p className="mt-3 text-sm text-slate-500">Set forecast values in Config to enable this estimate.</p> : <><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={trainingProgress >= 100 ? "h-full bg-amber-500" : "h-full bg-indigo-600"} style={{ width: `${trainingProgress}%` }} /></div><p className="mt-2 text-sm font-medium text-slate-700">{(player.trainingUnits ?? 0).toFixed(1)} / {player.trainingEstimatedWeeks!.toFixed(1)} effective weeks</p></>}
            <p className="mt-2 text-xs text-slate-500">Last focused skill-up: {player.trainingLastPopAt ? new Date(player.trainingLastPopAt).toLocaleDateString() : "not recorded"}</p>
          </div>
          <PositionRatingsCard player={player} onOverrideChange={setOverride} overrideSaving={overrideSaving} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Chart title="TSI history" dataKey="tsi" color="#4f46e5" data={history} />
        <Chart title="Wage history" dataKey="salary" color="#059669" data={history} />
        <Chart title="Training skill" dataKey="trainingSkill" color="#d97706" data={history} />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-800">Change history</h4>
        {(data?.allChanges.length ?? 0) === 0 ? <p className="mt-3 text-sm text-slate-500">No changes recorded yet.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2">{data!.allChanges.slice(0, 20).map((item) => <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">{CHANGE_LABELS[item.key] ?? item.key}</span><span className="ml-2 text-slate-500">{changeValue(item)}</span></div>)}</div>}
      </div>
    </section>
  );
}
