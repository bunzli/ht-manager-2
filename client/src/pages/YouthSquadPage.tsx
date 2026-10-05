import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchYouthSquad,
  refreshYouthSquad,
  youthPlayerName,
  youthChangeLabel,
} from "../lib/youthApi";
import { specialtyLabel } from "../lib/skills";
import { YouthSkillsTable } from "../components/YouthSkillsTable";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";

export function YouthSquadPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["youth", "squad"], queryFn: fetchYouthSquad });
  const refresh = useMutation({
    mutationFn: refreshYouthSquad,
    onSuccess: (result) => {
      queryClient.setQueryData(["youth", "squad"], result);
      void queryClient.invalidateQueries({ queryKey: ["youth", "player"] });
    },
  });
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("age");
  const data = query.data;
  const activeCount = data?.players.filter((p) => p.isActive).length ?? 0;
  const archiveCount = data?.players.filter((p) => !p.isActive).length ?? 0;
  const players = (data?.players ?? [])
    .filter(
      (p) =>
        p.isActive !== archived && youthPlayerName(p).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "name") return youthPlayerName(a).localeCompare(youthPlayerName(b));
      if (sort === "changes")
        return (
          (b.lastChangeAt ? new Date(b.lastChangeAt).getTime() : 0) -
            (a.lastChangeAt ? new Date(a.lastChangeAt).getTime() : 0) ||
          a.youthPlayerId - b.youthPlayerId
        );
      return a.age - b.age || a.ageDays - b.ageDays || a.youthPlayerId - b.youthPlayerId;
    });
  const error = refresh.error ?? query.error;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#ddd] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-[#507653]">My academy</p>
            <h1 className="mt-1 text-2xl font-semibold">{data?.academy?.name ?? "Youth Squad"}</h1>
            {data?.fetchedAt && (
              <p className="mt-1 text-xs text-[#777]">
                Updated {new Date(data.fetchedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            disabled={query.isLoading || refresh.isPending}
            onClick={() => refresh.mutate()}
            className="min-h-11 rounded-lg bg-[#5B955F] px-4 text-sm font-medium text-white hover:bg-[#4a7c4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B955F] disabled:opacity-50"
          >
            {refresh.isPending ? "Fetching…" : "Refresh youth squad"}
          </button>
        </div>
        <div className="mt-4 flex gap-6 border-t border-[#eee] pt-4 text-sm">
          <span>
            <strong>{activeCount}</strong> active players
          </span>
          <span>
            <strong>{archiveCount}</strong> archived players
          </span>
        </div>
      </section>
      {error && <ErrorAlert message={error.message} />}
      {refresh.data && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${refresh.data.sync.failures.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#bdd6bf] bg-[#edf5ed] text-[#426e46]"}`}
        >
          {refresh.data.sync.playersStored} players updated · {refresh.data.sync.lineupsStored} new
          match lineups
          {refresh.data.sync.failures.length > 0 && (
            <p className="mt-1">
              Some match data could not be imported. Saved squad data is available; refresh again to
              retry.
            </p>
          )}
        </div>
      )}
      {query.isLoading ? (
        <LoadingSpinner />
      ) : (
        data && (
          <>
            {data.status === "not_synced" && (
              <p className="rounded-xl border border-[#ddd] bg-white p-5 text-sm text-[#777]">
                Refresh your youth squad to start tracking skills, discoveries and match
                performances.
              </p>
            )}
            {data.status === "no_academy" && (
              <p className="rounded-xl border border-[#ddd] bg-white p-5 text-sm text-[#777]">
                Your configured club has no youth academy. Previously tracked players remain
                available in the archive.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="youth-roster">
                Player status
              </label>
              <select
                id="youth-roster"
                value={archived ? "archived" : "active"}
                onChange={(e) => setArchived(e.target.value === "archived")}
                className="min-h-11 rounded-lg border border-[#ddd] bg-white px-3 text-sm"
              >
                <option value="active">Active ({activeCount})</option>
                <option value="archived">Archived ({archiveCount})</option>
              </select>
              <label className="sr-only" htmlFor="youth-search">
                Search players
              </label>
              <input
                id="youth-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players…"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#ddd] px-3 text-sm"
              />
              <label className="sr-only" htmlFor="youth-sort">
                Sort players
              </label>
              <select
                id="youth-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-11 rounded-lg border border-[#ddd] bg-white px-3 text-sm"
              >
                <option value="age">Age</option>
                <option value="name">Name</option>
                <option value="changes">Latest changes</option>
              </select>
            </div>
            {!players.length && data.status !== "not_synced" && (
              <p className="py-5 text-center text-sm text-[#777]">
                {search
                  ? "No players match your search."
                  : archived
                    ? "No archived players yet."
                    : data.status === "ready"
                      ? "Your youth squad is empty."
                      : "No active youth players."}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {players.map((player) => (
                <article
                  key={`${player.youthTeamId}-${player.youthPlayerId}`}
                  className="rounded-xl border border-[#ddd] bg-white p-4 shadow-sm"
                >
                  <Link
                    className="font-semibold text-[#426e46] hover:underline"
                    to={`/youth/players/${player.youthPlayerId}`}
                  >
                    {youthPlayerName(player)}
                  </Link>
                  <p className="mt-1 text-xs text-[#777]">
                    {player.age} years, {player.ageDays} days ·{" "}
                    {player.specialty
                      ? specialtyLabel(player.specialty)
                      : "Specialty unknown / none"}
                  </p>
                  {!player.isActive && (
                    <p className="mt-1 text-xs text-[#777]">
                      Archived{" "}
                      {player.archivedAt && new Date(player.archivedAt).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-4">
                    <YouthSkillsTable skills={player.skills} compact />
                  </div>
                  <div className="mt-3 border-t border-[#eee] pt-3 text-xs text-[#777]">
                    {player.lastMatch ? (
                      <p>
                        Last match: {new Date(player.lastMatch.date).toLocaleDateString()} ·{" "}
                        {player.lastMatch.ratingStars == null
                          ? "Stars unavailable"
                          : `${player.lastMatch.ratingStars} ★`}
                      </p>
                    ) : (
                      <p>No match performance yet.</p>
                    )}
                    {player.recentChanges?.length ? (
                      <ul className="mt-2 space-y-1">
                        {player.recentChanges.map((change) => (
                          <li key={change.id}>
                            {youthChangeLabel(change)}{" "}
                            <span className="text-[#999]">
                              · {new Date(change.detectedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2">No changes detected since tracking began.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
