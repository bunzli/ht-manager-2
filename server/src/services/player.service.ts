import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import { ChppPlayer } from "../chpp/types";
import { computePositionScores } from "../lib/positionRatings";
import { ONE_WEEK_MS } from "../lib/constants";
import {
  getTeamSettings,
  getTrainingProgress,
  lastMatchFromDetails,
  lastMatchFromPlayer,
  progressMapByPlayerId,
  recordWeekFromLastMatch,
  focusSkillForProgram,
} from "./training.service";
import { estimateTrainingWeeks } from "../lib/trainingForecast";
import { calculateTsiVariations } from "../lib/squadMetrics";
import { predictForPlayerDetails } from "./pricePredictor.service";
import { syncRecentMatches } from "./match.service";

const SKILL_FIELDS = [
  "staminaSkill",
  "keeperSkill",
  "playmakerSkill",
  "scorerSkill",
  "passingSkill",
  "wingerSkill",
  "defenderSkill",
  "setPiecesSkill",
] as const;

const TRACKED_FIELDS = [
  ...SKILL_FIELDS,
  "playerForm",
  "experience",
  "loyalty",
  "leadership",
  "tsi",
  "salary",
  "injuryLevel",
  "cards",
] as const;

function playerToDetailsData(p: ChppPlayer) {
  return {
    playerId: p.PlayerID,
    firstName: p.FirstName,
    nickName: p.NickName,
    lastName: p.LastName,
    playerNumber: p.PlayerNumber,
    age: p.Age,
    ageDays: p.AgeDays,
    genderId: p.GenderID,
    arrivalDate: p.ArrivalDate,
    tsi: p.TSI,
    playerForm: p.PlayerForm,
    experience: p.Experience,
    loyalty: p.Loyalty,
    motherClubBonus: p.MotherClubBonus,
    leadership: p.Leadership,
    salary: p.Salary,
    isAbroad: p.IsAbroad,
    agreeability: p.Agreeability,
    aggressiveness: p.Aggressiveness,
    honesty: p.Honesty,
    specialty: p.Specialty,
    countryId: p.CountryID,
    nationalTeamId: p.NationalTeamID,
    caps: p.Caps,
    capsU20: p.CapsU20,
    cards: p.Cards,
    injuryLevel: p.InjuryLevel,
    staminaSkill: p.StaminaSkill,
    keeperSkill: p.KeeperSkill,
    playmakerSkill: p.PlaymakerSkill,
    scorerSkill: p.ScorerSkill,
    passingSkill: p.PassingSkill,
    wingerSkill: p.WingerSkill,
    defenderSkill: p.DefenderSkill,
    setPiecesSkill: p.SetPiecesSkill,
    leagueGoals: p.LeagueGoals,
    cupGoals: p.CupGoals,
    friendliesGoals: p.FriendliesGoals,
    careerGoals: p.CareerGoals,
    careerHattricks: p.CareerHattricks,
    matchesCurrentTeam: p.MatchesCurrentTeam,
    goalsCurrentTeam: p.GoalsCurrentTeam,
    assistsCurrentTeam: p.AssistsCurrentTeam,
    careerAssists: p.CareerAssists,
    playerCategoryId: p.PlayerCategoryId,
    transferListed: p.TransferListed,
    lastMatchDate: p.LastMatch?.Date ?? null,
    lastMatchPositionCode: p.LastMatch?.PositionCode ?? null,
    lastMatchPlayedMinutes: p.LastMatch?.PlayedMinutes ?? 0,
  };
}

export function withPositionScores(details: Record<string, unknown>) {
  return {
    ...details,
    positionScores: computePositionScores({
      keeperSkill: details["keeperSkill"] as number,
      defenderSkill: details["defenderSkill"] as number,
      playmakerSkill: details["playmakerSkill"] as number,
      wingerSkill: details["wingerSkill"] as number,
      passingSkill: details["passingSkill"] as number,
      scorerSkill: details["scorerSkill"] as number,
      staminaSkill: details["staminaSkill"] as number,
      playerForm: details["playerForm"] as number,
      experience: details["experience"] as number,
      loyalty: details["loyalty"] as number,
      motherClubBonus: details["motherClubBonus"] as boolean,
      specialty: details["specialty"] as number,
    }),
  };
}

