import { PrismaClient, type YouthSnapshot } from "@prisma/client";
import type { ChppClient } from "../chpp/client";
import type { ChppYouthPlayer, YouthLastMatch, YouthSkills } from "../chpp/youth";
import { detectYouthChanges } from "../lib/youthChanges";
import { selectPlayerAppearances } from "./match.service";

type YouthClient = Pick<
  ChppClient,
  "getYouthAcademy" | "getYouthPlayers" | "getYouthMatchesArchive" | "getYouthMatchLineup"
>;
const refreshing = new Set<number>();
const DAY = 86_400_000;

export class YouthRefreshBusy extends Error {}

export function configuredSeniorTeamId() {
  const id = Number(process.env.CHPP_TEAM_ID);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("CHPP_TEAM_ID not configured");
  return id;
}

export function decodeYouthSnapshot(
  snapshot: YouthSnapshot,
  youthPlayerId: number,
): ChppYouthPlayer {
  return {
    youthPlayerId,
    firstName: snapshot.firstName,
    nickName: snapshot.nickName,
    lastName: snapshot.lastName,
    age: snapshot.age,
    ageDays: snapshot.ageDays,
    specialty: snapshot.specialty,
    skills: JSON.parse(snapshot.skills) as YouthSkills,
    lastMatch: snapshot.lastMatch ? (JSON.parse(snapshot.lastMatch) as YouthLastMatch) : null,
  };
}

export async function getYouthSquad(prisma: PrismaClient, seniorTeamId = configuredSeniorTeamId()) {
  const state = await prisma.youthClubStatus.findUnique({ where: { seniorTeamId } });
  const academy = state?.youthTeamId
    ? await prisma.youthAcademy.findUnique({ where: { youthTeamId: state.youthTeamId } })
    : null;
  const players = await prisma.youthPlayer.findMany({
    where: { academy: { seniorTeamId } },
    include: {
      snapshots: { orderBy: [{ fetchedAt: "desc" }, { id: "desc" }], take: 1 },
      changes: { orderBy: [{ detectedAt: "desc" }, { id: "desc" }], take: 3 },
    },
    orderBy: { youthPlayerId: "asc" },
  });
  return {
    status: !state ? "not_synced" : academy ? "ready" : "no_academy",
    academy: academy ? { youthTeamId: academy.youthTeamId, name: academy.name } : null,
    fetchedAt: academy?.fetchedAt ?? state?.checkedAt ?? null,
    players: players.flatMap((player) => {
      const snapshot = player.snapshots[0];
      return snapshot
        ? [
            {
              ...decodeYouthSnapshot(snapshot, player.youthPlayerId),
              youthTeamId: player.youthTeamId,
              isActive: player.isActive,
              archivedAt: player.archivedAt,
              fetchedAt: snapshot.fetchedAt,
              recentChanges: player.changes,
              lastChangeAt: player.changes[0]?.detectedAt ?? null,
            },
          ]
        : [];
    }),
  };
}

export async function getYouthPlayer(
  prisma: PrismaClient,
  youthPlayerId: number,
  seniorTeamId = configuredSeniorTeamId(),
) {
  const player = await prisma.youthPlayer.findFirst({
    where: { youthPlayerId, academy: { seniorTeamId } },
    include: {
      snapshots: { orderBy: [{ fetchedAt: "asc" }, { id: "asc" }] },
      changes: { orderBy: [{ detectedAt: "desc" }, { id: "desc" }] },
    },
    orderBy: { id: "desc" },
  });
  if (!player || !player.snapshots.length) return null;
  const latest = player.snapshots[player.snapshots.length - 1];
  const appearances = await prisma.youthAppearance.findMany({
    where: { youthPlayerId, match: { youthTeamId: player.youthTeamId } },
    include: { match: true },
    orderBy: { match: { matchDate: "desc" } },
  });
  return {
    player: {
      ...decodeYouthSnapshot(latest, youthPlayerId),
      youthTeamId: player.youthTeamId,
      isActive: player.isActive,
      archivedAt: player.archivedAt,
      fetchedAt: latest.fetchedAt,
    },
    history: player.snapshots.map((snapshot) => ({
      at: snapshot.fetchedAt,
      skills: JSON.parse(snapshot.skills) as YouthSkills,
    })),
    changes: player.changes,
    matches: appearances.map(({ match, ...appearance }) => {
      const home = match.homeTeamId === player.youthTeamId;
      return {
        matchId: match.matchId,
        matchDate: match.matchDate,
        matchType: match.matchType,
        opponentTeamName: home ? match.awayTeamName : match.homeTeamName,
        isHome: home,
        goalsFor: home ? match.homeGoals : match.awayGoals,
        goalsAgainst: home ? match.awayGoals : match.homeGoals,
        roleId: appearance.roleId,
        positionCode: appearance.positionCode,
        behaviour: appearance.behaviour,
        ratingStars: appearance.ratingStars,
        playedMinutes: appearance.playedMinutes,
      };
    }),
  };
}

