import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  fetchYouthPlayer,
  youthPlayerName,
  youthChangeLabel,
  YOUTH_SKILLS,
  type YouthSkillKey,
} from "../lib/youthApi";
import { specialtyLabel } from "../lib/skills";
import { lastMatchRoleLabel } from "../lib/matchRoleMapping";
import { YouthSkillsTable } from "../components/YouthSkillsTable";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";

export function YouthPlayerPage() {
  const { id } = useParams();
  const playerId = Number(id);
  const query = useQuery({
    queryKey: ["youth", "player", playerId],
    queryFn: () => fetchYouthPlayer(playerId),
    enabled: Number.isSafeInteger(playerId) && playerId > 0,
  });
  const [skill, setSkill] = useState<YouthSkillKey>("playmaker");
  if (!Number.isSafeInteger(playerId) || playerId <= 0)
    return <ErrorAlert message="Invalid youth player ID" />;
  if (query.isLoading) return <LoadingSpinner />;
  if (query.error) return <ErrorAlert message={query.error.message} />;
  if (!query.data) return null;
  const { player, history, changes, matches } = query.data;
  const chart = history.map((point) => ({
    timestamp: new Date(point.at).getTime(),
    current: point.skills[skill].current,
    potential: point.skills[skill].potential,
  }));
  const dateLabel = (value: number) =>
    new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="space-y-5">
      <Link to="/youth" className="inline-block py-2 text-sm text-[#426e46] hover:underline">
        ← Youth Squad
      </Link>
      <section className="rounded-xl border border-[#ddd] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{youthPlayerName(player)}</h1>
          {!player.isActive && (
            <span className="rounded bg-[#eee] px-2 py-1 text-xs">Archived</span>
          )}
        </div>
        <p className="mt-2 text-sm text-[#777]">
          {player.age} years, {player.ageDays} days ·{" "}
          {player.specialty ? specialtyLabel(player.specialty) : "Specialty unknown / none"}
        </p>
        <p className="mt-1 text-xs text-[#777]">
          Updated {new Date(player.fetchedAt).toLocaleString()}
          {player.archivedAt && ` · Archived ${new Date(player.archivedAt).toLocaleDateString()}`}
        </p>
        {player.lastMatch && (
          <p className="mt-3 text-sm text-[#555]">
            Last match: {new Date(player.lastMatch.date).toLocaleDateString()} ·{" "}
            {lastMatchRoleLabel(player.lastMatch.positionCode)} ·{" "}
            {player.lastMatch.ratingStars == null
              ? "Stars unavailable"
              : `${player.lastMatch.ratingStars} ★`}
            {player.lastMatch.playedMinutes != null && ` · ${player.lastMatch.playedMinutes} min`}
          </p>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-[#ddd] bg-white p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Skills & potential</h2>
          <YouthSkillsTable skills={player.skills} />
          <p className="mt-3 text-xs text-[#777]">
            ? = unknown · Levels are observed values from Hattrick.
          </p>
        </section>
        <section className="min-w-0 rounded-xl border border-[#ddd] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Skill development</h2>
            <label className="sr-only" htmlFor="youth-chart-skill">
              Skill to chart
            </label>
            <select
              id="youth-chart-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value as YouthSkillKey)}
              className="min-h-11 rounded-lg border border-[#ddd] px-2 text-sm"
            >
              {YOUTH_SKILLS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 h-64 min-w-0">
            {chart.length < 2 ? (
              <p className="grid h-full place-items-center text-center text-sm text-[#777]">
                Refresh again to build a development history.
              </p>
            ) : !chart.some((point) => point.current != null || point.potential != null) ? (
              <p className="grid h-full place-items-center text-center text-sm text-[#777]">
                No revealed levels for this skill yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ left: -20, right: 15, top: 10 }}>
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={dateLabel}
                    tick={{ fontSize: 11 }}
                    minTickGap={35}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (max: number) => Math.max(8, max)]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip labelFormatter={(value) => new Date(Number(value)).toLocaleString()} />
                  <Legend />
                  <Line
                    dataKey="current"
                    name="Current"
                    stroke="#5B955F"
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="potential"
                    name="Potential"
                    stroke="#b09031"
                    strokeDasharray="5 4"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-xs text-[#777]">
            History starts at the first refresh. Missing levels remain unknown.
          </p>
        </section>
      </div>
      <section className="rounded-xl border border-[#ddd] bg-white p-4 sm:p-5">
        <h2 className="font-semibold">Match performances</h2>
        {matches.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <caption className="sr-only">Youth match performances</caption>
              <thead className="text-xs text-[#777]">
                <tr>
                  {["Date", "Opponent", "Result", "Position", "Stars", "Minutes"].map((label) => (
                    <th scope="col" key={label} className="pb-3 pr-4 font-normal">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.matchId} className="border-t border-[#eee]">
                    <td className="py-3 pr-4">{new Date(match.matchDate).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      {match.opponentTeamName}{" "}
                      <span className="text-xs text-[#999]">({match.isHome ? "H" : "A"})</span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {match.goalsFor == null || match.goalsAgainst == null
                        ? "—"
                        : `${match.goalsFor > match.goalsAgainst ? "W" : match.goalsFor < match.goalsAgainst ? "L" : "D"} ${match.goalsFor}–${match.goalsAgainst}`}
                    </td>
                    <td className="py-3 pr-4">
                      {lastMatchRoleLabel(match.positionCode ?? match.roleId)}
                    </td>
                    <td className="py-3 pr-4 font-medium tabular-nums text-[#426e46]">
                      {match.ratingStars == null ? "—" : `${match.ratingStars} ★`}
                    </td>
                    <td className="py-3 tabular-nums">{match.playedMinutes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#777]">No imported match performances yet.</p>
        )}
        <p className="mt-3 text-xs text-[#777]">
          Minutes appear only when available for that match.
        </p>
      </section>
      <section className="rounded-xl border border-[#ddd] bg-white p-4 sm:p-5">
        <h2 className="font-semibold">Discoveries & changes</h2>
        <p className="mt-1 text-xs text-[#777]">
          Dates indicate when a change was detected at refresh.
        </p>
        {changes.length ? (
          <ul className="mt-4 divide-y divide-[#eee]">
            {changes.map((change) => (
              <li
                key={change.id}
                className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"
              >
                <span className={change.kind === "improvement" ? "text-[#426e46]" : "text-[#555]"}>
                  {youthChangeLabel(change)}
                </span>
                <time dateTime={change.detectedAt} className="shrink-0 text-xs text-[#777]">
                  {new Date(change.detectedAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#777]">
            No changes detected since the first observation.
          </p>
        )}
      </section>
    </div>
  );
}