async function buildPlayersWithChanges(
  prisma: PrismaClient,
  playerIds: number[],
  detailsMap: Map<number, Record<string, unknown>>,
  since: Date,
) {
  const [snapshots, tsiChanges] = await Promise.all([
    prisma.playerDetails.findMany({
      where: { playerId: { in: playerIds } },
      select: { playerId: true, fetchedAt: true, tsi: true },
      orderBy: { fetchedAt: "desc" },
    }),
    prisma.playerChange.findMany({
      where: { playerId: { in: playerIds }, key: "tsi" },
      orderBy: { detectedAt: "desc" },
    }),
  ]);
  const snapshotsByPlayer = new Map<number, Array<{ fetchedAt: Date; tsi: number }>>();
  for (const snapshot of snapshots) {
    const rows = snapshotsByPlayer.get(snapshot.playerId) ?? [];
    rows.push(snapshot);
    snapshotsByPlayer.set(snapshot.playerId, rows);
  }
  const latestTsiChangeByPlayer = new Map<number, number>();
  for (const change of tsiChanges) {
    if (!latestTsiChangeByPlayer.has(change.playerId)) {
      latestTsiChangeByPlayer.set(
        change.playerId,
        Number(change.newValue) - Number(change.oldValue),
      );
    }
  }
  return Promise.all(
    playerIds.map(async (playerId) => {
      const details = detailsMap.get(playerId)!;
      const recentChanges = await prisma.playerChange.findMany({
        where: { playerId, detectedAt: { gte: since } },
        orderBy: { detectedAt: "desc" },
      });
      return {
        ...withPositionScores(details),
        ...calculateTsiVariations(
          details["tsi"] as number,
          snapshotsByPlayer.get(playerId) ?? [],
        ),
        tsiLatestChange: latestTsiChangeByPlayer.get(playerId) ?? null,
        recentChanges,
      };
    }),
  );
}

export async function getPlayersFromDb(
  prisma: PrismaClient,
) {
  const teamId = process.env.CHPP_TEAM_ID;
  if (!teamId) throw new Error("CHPP_TEAM_ID not configured");

  const trackings = await prisma.playerTracking.findMany({
    where: { isTracking: true },
    include: { latestDetails: true },
    orderBy: { playerId: "asc" },
  });

  if (trackings.length === 0) {
    return { teamId, teamName: "", fetchedAt: null, players: [] };
  }

  const weekAgo = new Date(Date.now() - ONE_WEEK_MS);
  const detailsMap = new Map(
    trackings
      .filter((t) => t.latestDetails !== null)
      .map((t) => [
        t.playerId,
        {
          ...(t.latestDetails as Record<string, unknown>),
          positionOverride: t.positionOverride ?? null,
        },
      ]),
  );
  const playerIds = [...detailsMap.keys()];
  let players = await buildPlayersWithChanges(
    prisma,
    playerIds,
    detailsMap,
    weekAgo,
  );

  const settings = await getTeamSettings(prisma);
  const activeTrainingTypeId = settings.trainingTypeId ?? 8;
  const focusSkillKey = focusSkillForProgram(
    activeTrainingTypeId,
    settings.trainingFocusSkillKey,
  );
  players = (await attachTrainingProgress(
    prisma,
    players as Record<string, unknown>[],
    activeTrainingTypeId,
    focusSkillKey,
    settings,
  )) as typeof players;

  const estimates = await predictForPlayerDetails(
    prisma,
    players.map((player) => ({
      playerId: (player as Record<string, unknown>)["playerId"] as number,
      details: player as never,
    })),
  );
  players = players.map((player) => ({
    ...player,
    estimatedValue:
      estimates.get((player as Record<string, unknown>)["playerId"] as number) ?? null,
  }));

  const fetchedAt = trackings.reduce(
    (latest, t) => (t.lastUpdatedAt > latest ? t.lastUpdatedAt : latest),
    trackings[0].lastUpdatedAt,
  );

  return {
    teamId,
    teamName: "",
    fetchedAt: fetchedAt.toISOString(),
    players,
  };
}

