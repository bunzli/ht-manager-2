import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTrainingComparison, type TrainingSnapshot } from "./trainingComparison";

function snapshot(at: string, overrides: Partial<TrainingSnapshot> = {}): TrainingSnapshot {
  return {
    fetchedAt: new Date(at),
    tsi: 1000,
    playerForm: 6,
    staminaSkill: 7,
    keeperSkill: 1,
    defenderSkill: 5,
    playmakerSkill: 10,
    wingerSkill: 4,
    passingSkill: 5,
    scorerSkill: 3,
    setPiecesSkill: 2,
    ...overrides,
  };
}

describe("previous training period comparison", () => {
  it("compares to the latest snapshot of the preceding week, ignoring same-week refreshes", () => {
    const current = snapshot("2026-10-02T12:00:00Z", {
      tsi: 1300,
      playerForm: 8,
      staminaSkill: 6,
      playmakerSkill: 11,
    });
    const previous = snapshot("2026-09-30T18:00:00Z");
    const history = [
      snapshot("2026-10-02T10:00:00Z", { tsi: 1200, playerForm: 7 }),
      snapshot("2026-09-25T12:00:00Z", { tsi: 800 }),
      previous,
    ];
    const result = calculateTrainingComparison(current, history);
    assert.equal(result.trainingBaselineAt, previous.fetchedAt.toISOString());
    assert.equal(result.tsiVariationTraining, 300);
    assert.deepEqual(result.trainingChanges, {
      playerForm: { oldValue: "6", newValue: "8" },
      staminaSkill: { oldValue: "7", newValue: "6" },
      playmakerSkill: { oldValue: "10", newValue: "11" },
    });
  });

  it("distinguishes unchanged TSI from a missing baseline", () => {
    const current = snapshot("2026-10-02T12:00:00Z");
    assert.equal(
      calculateTrainingComparison(current, [snapshot("2026-09-30T12:00:00Z")]).tsiVariationTraining,
      0,
    );
    assert.deepEqual(calculateTrainingComparison(current, []), {
      trainingBaselineAt: null,
      tsiVariationTraining: null,
      trainingChanges: {},
    });
  });

  it("does not label an older snapshot as the previous period when a week was missed", () => {
    const current = snapshot("2026-10-02T12:00:00Z");
    assert.equal(
      calculateTrainingComparison(current, [snapshot("2026-09-23T12:00:00Z")]).tsiVariationTraining,
      null,
    );
  });

  it("switches periods at Thursday midnight and anchors stale data to its snapshot date", () => {
    const previous = snapshot("2026-09-30T23:59:59Z", { tsi: 1500 });
    const current = snapshot("2026-10-01T00:00:00Z");
    assert.equal(calculateTrainingComparison(current, [previous]).tsiVariationTraining, -500);
    assert.equal(
      calculateTrainingComparison(previous, [snapshot("2026-09-23T23:59:59Z")])
        .tsiVariationTraining,
      500,
    );
  });
});
