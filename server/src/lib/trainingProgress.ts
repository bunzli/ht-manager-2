import type { PrismaClient } from "@prisma/client";
import {
  computeWeekUnits,
  getTrainingProgram,
  splitDumbbellUnits,
  type TrainingProgram,
} from "./trainingPrograms";
import { matchRoleToTrainingPosition } from "./matchRoleMapping";
import { getHtWeekStart } from "./constants";

export interface LastMatchSnapshot {
  date: string | null;
  positionCode: number | null;
  playedMinutes: number;
}

export interface PlayerTrainingProgress {
  playerId: number;
  totalUnits: number;
  fullWeeks: number;
  partialFraction: number;
  lastPopAt: string | null;
  lastMatch: LastMatchSnapshot;
}

export interface TrainingWeekRow {
  weekStart: Date;
  positionCode: number | null;
  playedMinutes: number;
}

export function weekUnitsForSnapshot(
  program: TrainingProgram,
  positionCode: number | null,
  playedMinutes: number,
): number {
  const position = positionCode != null ? matchRoleToTrainingPosition(positionCode) : null;
  return computeWeekUnits(program, position, playedMinutes);
}

export async function findLastPopAt(
  prisma: PrismaClient,
  playerId: number,
  popSkillKeys: string[],
): Promise<Date | null> {
  const pops = await prisma.playerChange.findMany({
    where: {
      playerId,
      key: { in: popSkillKeys },
    },
    orderBy: { detectedAt: "desc" },
  });

  for (const change of pops) {
    const oldVal = parseFloat(change.oldValue);
    const newVal = parseFloat(change.newValue);
    if (!Number.isNaN(oldVal) && !Number.isNaN(newVal) && newVal > oldVal) {
      return change.detectedAt;
    }
  }
  return null;
}

export function sumProgressSincePop(
  program: TrainingProgram,
  weeks: TrainingWeekRow[],
  lastPopAt: Date | null,
): number {
  const popWeekStart = lastPopAt ? getHtWeekStart(lastPopAt) : null;

  let total = 0;
  for (const week of weeks) {
    if (popWeekStart && week.weekStart <= popWeekStart) continue;
    total += weekUnitsForSnapshot(program, week.positionCode, week.playedMinutes);
  }
  return total;
}

export function buildPlayerProgress(
  playerId: number,
  program: TrainingProgram,
  weeks: TrainingWeekRow[],
  lastPopAt: Date | null,
  lastMatch: LastMatchSnapshot,
): PlayerTrainingProgress {
  const totalUnits = sumProgressSincePop(program, weeks, lastPopAt);
  const { fullWeeks, partialFraction } = splitDumbbellUnits(totalUnits);
  return {
    playerId,
    totalUnits,
    fullWeeks,
    partialFraction,
    lastPopAt: lastPopAt?.toISOString() ?? null,
    lastMatch,
  };
}

export async function getProgressForPlayers(
  prisma: PrismaClient,
  playerIds: number[],
  trainingTypeId: number,
  lastMatchByPlayer: Map<number, LastMatchSnapshot>,
): Promise<PlayerTrainingProgress[]> {
  const program = getTrainingProgram(trainingTypeId);
  if (!program) return [];

  const weeks = await prisma.playerTrainingWeek.findMany({
    where: { playerId: { in: playerIds } },
    orderBy: { weekStart: "asc" },
  });

  const weeksByPlayer = new Map<number, TrainingWeekRow[]>();
  for (const row of weeks) {
    const list = weeksByPlayer.get(row.playerId) ?? [];
    list.push({
      weekStart: row.weekStart,
      positionCode: row.positionCode,
      playedMinutes: row.playedMinutes,
    });
    weeksByPlayer.set(row.playerId, list);
  }

  const results: PlayerTrainingProgress[] = [];
  for (const playerId of playerIds) {
    const lastPopAt = await findLastPopAt(prisma, playerId, program.popSkillKeys);
    const playerWeeks = weeksByPlayer.get(playerId) ?? [];
    const lastMatch = lastMatchByPlayer.get(playerId) ?? {
      date: null,
      positionCode: null,
      playedMinutes: 0,
    };
    results.push(
      buildPlayerProgress(playerId, program, playerWeeks, lastPopAt, lastMatch),
    );
  }
  return results;
}