export async function refreshPlayersFromChpp(
  prisma: PrismaClient,
  chpp: ChppClient,
) {
  const teamId = process.env.CHPP_TEAM_ID;
  if (!teamId) throw new Error("CHPP_TEAM_ID not configured");

  const response = await chpp.getPlayers(teamId);
  const settings = await getTeamSettings(prisma);
  const defaultTrainingTypeId = settings.trainingTypeId ?? 8;
  const now = new Date();
  const currentPlayerIds = response.Players.map((player) => player.PlayerID);

  // The players endpoint is an authoritative snapshot of the current squad.
  // Keep historical records, but stop including players who have left the team
  // in the roster returned by getPlayersFromDb.
  await prisma.playerTracking.updateMany({
    where: {
      isTracking: true,
      playerId: { notIn: currentPlayerIds },
    },
    data: { isTracking: false },
  });

  for (const player of response.Players) {
    const previous = await prisma.playerDetails.findFirst({
      where: { playerId: player.PlayerID },
      orderBy: { fetchedAt: "desc" },
    });

    const detailsData = playerToDetailsData(player);
    const snapshot = await prisma.playerDetails.create({
      data: { ...detailsData, fetchedAt: now },
    });

    if (previous) {
      for (const field of TRACKED_FIELDS) {
        const oldVal = (previous as Record<string, unknown>)[field];
        const newVal = (snapshot as Record<string, unknown>)[field];
        if (String(oldVal) !== String(newVal)) {
          await prisma.playerChange.create({
            data: {
              playerId: player.PlayerID,
              detectedAt: now,
              key: field,
              oldValue: String(oldVal),
              newValue: String(newVal),
            },
          });
        }
      }
    }

    await prisma.playerTracking.upsert({
      where: { playerId: player.PlayerID },
      update: {
        lastUpdatedAt: now,
        latestDetailsId: snapshot.id,
        isTracking: true,
      },
      create: {
        playerId: player.PlayerID,
        lastUpdatedAt: now,
        latestDetailsId: snapshot.id,
        isTracking: true,
      },
    });

    const lastMatch = lastMatchFromPlayer(player);
    if (lastMatch) {
      await recordWeekFromLastMatch(
        prisma,
        player.PlayerID,
        lastMatch,
        defaultTrainingTypeId,
      );
    }

  }

  await syncRecentMatches(prisma, chpp, response.TeamID || teamId);

  const result = await getPlayersFromDb(prisma);
  return { ...result, teamId: response.TeamID, teamName: response.TeamName, fetchedAt: now.toISOString() };
}

async function attachTrainingProgress(
  prisma: PrismaClient,
  players: Record<string, unknown>[],
  trainingTypeId: number,
  focusSkillKey: string | null,
  settings: Awaited<ReturnType<typeof getTeamSettings>>,
) {
  const playerIds = players.map((p) => p.playerId as number);
  const lastMatchByPlayer = new Map(
    players.map((p) => [
      p.playerId as number,
      lastMatchFromDetails({
        lastMatchDate: (p.lastMatchDate as string | null) ?? null,
        lastMatchPositionCode: (p.lastMatchPositionCode as number | null) ?? null,
        lastMatchPlayedMinutes: (p.lastMatchPlayedMinutes as number) ?? 0,
      }),
    ]),
  );
  const progress = await getTrainingProgress(
    prisma,
    playerIds,
    trainingTypeId,
    lastMatchByPlayer,
    focusSkillKey ?? undefined,
  );
  const progressMap = progressMapByPlayerId(progress);
  return players.map((p) => {
    const prog = progressMap.get(p.playerId as number);
    if (!prog) return p;
    const focusSkill = focusSkillKey ? (p[focusSkillKey] as number) : 0;
    return {
      ...p,
      trainingUnits: prog.totalUnits,
      trainingFullWeeks: prog.fullWeeks,
      trainingPartial: prog.partialFraction,
      trainingLastPopAt: prog.lastPopAt,
      trainingFocusSkillKey: focusSkillKey,
      trainingEstimatedWeeks: focusSkillKey
        ? estimateTrainingWeeks(settings, p.age as number, p.ageDays as number, focusSkill)
        : null,
    };
  });
}