export async function storeYouthRoster(
  prisma: PrismaClient,
  academy: { youthTeamId: number; seniorTeamId: number; name: string },
  players: ChppYouthPlayer[],
  now: Date,
) {
  await prisma.$transaction(
    async (tx) => {
      const previousAcademy = await tx.youthAcademy.findUnique({
        where: { youthTeamId: academy.youthTeamId },
      });
      await tx.youthAcademy.upsert({
        where: { youthTeamId: academy.youthTeamId },
        create: { ...academy, fetchedAt: now },
        update: { name: academy.name, fetchedAt: now },
      });
      const oldPlayers = await tx.youthPlayer.findMany({
        where: { academy: { seniorTeamId: academy.seniorTeamId } },
        include: { snapshots: { orderBy: [{ fetchedAt: "desc" }, { id: "desc" }], take: 1 } },
      });
      const currentIds = new Set(players.map((p) => p.youthPlayerId));
      for (const old of oldPlayers) {
        if (
          !old.isActive ||
          (old.youthTeamId === academy.youthTeamId && currentIds.has(old.youthPlayerId))
        )
          continue;
        await tx.youthPlayer.update({
          where: { id: old.id },
          data: { isActive: false, archivedAt: now },
        });
        await tx.youthChange.create({
          data: {
            playerId: old.id,
            detectedAt: now,
            kind: "roster_departure",
            key: "membership",
            oldValue: "active",
            newValue: "archived",
          },
        });
      }
      for (const current of players) {
        const old = oldPlayers.find(
          (p) => p.youthTeamId === academy.youthTeamId && p.youthPlayerId === current.youthPlayerId,
        );
        const tracking = await tx.youthPlayer.upsert({
          where: {
            youthTeamId_youthPlayerId: {
              youthTeamId: academy.youthTeamId,
              youthPlayerId: current.youthPlayerId,
            },
          },
          create: { youthTeamId: academy.youthTeamId, youthPlayerId: current.youthPlayerId },
          update: { isActive: true, archivedAt: null },
        });
        const { youthPlayerId: _id, skills, lastMatch, ...identity } = current;
        await tx.youthSnapshot.create({
          data: {
            ...identity,
            playerId: tracking.id,
            fetchedAt: now,
            skills: JSON.stringify(skills),
            lastMatch: lastMatch ? JSON.stringify(lastMatch) : null,
          },
        });
        const previous = old?.snapshots[0]
          ? decodeYouthSnapshot(old.snapshots[0], current.youthPlayerId)
          : null;
        for (const change of detectYouthChanges(previous, current)) {
          await tx.youthChange.create({
            data: { ...change, playerId: tracking.id, detectedAt: now },
          });
        }
        if ((!old && previousAcademy?.fetchedAt) || old?.isActive === false) {
          await tx.youthChange.create({
            data: {
              playerId: tracking.id,
              detectedAt: now,
              kind: "roster_arrival",
              key: "membership",
              oldValue: old ? "archived" : null,
              newValue: "active",
            },
          });
        }
      }
      await tx.youthClubStatus.upsert({
        where: { seniorTeamId: academy.seniorTeamId },
        create: {
          seniorTeamId: academy.seniorTeamId,
          youthTeamId: academy.youthTeamId,
          checkedAt: now,
        },
        update: { youthTeamId: academy.youthTeamId, checkedAt: now },
      });
    },
    { timeout: 20_000 },
  );
}

