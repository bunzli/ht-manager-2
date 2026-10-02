import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchPlayer, setPositionOverride } from "../lib/api";
import { CARD_SKILLS } from "../components/PlayerCard";
import { SkillBar } from "../components/SkillBar";
import { PositionRatingsCard } from "../components/PositionRatingsCard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { skillLabel, specialtyLabel } from "../lib/skills";
import { formatMoney, formatNumber } from "../lib/format";
import { displayName } from "../lib/playerUtils";
import { lastMatchRoleLabel } from "../lib/matchRoleMapping";
import type { PlayerChange, PlayerHistoryPoint } from "../lib/types";

interface Props {
  playerId: number;
  onClose: () => void;
  positionRank?: number;
}

const CHANGE_LABELS: Record<string, string> = {
  staminaSkill: "Stamina",
  keeperSkill: "Keeper",
  playmakerSkill: "Playmaking",
  scorerSkill: "Scoring",
  passingSkill: "Passing",
  wingerSkill: "Winger",
  defenderSkill: "Defending",
  setPiecesSkill: "Set Pieces",
  playerForm: "Form",
  experience: "Experience",
  loyalty: "Loyalty",
  leadership: "Leadership",
  tsi: "TSI",
  salary: "Salary",
};

const MATCH_TYPE_LABELS: Record<number, string> = {
  1: "League",
  2: "Qualification",
  3: "Cup",
  4: "Friendly",
  5: "Friendly (cup rules)",
  7: "Hattrick Masters",
  8: "International friendly",
  9: "International friendly (cup rules)",
  10: "National team competition",
  11: "National team competition (cup rules)",
  12: "National team friendly",
  50: "Tournament league",
  51: "Tournament playoff",
  61: "Duel",
  62: "Ladder",
  80: "Preparation",
};

function matchResult(goalsFor: number | null, goalsAgainst: number | null) {
  if (goalsFor == null || goalsAgainst == null) {
    return { label: "—", style: "bg-gray-100 text-gray-600" };
  }
  if (goalsFor > goalsAgainst) {
    return { label: "W", style: "bg-emerald-100 text-emerald-700" };
  }
  if (goalsFor < goalsAgainst) {
    return { label: "L", style: "bg-rose-100 text-rose-700" };
  }
  return { label: "D", style: "bg-amber-100 text-amber-700" };
}

type ChartHistoryPoint = PlayerHistoryPoint & {
  date: string;
  timestamp: number;
};

function chartDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fillMonthlyTrainingGaps(data: ChartHistoryPoint[]) {
  if (data.length === 0) return data;

  const filled: ChartHistoryPoint[] = [];
  let lastKnownSkill: number | null = null;

  for (const point of data) {
    const pointDate = new Date(point.at);
    const normalizedPoint: ChartHistoryPoint = {
      ...point,
      trainingSkill: point.trainingSkill ?? lastKnownSkill,
    };
    const previous = filled.at(-1);

    if (previous) {
      const previousDate = new Date(previous.at);
      const month = new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 1, 12);
      while (month < pointDate) {
        filled.push({
          ...previous,
          at: month.toISOString(),
          date: chartDate(month),
          timestamp: month.getTime(),
          trainingSkill: lastKnownSkill,
        });
        month.setMonth(month.getMonth() + 1);
      }
    }

    filled.push(normalizedPoint);
    if (normalizedPoint.trainingSkill != null) {
      lastKnownSkill = normalizedPoint.trainingSkill;
    }
  }

  return filled;
}

function monthlyChartTicks(data: Array<{ timestamp: number }>) {
  const timestamps = data
    .map((point) => Number(point.timestamp))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (timestamps.length === 0) return [];

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const ticks = [first];
  const month = new Date(first);
  month.setDate(1);
  month.setHours(12, 0, 0, 0);
  month.setMonth(month.getMonth() + 1);

  while (month.getTime() < last) {
    ticks.push(month.getTime());
    month.setMonth(month.getMonth() + 1);
  }
  if (last !== first) ticks.push(last);
  return ticks;
}

