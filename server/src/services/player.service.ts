import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import { ChppPlayer, ChppPlayerAvatar } from "../chpp/types";
import { computePositionScores } from "../lib/positionRatings";
import { ONE_WEEK_MS } from "../lib/constants";
import {
  getTeamSettings,
  getTrainingProgress,
  lastMatchFromDetails,
  lastMatchFromPlayer,
  progressMapByPlayerId,
  recordWeekFromLastMatch,
  syncTrainingTypeFromChpp,
} from "./training.service";

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

function playerToDetailsData(p: ChppPlayer, avatar?: ChppPlayerAvatar) {
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
    avatarBackground: avatar?.backgroundImage ?? "",
    avatarLayers: avatar ? JSON.stringify(avatar.layers) : "[]",
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
  return Promise.all(
    playerIds.map(async (playerId) => {
      const details = detailsMap.get(playerId)!;
      const recentChanges = await prisma.playerChange.findMany({
        where: { playerId, detectedAt: { gte: since } },
        orderBy: { detectedAt: "desc" },
      });
      return { ...withPositionScores(details), recentChanges };
    }),
  );
}

export async function getPlayersFromDb(
  prisma: PrismaClient,
  trainingTypeId?: number,
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

  if (trainingTypeId) {
    players = (await attachTrainingProgress(
      prisma,
      players as Record<string, unknown>[],
      trainingTypeId,
    )) as typeof players;
  }

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

  const [response, avatarsResponse] = await Promise.all([
    chpp.getPlayers(teamId),
    chpp.getAvatars(teamId).catch(() => null),
    syncTrainingTypeFromChpp(prisma, chpp, teamId),
  ]);
  const settings = await getTeamSettings(prisma);
  const defaultTrainingTypeId = settings.trainingTypeId ?? 8;
  const now = new Date();

  const avatarMap = new Map<number, ChppPlayerAvatar>();
  if (avatarsResponse) {
    for (const a of avatarsResponse.players) {
      avatarMap.set(a.playerId, a);
    }
  }

  const playersWithChanges = [];

  for (const player of response.Players) {
    const previous = await prisma.playerDetails.findFirst({
      where: { playerId: player.PlayerID },
      orderBy: { fetchedAt: "desc" },
    });

    const avatar = avatarMap.get(player.PlayerID);
    const detailsData = playerToDetailsData(player, avatar);
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

    const recentChanges = await prisma.playerChange.findMany({
      where: {
        playerId: player.PlayerID,
        detectedAt: { gte: new Date(now.getTime() - ONE_WEEK_MS) },
      },
      orderBy: { detectedAt: "desc" },
    });

    playersWithChanges.push({
      ...withPositionScores(snapshot as unknown as Record<string, unknown>),
      recentChanges,
    });
  }

  return {
    teamId: response.TeamID,
    teamName: response.TeamName,
    fetchedAt: now.toISOString(),
    players: playersWithChanges,
  };
}

async function attachTrainingProgress(
  prisma: PrismaClient,
  players: Record<string, unknown>[],
  trainingTypeId: number,
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
  );
  const progressMap = progressMapByPlayerId(progress);
  return players.map((p) => {
    const prog = progressMap.get(p.playerId as number);
    if (!prog) return p;
    return {
      ...p,
      trainingUnits: prog.totalUnits,
      trainingFullWeeks: prog.fullWeeks,
      trainingPartial: prog.partialFraction,
      trainingLastPopAt: prog.lastPopAt,
    };
  });
}

export async function getPlayerDetail(
  prisma: PrismaClient,
  playerId: number,
  trainingTypeId?: number,
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

  const player = trainingTypeId
    ? (await attachTrainingProgress(prisma, [basePlayer], trainingTypeId))[0]
    : basePlayer;

  return {
    player,
    allChanges,
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
