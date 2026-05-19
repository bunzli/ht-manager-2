import type { PrismaClient } from "@prisma/client";
import type { ChppClient } from "../chpp/client";
import type { ChppPlayer } from "../chpp/types";
import { getHtWeekStart } from "../lib/constants";
import { TRAINING_PROGRAMS, getTrainingProgram } from "../lib/trainingPrograms";
import {
  getProgressForPlayers,
  weekUnitsForSnapshot,
  type LastMatchSnapshot,
  type PlayerTrainingProgress,
} from "../lib/trainingProgress";

export async function getTeamSettings(prisma: PrismaClient) {
  const settings = await prisma.teamSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return settings;
}

export async function updateTeamTrainingType(
  prisma: PrismaClient,
  trainingTypeId: number,
) {
  if (!getTrainingProgram(trainingTypeId)) {
    throw new Error(`Unknown training type: ${trainingTypeId}`);
  }
  return prisma.teamSettings.upsert({
    where: { id: 1 },
    update: { trainingTypeId },
    create: { id: 1, trainingTypeId },
  });
}

export async function syncTrainingTypeFromChpp(
  prisma: PrismaClient,
  chpp: ChppClient,
  teamId: string | number,
) {
  try {
    const training = await chpp.getTraining(teamId);
    if (getTrainingProgram(training.TrainingType)) {
      await updateTeamTrainingType(prisma, training.TrainingType);
      return training.TrainingType;
    }
  } catch (err) {
    console.warn("[training] Could not fetch CHPP training.xml:", err);
  }
  return null;
}

export function lastMatchFromPlayer(player: ChppPlayer): LastMatchSnapshot | null {
  if (!player.LastMatch || player.LastMatch.MatchId === 0) return null;
  return {
    date: player.LastMatch.Date || null,
    positionCode: player.LastMatch.PositionCode,
    playedMinutes: player.LastMatch.PlayedMinutes,
  };
}

export function lastMatchFromDetails(details: {
  lastMatchDate: string | null;
  lastMatchPositionCode: number | null;
  lastMatchPlayedMinutes: number;
}): LastMatchSnapshot {
  return {
    date: details.lastMatchDate,
    positionCode: details.lastMatchPositionCode,
    playedMinutes: details.lastMatchPlayedMinutes,
  };
}

export async function recordWeekFromLastMatch(
  prisma: PrismaClient,
  playerId: number,
  lastMatch: LastMatchSnapshot,
  defaultTrainingTypeId: number,
) {
  if (!lastMatch.date || lastMatch.playedMinutes <= 0) return;

  const program = getTrainingProgram(defaultTrainingTypeId);
  if (!program) return;

  const matchDate = new Date(lastMatch.date);
  if (Number.isNaN(matchDate.getTime())) return;

  const weekStart = getHtWeekStart(matchDate);
  const newUnits = weekUnitsForSnapshot(
    program,
    lastMatch.positionCode,
    lastMatch.playedMinutes,
  );

  const existing = await prisma.playerTrainingWeek.findUnique({
    where: {
      playerId_weekStart: { playerId, weekStart },
    },
  });

  if (existing) {
    const existingUnits = weekUnitsForSnapshot(
      program,
      existing.positionCode,
      existing.playedMinutes,
    );
    if (newUnits <= existingUnits) return;
  }

  await prisma.playerTrainingWeek.upsert({
    where: {
      playerId_weekStart: { playerId, weekStart },
    },
    update: {
      positionCode: lastMatch.positionCode,
      playedMinutes: lastMatch.playedMinutes,
    },
    create: {
      playerId,
      weekStart,
      positionCode: lastMatch.positionCode,
      playedMinutes: lastMatch.playedMinutes,
    },
  });
}

export function listPrograms() {
  return TRAINING_PROGRAMS.map((p) => ({
    id: p.id,
    label: p.label,
    popSkillKeys: p.popSkillKeys,
    rates: p.rates,
  }));
}

export async function getTrainingProgress(
  prisma: PrismaClient,
  playerIds: number[],
  trainingTypeId: number,
  lastMatchByPlayer: Map<number, LastMatchSnapshot>,
): Promise<PlayerTrainingProgress[]> {
  return getProgressForPlayers(
    prisma,
    playerIds,
    trainingTypeId,
    lastMatchByPlayer,
  );
}

export function progressMapByPlayerId(
  progress: PlayerTrainingProgress[],
): Map<number, PlayerTrainingProgress> {
  return new Map(progress.map((p) => [p.playerId, p]));
}
