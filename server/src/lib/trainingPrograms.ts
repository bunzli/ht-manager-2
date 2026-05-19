export type TrainingPosition =
  | "goalkeeper"
  | "centralDefender"
  | "wingBack"
  | "innerMidfielder"
  | "winger"
  | "forward";

export type PositionRate = 0 | 0.5 | 1;

export interface TrainingProgram {
  id: number;
  label: string;
  /** Skill keys used to detect a pop (reset dumbbell progress). */
  popSkillKeys: string[];
  /** Position → training rate for this program. */
  rates: Record<TrainingPosition, PositionRate>;
}

const ZERO_RATES: Record<TrainingPosition, PositionRate> = {
  goalkeeper: 0,
  centralDefender: 0,
  wingBack: 0,
  innerMidfielder: 0,
  winger: 0,
  forward: 0,
};

function rates(
  overrides: Partial<Record<TrainingPosition, PositionRate>>,
): Record<TrainingPosition, PositionRate> {
  return { ...ZERO_RATES, ...overrides };
}

/** All outfield positions at half rate (trainable but reduced). */
const ALL_OUTFIELD_HALF: Partial<Record<TrainingPosition, PositionRate>> = {
  centralDefender: 0.5,
  wingBack: 0.5,
  innerMidfielder: 0.5,
  winger: 0.5,
  forward: 0.5,
};

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 2,
    label: "Set pieces",
    popSkillKeys: ["setPiecesSkill"],
    rates: rates({
      goalkeeper: 1,
      centralDefender: 1,
      wingBack: 1,
      innerMidfielder: 1,
      winger: 1,
      forward: 1,
    }),
  },
  {
    id: 3,
    label: "Defending",
    popSkillKeys: ["defenderSkill"],
    rates: rates({
      ...ALL_OUTFIELD_HALF,
      centralDefender: 1,
      wingBack: 1,
    }),
  },
  {
    id: 4,
    label: "Scoring",
    popSkillKeys: ["scorerSkill"],
    rates: rates({
      ...ALL_OUTFIELD_HALF,
      forward: 1,
    }),
  },
  {
    id: 5,
    label: "Winger (crossing)",
    popSkillKeys: ["wingerSkill"],
    rates: rates({
      winger: 1,
      wingBack: 0.5,
    }),
  },
  {
    id: 6,
    label: "Scoring + set pieces",
    popSkillKeys: ["scorerSkill", "setPiecesSkill"],
    rates: rates({
      ...ALL_OUTFIELD_HALF,
      forward: 1,
      goalkeeper: 1,
      centralDefender: 1,
      wingBack: 1,
      innerMidfielder: 1,
      winger: 1,
    }),
  },
  {
    id: 7,
    label: "Short passes",
    popSkillKeys: ["passingSkill"],
    rates: rates({
      innerMidfielder: 1,
      winger: 1,
      forward: 1,
      centralDefender: 0.5,
      wingBack: 0.5,
    }),
  },
  {
    id: 8,
    label: "Playmaking",
    popSkillKeys: ["playmakerSkill"],
    rates: rates({
      innerMidfielder: 1,
      winger: 0.5,
    }),
  },
  {
    id: 9,
    label: "Goalkeeping",
    popSkillKeys: ["keeperSkill"],
    rates: rates({ goalkeeper: 1 }),
  },
  {
    id: 10,
    label: "Through passes",
    popSkillKeys: ["passingSkill"],
    rates: rates({
      centralDefender: 1,
      wingBack: 1,
      innerMidfielder: 1,
      winger: 1,
      forward: 0.5,
    }),
  },
  {
    id: 11,
    label: "Defensive positions",
    popSkillKeys: ["defenderSkill"],
    rates: rates({
      goalkeeper: 1,
      centralDefender: 1,
      wingBack: 1,
      innerMidfielder: 1,
      winger: 1,
      forward: 0.5,
    }),
  },
  {
    id: 12,
    label: "Wing attacks",
    popSkillKeys: ["wingerSkill"],
    rates: rates({
      winger: 1,
      forward: 1,
      centralDefender: 0.5,
      wingBack: 0.5,
      innerMidfielder: 0.5,
    }),
  },
];

export const TRAINING_PROGRAM_MAP = new Map(
  TRAINING_PROGRAMS.map((p) => [p.id, p]),
);

export function getTrainingProgram(id: number): TrainingProgram | undefined {
  return TRAINING_PROGRAM_MAP.get(id);
}

export function getPositionRate(
  program: TrainingProgram,
  position: TrainingPosition | null,
  playedMinutes: number,
): PositionRate {
  if (!position || playedMinutes <= 0) return 0;
  return program.rates[position];
}

export function computeWeekUnits(
  program: TrainingProgram,
  position: TrainingPosition | null,
  playedMinutes: number,
): number {
  const rate = getPositionRate(program, position, playedMinutes);
  if (rate === 0) return 0;
  const effectiveMinutes = Math.min(Math.max(playedMinutes, 0), 90) * rate;
  return effectiveMinutes / 90;
}

export interface DumbbellParts {
  totalUnits: number;
  fullWeeks: number;
  partialFraction: number;
}

export function splitDumbbellUnits(totalUnits: number): DumbbellParts {
  const clamped = Math.max(0, totalUnits);
  const fullWeeks = Math.floor(clamped);
  const partialFraction = Math.round((clamped - fullWeeks) * 1000) / 1000;
  return { totalUnits: clamped, fullWeeks, partialFraction };
}