function Chart({
  title,
  dataKey,
  color,
  data,
}: {
  title: string;
  dataKey: "tsi" | "salary" | "trainingSkill";
  color: string;
  data: ChartHistoryPoint[];
}) {
  const ticks = monthlyChartTicks(data);
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      <div className="mt-3 h-48 min-w-0">
        {data.length < 2 ? (
          <p className="grid h-full place-items-center text-sm text-gray-400">
            More refresh history is needed for a chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={ticks}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: number) => chartDate(new Date(value))}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} width={60} />
              <Tooltip
                labelFormatter={(value) => chartDate(new Date(Number(value)))}
                formatter={(value) => (typeof value === "number" ? formatNumber(value) : "—")}
              />
              <Line
                type={dataKey === "trainingSkill" ? "stepAfter" : "monotone"}
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function changeValue(change: PlayerChange) {
  if (change.key === "salary")
    return `${formatMoney(Number(change.oldValue))} → ${formatMoney(Number(change.newValue))}`;
  if (change.key === "tsi")
    return `${formatNumber(Number(change.oldValue))} → ${formatNumber(Number(change.newValue))}`;
  if (change.key.endsWith("Skill") || change.key === "playerForm")
    return `${skillLabel(Number(change.oldValue))} → ${skillLabel(Number(change.newValue))}`;
  return `${change.oldValue} → ${change.newValue}`;
}