export async function getPlayerDetail(
  prisma: PrismaClient,
  playerId: number,
) {
  const tracking = await prisma.playerTracking.findUnique({
    where: { playerId },
    include: { latestDetails: true },
  });

  if (!tracking || !tracking.latestDetails) return null;

  const allChanges = await prisma.playerChange.findMany({
    where: { playerId },
    orderBy: { detectedAt: "desc" },
  });

  const weekAgo = new Date(Date.now() - ONE_WEEK_MS);
  const recentChanges = allChanges.filter(
    (c) => new Date(c.detectedAt) >= weekAgo,
  );

  const basePlayer = {
    ...withPositionScores(
      tracking.latestDetails as unknown as Record<string, unknown>,
    ),
    positionOverride: tracking.positionOverride ?? null,
    recentChanges,
  };

  const settings = await getTeamSettings(prisma);
  const activeTrainingTypeId = settings.trainingTypeId ?? 8;
  const focusSkillKey = focusSkillForProgram(
    activeTrainingTypeId,
    settings.trainingFocusSkillKey,
  );
  const playerWithProgress = (await attachTrainingProgress(
    prisma,
    [basePlayer],
    activeTrainingTypeId,
    focusSkillKey,
    settings,
  ))[0];
  const detailEstimates = await predictForPlayerDetails(prisma, [
    { playerId, details: playerWithProgress as never },
  ]);
  const player = {
    ...playerWithProgress,
    estimatedValue: detailEstimates.get(playerId) ?? null,
  };

  const snapshots = await prisma.playerDetails.findMany({
    where: { playerId },
    orderBy: { fetchedAt: "asc" },
    select: {
      fetchedAt: true,
      tsi: true,
      salary: true,
      keeperSkill: true,
      playmakerSkill: true,
      scorerSkill: true,
      passingSkill: true,
      wingerSkill: true,
      defenderSkill: true,
      setPiecesSkill: true,
    },
  });
  const history = snapshots.map((snapshot) => ({
    at: snapshot.fetchedAt.toISOString(),
    tsi: snapshot.tsi,
    salary: snapshot.salary,
    trainingSkill: focusSkillKey
      ? (snapshot as unknown as Record<string, number>)[focusSkillKey]
      : null,
  }));

  const appearances = await prisma.playerMatchAppearance.findMany({
    where: { playerId },
    include: { teamMatch: true },
    orderBy: { teamMatch: { matchDate: "desc" } },
    take: 10,
  });
  const configuredTeamId = Number(process.env.CHPP_TEAM_ID);
  const matches = appearances.map((appearance) => {
    const match = appearance.teamMatch;
    const isHome = match.homeTeamId === configuredTeamId;
    return {
      matchId: match.matchId,
      matchDate: match.matchDate.toISOString(),
      matchType: match.matchType,
      opponentTeamId: isHome ? match.awayTeamId : match.homeTeamId,
      opponentTeamName: isHome ? match.awayTeamName : match.homeTeamName,
      isHome,
      goalsFor: isHome ? match.homeGoals : match.awayGoals,
      goalsAgainst: isHome ? match.awayGoals : match.homeGoals,
      roleId: appearance.roleId,
      positionCode: appearance.positionCode,
      behaviour: appearance.behaviour,
      ratingStars: appearance.ratingStars,
    };
  });

  return {
    player,
    allChanges,
    history,
    matches,
  };
}

export async function setPositionOverride(
  prisma: PrismaClient,
  playerId: number,
  positionOverride: string | null,
) {
  const tracking = await prisma.playerTracking.findUnique({
    where: { playerId },
  });

  if (!tracking) return null;

  await prisma.playerTracking.update({
    where: { playerId },
    data: { positionOverride: positionOverride ?? null },
  });

  return { ok: true, positionOverride: positionOverride ?? null };
}
