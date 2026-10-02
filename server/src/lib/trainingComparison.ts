import { getHtWeekStart, ONE_WEEK_MS } from "./constants";

export const TRAINING_COMPARISON_FIELDS = [
  "playerForm",
  "staminaSkill",
  "keeperSkill",
  "defenderSkill",
  "playmakerSkill",
  "wingerSkill",
  "passingSkill",
  "scorerSkill",
  "setPiecesSkill",
] as const;

type SkillKey = (typeof TRAINING_COMPARISON_FIELDS)[number];
export type TrainingSnapshot = { fetchedAt: Date; tsi: number } & Record<SkillKey, number>;

export function calculateTrainingComparison(
  current: TrainingSnapshot,
  snapshots: TrainingSnapshot[],
) {
  const weekStart = getHtWeekStart(current.fetchedAt).getTime();
  const previousWeekStart = weekStart - ONE_WEEK_MS;
  // Keep the baseline stable across refreshes in the same training week.
  const baseline = snapshots
    .filter((snapshot) => {
      const at = snapshot.fetchedAt.getTime();
      return at >= previousWeekStart && at < weekStart;
    })
    .reduce<TrainingSnapshot | null>(
      (latest, snapshot) => (!latest || snapshot.fetchedAt > latest.fetchedAt ? snapshot : latest),
      null,
    );
  const trainingChanges: Partial<Record<SkillKey, { oldValue: string; newValue: string }>> = {};
  if (baseline) {
    for (const key of TRAINING_COMPARISON_FIELDS) {
      if (current[key] !== baseline[key]) {
        trainingChanges[key] = {
          oldValue: String(baseline[key]),
          newValue: String(current[key]),
        };
      }
    }
  }
  return {
    trainingBaselineAt: baseline?.fetchedAt.toISOString() ?? null,
    tsiVariationTraining: baseline ? current.tsi - baseline.tsi : null,
    trainingChanges,
  };
}