export async function syncYouthMatches(
  prisma: PrismaClient,
  chpp: YouthClient,
  youthTeamId: number,
  players: ChppYouthPlayer[],
  now: Date,
) {
  const academy = await prisma.youthAcademy.findUniqueOrThrow({ where: { youthTeamId } });
  const start = academy.matchesSyncedAt
    ? new Date(academy.matchesSyncedAt.getTime() - 7 * DAY)
    : new Date(now.getTime() - 90 * DAY);
  const matchIds = new Set<number>();
  // Small overlapping date windows avoid CHPP's 50-match response limit.
  for (let from = start; from < now; from = new Date(from.getTime() + 45 * DAY)) {
    const end = new Date(Math.min(from.getTime() + 45 * DAY, now.getTime()));
    const archive = await chpp.getYouthMatchesArchive(youthTeamId, from, end);
    for (const match of archive.Matches) {
      const matchDate = new Date(match.MatchDate);
      if (
        match.MatchID <= 0 ||
        Number.isNaN(matchDate.getTime()) ||
        (match.HomeTeamID !== youthTeamId && match.AwayTeamID !== youthTeamId)
      )
        throw new Error("Invalid CHPP youth archive match");
      if (matchDate > now || match.HomeGoals == null || match.AwayGoals == null) continue;
      const data = {
        matchDate,
        matchType: match.MatchType,
        homeTeamId: match.HomeTeamID,
        homeTeamName: match.HomeTeamName,
        awayTeamId: match.AwayTeamID,
        awayTeamName: match.AwayTeamName,
        homeGoals: match.HomeGoals,
        awayGoals: match.AwayGoals,
      };
      await prisma.youthMatch.upsert({
        where: { youthTeamId_matchId: { youthTeamId, matchId: match.MatchID } },
        create: { ...data, youthTeamId, matchId: match.MatchID },
        update: data,
      });
      matchIds.add(match.MatchID);
    }
  }
  let lineupsStored = 0;
  const failures: { matchId: number; message: string }[] = [];
  const pending = await prisma.youthMatch.findMany({
    where: { youthTeamId, lineupFetchedAt: null },
    orderBy: { matchDate: "desc" },
  });
  for (const match of pending) {
    try {
      const lineup = await chpp.getYouthMatchLineup(match.matchId, youthTeamId);
      const appearances = selectPlayerAppearances(lineup.Players);
      if (!appearances.length) throw new Error("CHPP returned no youth appearances");
      await prisma.$transaction([
        ...appearances.map((p) => {
          const lastMatch = players.find(
            (player) => player.youthPlayerId === p.PlayerID,
          )?.lastMatch;
          const data = {
            roleId: p.RoleID,
            positionCode: p.PositionCode,
            behaviour: p.Behaviour,
            ratingStars: p.RatingStars,
            playedMinutes: lastMatch?.matchId === match.matchId ? lastMatch.playedMinutes : null,
          };
          return prisma.youthAppearance.upsert({
            where: {
              youthMatchId_youthPlayerId: { youthMatchId: match.id, youthPlayerId: p.PlayerID },
            },
            create: { ...data, youthMatchId: match.id, youthPlayerId: p.PlayerID },
            update: data,
          });
        }),
        prisma.youthMatch.update({ where: { id: match.id }, data: { lineupFetchedAt: now } }),
      ]);
      lineupsStored++;
    } catch (error) {
      failures.push({
        matchId: match.matchId,
        message: error instanceof Error ? error.message : "Lineup unavailable",
      });
    }
  }
  // A newer roster response can supply exact minutes for a previously stored match.
  for (const player of players) {
    if (player.lastMatch?.playedMinutes == null) continue;
    await prisma.youthAppearance.updateMany({
      where: {
        youthPlayerId: player.youthPlayerId,
        match: { youthTeamId, matchId: player.lastMatch.matchId },
      },
      data: { playedMinutes: player.lastMatch.playedMinutes },
    });
  }
  if (!failures.length)
    await prisma.youthAcademy.update({ where: { youthTeamId }, data: { matchesSyncedAt: now } });
  return { matchesFound: matchIds.size, lineupsStored, failures };
}

export async function refreshYouthSquad(
  prisma: PrismaClient,
  chpp: YouthClient,
  seniorTeamId = configuredSeniorTeamId(),
) {
  if (refreshing.has(seniorTeamId))
    throw new YouthRefreshBusy("Youth squad refresh already in progress");
  refreshing.add(seniorTeamId);
  try {
    const academy = await chpp.getYouthAcademy(seniorTeamId);
    const now = new Date();
    if (!academy) {
      await prisma.$transaction(async (tx) => {
        const departures = await tx.youthPlayer.findMany({
          where: { isActive: true, academy: { seniorTeamId } },
        });
        for (const player of departures) {
          await tx.youthChange.create({
            data: {
              playerId: player.id,
              detectedAt: now,
              kind: "roster_departure",
              key: "membership",
              oldValue: "active",
              newValue: "archived",
            },
          });
        }
        await tx.youthPlayer.updateMany({
          where: { isActive: true, academy: { seniorTeamId } },
          data: { isActive: false, archivedAt: now },
        });
        await tx.youthClubStatus.upsert({
          where: { seniorTeamId },
          create: { seniorTeamId, checkedAt: now },
          update: { youthTeamId: null, checkedAt: now },
        });
      });
      return {
        ...(await getYouthSquad(prisma, seniorTeamId)),
        sync: { playersStored: 0, matchesFound: 0, lineupsStored: 0, failures: [] },
      };
    }
    const players = await chpp.getYouthPlayers(academy.youthTeamId);
    await storeYouthRoster(prisma, academy, players, now);
    let matches;
    try {
      matches = await syncYouthMatches(prisma, chpp, academy.youthTeamId, players, now);
    } catch (error) {
      matches = {
        matchesFound: 0,
        lineupsStored: 0,
        failures: [
          {
            matchId: null,
            message: error instanceof Error ? error.message : "Youth match archive unavailable",
          },
        ],
      };
    }
    return {
      ...(await getYouthSquad(prisma, seniorTeamId)),
      sync: { playersStored: players.length, ...matches },
    };
  } finally {
    refreshing.delete(seniorTeamId);
  }
}
