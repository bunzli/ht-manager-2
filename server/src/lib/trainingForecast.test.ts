import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateTrainingWeeks } from "./trainingForecast";
import { calculateTsiVariations } from "./squadMetrics";

describe("estimateTrainingWeeks", () => {
  const config = {
    estimateBaseWeeks: 5,
    estimateAgeIncrementWeeks: 0.5,
    estimateSkillIncrementWeeks: 1,
  };

  it("uses exact Hattrick age days and the focused skill level", () => {
    assert.equal(estimateTrainingWeeks(config, 18, 56, 4), 8.75);
  });

  it("stays unavailable until all configuration values exist", () => {
    assert.equal(estimateTrainingWeeks({ ...config, estimateBaseWeeks: null }, 18, 0, 4), null);
  });
});

describe("calculateTsiVariations", () => {
  const now = new Date("2026-07-16T12:00:00Z").getTime();

  it("uses snapshots at or before each rolling baseline", () => {
    const result = calculateTsiVariations(1500, [
      { fetchedAt: new Date("2026-07-09T12:00:00Z"), tsi: 1200 },
      { fetchedAt: new Date("2026-06-15T12:00:00Z"), tsi: 1000 },
      { fetchedAt: new Date("2026-04-15T12:00:00Z"), tsi: 750 },
    ], now);
    assert.equal(result.tsiVariationWeek, 300);
    assert.equal(result.tsiVariationMonthPct, 50);
    assert.equal(result.tsiVariationQuarterPct, 100);
  });

  it("returns no percentage for a zero or missing baseline", () => {
    const result = calculateTsiVariations(1500, [
      { fetchedAt: new Date("2026-06-01T12:00:00Z"), tsi: 0 },
    ], now);
    assert.equal(result.tsiVariationWeek, 1500);
    assert.equal(result.tsiVariationMonthPct, null);
  });
});
