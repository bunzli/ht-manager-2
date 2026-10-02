import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getSquadTsiHistory } from "../services/squadHistory.service";

describe("squad TSI history", () => {
  let directory: string;
  let prisma: PrismaClient;

  before(async () => {
    directory = await mkdtemp(join(tmpdir(), "ht-squad-history-"));
    prisma = new PrismaClient({ datasourceUrl: `file:${join(directory, "test.db")}` });
    // Only columns used by this read query are needed in the isolated test DB.
    await prisma.$executeRawUnsafe(
      "CREATE TABLE player_tracking (id INTEGER PRIMARY KEY, playerId INTEGER, isTracking BOOLEAN)",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TABLE player_details (id INTEGER PRIMARY KEY, playerId INTEGER, fetchedAt DATETIME, tsi INTEGER)",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TABLE transfer_player (id INTEGER PRIMARY KEY, playerDetailsId INTEGER)",
    );
  });

  after(async () => {
    await prisma?.$disconnect();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("returns an empty history before the first squad refresh", async () => {
    assert.deepEqual(await getSquadTsiHistory(prisma), []);
  });

  it("sums the roster at each refresh, preserves former players, and excludes market snapshots", async () => {
    await prisma.$executeRaw`INSERT INTO player_tracking (playerId, isTracking) VALUES (1, false), (2, true), (4, true)`;
    const first = new Date("2026-04-01T12:00:00Z");
    const second = new Date("2026-04-08T12:00:00Z");
    const marketAt = new Date("2026-04-09T12:00:00Z");
    // Insert out of order to verify chronological output.
    await prisma.$executeRaw`INSERT INTO player_details (id, playerId, fetchedAt, tsi) VALUES (1, 2, ${second}, 250)`;
    await prisma.$executeRaw`INSERT INTO player_details (id, playerId, fetchedAt, tsi) VALUES (2, 1, ${first}, 100), (3, 2, ${first}, 200)`;
    await prisma.$executeRaw`INSERT INTO player_details (id, playerId, fetchedAt, tsi) VALUES (4, 3, ${first}, 99999)`;
    // A new signing contributes zero TSI but still counts toward squad size.
    await prisma.$executeRaw`INSERT INTO player_details (id, playerId, fetchedAt, tsi) VALUES (5, 4, ${second}, 0)`;
    // A market study also includes a squad player; it must not create a total.
    await prisma.$executeRaw`INSERT INTO player_details (id, playerId, fetchedAt, tsi) VALUES (6, 2, ${marketAt}, 99999), (7, 2, ${second}, 99999)`;
    await prisma.$executeRaw`INSERT INTO transfer_player (playerDetailsId) VALUES (6), (7)`;
    assert.deepEqual(await getSquadTsiHistory(prisma), [
      { at: first.toISOString(), tsi: 300, playerCount: 2 },
      { at: second.toISOString(), tsi: 250, playerCount: 2 },
    ]);
  });
});
