import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeWeekUnits,
  getTrainingProgram,
  splitDumbbellUnits,
} from "./trainingPrograms";
import { matchRoleToTrainingPosition } from "./matchRoleMapping";
import { weekUnitsForSnapshot, sumProgressSincePop } from "./trainingProgress";
import { getHtWeekStart } from "./constants";

describe("matchRoleToTrainingPosition", () => {
  it("maps field roles", () => {
    assert.equal(matchRoleToTrainingPosition(100), "goalkeeper");
    assert.equal(matchRoleToTrainingPosition(108), "innerMidfielder");
    assert.equal(matchRoleToTrainingPosition(106), "winger");
  });

  it("returns null for captain", () => {
    assert.equal(matchRoleToTrainingPosition(18), null);
  });
});

describe("computeWeekUnits", () => {
  const playmaking = getTrainingProgram(8)!;

  it("gives full week for 90 minutes at IM", () => {
    const units = computeWeekUnits(playmaking, "innerMidfielder", 90);
    assert.equal(units, 1);
  });

  it("gives half week for winger at 90 minutes", () => {
    const units = computeWeekUnits(playmaking, "winger", 90);
    assert.equal(units, 0.5);
  });

  it("scales with minutes", () => {
    const units = computeWeekUnits(playmaking, "innerMidfielder", 45);
    assert.equal(units, 0.5);
  });

  it("defending gives full rate for wing back", () => {
    const defending = getTrainingProgram(3)!;
    assert.equal(computeWeekUnits(defending, "wingBack", 90), 1);
    assert.equal(computeWeekUnits(defending, "forward", 90), 0.5);
  });
});

describe("splitDumbbellUnits", () => {
  it("splits full and partial weeks", () => {
    const parts = splitDumbbellUnits(2.4);
    assert.equal(parts.fullWeeks, 2);
    assert.ok(Math.abs(parts.partialFraction - 0.4) < 1e-9);
  });
});

describe("sumProgressSincePop", () => {
  const program = getTrainingProgram(8)!;
  const week1 = getHtWeekStart(new Date("2026-05-14T12:00:00Z"));

  it("sums weeks after pop", () => {
    const popAt = new Date("2026-05-10T00:00:00Z");
    const total = sumProgressSincePop(
      program,
      [
        {
          weekStart: week1,
          positionCode: 108,
          playedMinutes: 90,
        },
      ],
      popAt,
    );
    assert.equal(total, 1);
  });

  it("excludes weeks before pop", () => {
    const popAt = new Date("2026-05-21T00:00:00Z");
    const total = sumProgressSincePop(
      program,
      [
        {
          weekStart: week1,
          positionCode: 108,
          playedMinutes: 90,
        },
      ],
      popAt,
    );
    assert.equal(total, 0);
  });
});

describe("weekUnitsForSnapshot", () => {
  it("uses position code from CHPP", () => {
    const program = getTrainingProgram(5)!;
    assert.equal(weekUnitsForSnapshot(program, 106, 90), 1);
    assert.equal(weekUnitsForSnapshot(program, 101, 90), 0.5);
  });
});