export function PlayerDetailPage({ playerId, onClose, positionRank }: Props) {
  const queryClient = useQueryClient();
  const [overrideSaving, setOverrideSaving] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => fetchPlayer(playerId),
  });
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

  if (isLoading)
    return (
      <div className="py-8">
        <LoadingSpinner message="Loading player detail…" />
      </div>
    );
  if (!player || error instanceof Error)
    return (
      <ErrorAlert
        title="Player unavailable"
        message={error instanceof Error ? error.message : "Player not found"}
      />
    );

  const history = (data?.history ?? []).map((point) => {
    const date = new Date(point.at);
    return {
      ...point,
      date: chartDate(date),
      timestamp: date.getTime(),
    };
  });
  const trainingHistory = fillMonthlyTrainingGaps(history);
  const matches = data?.matches ?? [];
  const trainingProgress =
    player.trainingEstimatedWeeks == null
      ? null
      : Math.min(100, ((player.trainingUnits ?? 0) / player.trainingEstimatedWeeks) * 100);

  return (
    <section className="scroll-mt-6 rounded-xl border border-[#c6d6c7] bg-[#f7f9f7] p-3 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#507653]">
            Selected player
          </p>
          <h3 className="mt-1 break-words text-xl font-semibold tracking-tight text-gray-950">
            {displayName(player)}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {player.age}y {player.ageDays}d · {specialtyLabel(player.specialty) || "No specialty"} ·
            #{player.playerNumber || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Close detail
        </button>
      </div>

      {positionRank && (
        <p className="mt-3 text-sm text-[#507653]">Position rank: #{positionRank} in the squad</p>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TSI", formatNumber(player.tsi)],
          ["Wage", formatMoney(player.salary)],
          [
            "Est. value",
            player.estimatedValue == null ? "Not trained" : formatMoney(player.estimatedValue),
          ],
          [
            "Last match",
            `${lastMatchRoleLabel(player.lastMatchPositionCode)}${player.lastMatchPlayedMinutes ? ` · ${player.lastMatchPlayedMinutes}′` : ""}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-1 font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Latest TSI change", value: player.tsiLatestChange, percent: false },
          { label: "TSI · 7 days", value: player.tsiVariationWeek, percent: false },
          { label: "TSI · 30 days", value: player.tsiVariationMonthPct, percent: true },
          { label: "TSI · 90 days", value: player.tsiVariationQuarterPct, percent: true },
        ].map(({ label, value, percent }) => (
          <div key={label} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p
              className={`mt-1 font-semibold tabular-nums ${value == null || value === 0 ? "text-gray-600" : value < 0 ? "text-red-600" : "text-green-700"}`}
            >
              {value == null
                ? "—"
                : `${value > 0 ? "+" : ""}${percent ? `${value.toFixed(1)}%` : formatNumber(value)}`}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
          <h4 className="text-sm font-semibold text-gray-800">All skills</h4>
          <div className="mt-3 space-y-2">
            <SkillBar label="Form" level={player.playerForm} maxLevel={8} variant="hattrick" />
            <SkillBar label="Stamina" level={player.staminaSkill} maxLevel={8} variant="hattrick" />
            {CARD_SKILLS.map(({ key, label }) => (
              <SkillBar key={key} label={label} level={player[key]} variant="hattrick" />
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-5">
          <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <div className="flex justify-between gap-4">
              <h4 className="text-sm font-semibold text-gray-800">Training progress</h4>
              <span className="text-xs text-gray-500">
                {player.trainingFocusSkillKey?.replace("Skill", "") ?? "Training"}
              </span>
            </div>
            {trainingProgress == null ? (
              <p className="mt-3 text-sm text-gray-500">
                Set forecast values in Config to enable this estimate.
              </p>
            ) : (
              <>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={
                      trainingProgress >= 100 ? "h-full bg-amber-500" : "h-full bg-[#5B955F]"
                    }
                    style={{ width: `${trainingProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {(player.trainingUnits ?? 0).toFixed(1)} /{" "}
                  {player.trainingEstimatedWeeks!.toFixed(1)} effective weeks
                </p>
              </>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Last focused skill-up:{" "}
              {player.trainingLastPopAt
                ? new Date(player.trainingLastPopAt).toLocaleDateString()
                : "not recorded"}
            </p>
          </div>
          <PositionRatingsCard
            player={player}
            onOverrideChange={setOverride}
            overrideSaving={overrideSaving}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Chart title="TSI history" dataKey="tsi" color="#5B955F" data={history} />
        <Chart title="Wage history" dataKey="salary" color="#55745b" data={history} />
        <Chart
          title="Training skill"
          dataKey="trainingSkill"
          color="#737373"
          data={trainingHistory}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-gray-800">Last 10 matches</h4>
          <span className="text-xs text-gray-400">Synced with squad refresh</span>
        </div>
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            No match appearances stored yet. Refresh the squad to import recent matches.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Opponent</th>
                  <th className="px-4 py-2">Result</th>
                  <th className="px-4 py-2">Position</th>
                  <th className="px-4 py-2 text-right">Stars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map((match) => {
                  const result = matchResult(match.goalsFor, match.goalsAgainst);
                  return (
                    <tr key={match.matchId}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {new Date(match.matchDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{match.opponentTeamName}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {match.isHome ? "Home" : "Away"} ·{" "}
                          {MATCH_TYPE_LABELS[match.matchType] ?? `Match type ${match.matchType}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`mr-2 inline-grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${result.style}`}
                        >
                          {result.label}
                        </span>
                        <span className="font-semibold tabular-nums text-gray-700">
                          {match.goalsFor == null || match.goalsAgainst == null
                            ? "—"
                            : `${match.goalsFor}–${match.goalsAgainst}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {lastMatchRoleLabel(match.positionCode ?? match.roleId)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-amber-600">
                        {match.ratingStars == null ? "—" : `★ ${match.ratingStars.toFixed(1)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <h4 className="text-sm font-semibold text-gray-800">Change history</h4>
        {(data?.allChanges.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No changes recorded yet.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data!.allChanges.slice(0, 20).map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-semibold text-gray-700">
                  {CHANGE_LABELS[item.key] ?? item.key}
                </span>
                <span className="ml-2 text-gray-500">{changeValue(item)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
