export interface TrainingForecastConfig {
  estimateBaseWeeks: number | null;
  estimateAgeIncrementWeeks: number | null;
  estimateSkillIncrementWeeks: number | null;
}

export function estimateTrainingWeeks(
  config: TrainingForecastConfig,
  age: number,
  ageDays: number,
  focusSkill: number,
): number | null {
  const { estimateBaseWeeks, estimateAgeIncrementWeeks, estimateSkillIncrementWeeks } = config;
  if (
    estimateBaseWeeks == null ||
    estimateAgeIncrementWeeks == null ||
    estimateSkillIncrementWeeks == null
  ) {
    return null;
  }

  const exactAge = age + ageDays / 112;
  return Math.max(
    0,
    estimateBaseWeeks +
      (exactAge - 17) * estimateAgeIncrementWeeks +
      (focusSkill - 1) * estimateSkillIncrementWeeks,
  );
}

export function isValidForecastValue(value: unknown, allowZero = false): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (allowZero ? value >= 0 : value > 0)
  );
}
