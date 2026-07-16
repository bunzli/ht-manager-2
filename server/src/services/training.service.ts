import type { PrismaClient } from "@prisma/client";
import type { ChppPlayer } from "../chpp/types";
import { getHtWeekStart } from "../lib/constants";
import { TRAINING_PROGRAMS, getTrainingProgram } from "../lib/trainingPrograms";
import { isValidForecastValue } from "../lib/trainingForecast";
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

export interface TrainingSettingsInput {
  trainingTypeId?: number;
  trainingFocusSkillKey?: string | null;
  estimateBaseWeeks?: number | null;
  estimateAgeIncrementWeeks?: number | null;
  estimateSkillIncrementWeeks?: number | null;
}

export function focusSkillForProgram(
  trainingTypeId: number | null,
  configuredFocus?: string | null,
): string | null {
  if (!trainingTypeId) return null;
  const program = getTrainingProgram(trainingTypeId);
  if (!program) return null;
  return configuredFocus && program.popSkillKeys.includes(configuredFocus)
    ? configuredFocus
    : program.popSkillKeys[0] ?? null;
}

export async function updateTrainingSettings(
  prisma: PrismaClient,
  input: TrainingSettingsInput,
) {
  const current = await getTeamSettings(prisma);
  const trainingTypeId = input.trainingTypeId ?? current.trainingTypeId;
  if (!trainingTypeId || !getTrainingProgram(trainingTypeId)) {
    throw new Error("A valid training program is required");
  }

  const focus = input.trainingFocusSkillKey !== undefined
    ? input.trainingFocusSkillKey
    : input.trainingTypeId !== undefined
      ? null
      : current.trainingFocusSkillKey;
  const program = getTrainingProgram(trainingTypeId)!;
  if (focus && !program.popSkillKeys.includes(focus)) {
    throw new Error("Training focus must be trained by the selected program");
  }
  const resolvedFocus = focusSkillForProgram(trainingTypeId, focus);

  const forecastEntries: Array<[keyof TrainingSettingsInput, boolean]> = [
    ["estimateBaseWeeks", false],
    ["estimateAgeIncrementWeeks", false],
    ["estimateSkillIncrementWeeks", false],
  ];
  for (const [key, allowZero] of forecastEntries) {
    const value = input[key];
    if (value !== undefined && value !== null && !isValidForecastValue(value, allowZero)) {
      throw new Error(`${key} must be a positive number`);
    }
  }

  return prisma.teamSettings.upsert({
    where: { id: 1 },
    update: {
      trainingTypeId,
      trainingFocusSkillKey: resolvedFocus,
      estimateBaseWeeks: input.estimateBaseWeeks,
      estimateAgeIncrementWeeks: input.estimateAgeIncrementWeeks,
      estimateSkillIncrementWeeks: input.estimateSkillIncrementWeeks,
    },
    create: {
      id: 1,
      trainingTypeId,
      trainingFocusSkillKey: resolvedFocus,
      estimateBaseWeeks: input.estimateBaseWeeks ?? null,
      estimateAgeIncrementWeeks: input.estimateAgeIncrementWeeks ?? null,
      estimateSkillIncrementWeeks: input.estimateSkillIncrementWeeks ?? null,
    },
  });
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
      trainingTypeId: defaultTrainingTypeId,
    },
    create: {
      playerId,
      weekStart,
      positionCode: lastMatch.positionCode,
      playedMinutes: lastMatch.playedMinutes,
      trainingTypeId: defaultTrainingTypeId,
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
  focusSkillKey?: string,
): Promise<PlayerTrainingProgress[]> {
  return getProgressForPlayers(
    prisma,
    playerIds,
    trainingTypeId,
    lastMatchByPlayer,
    focusSkillKey,
  );
}

export function progressMapByPlayerId(
  progress: PlayerTrainingProgress[],
): Map<number, PlayerTrainingProgress> {
  return new Map(progress.map((p) => [p.playerId, p]));
}
