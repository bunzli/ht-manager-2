import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import {
  parseYouthAcademy,
  parseYouthPlayers,
  YOUTH_SKILLS,
  type ChppYouthPlayer,
} from "../chpp/youth";
import { detectYouthChanges } from "./youthChanges";
import {
  getYouthSquad,
  getYouthPlayer,
  refreshYouthSquad,
  storeYouthRoster,
  syncYouthMatches,
  YouthRefreshBusy,
} from "../services/youth.service";

const academy = { youthTeamId: 20, seniorTeamId: 10, name: "Youth FC" };
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});
function fixture(id = 99) {
  const skills = YOUTH_SKILLS.map((key) => {
    const name = `${key[0].toUpperCase()}${key.slice(1)}Skill`;
    return `<${name} IsAvailable="true" IsMaxReached="false">0</${name}><${name}Max IsAvailable="false">0</${name}Max>`;
  }).join("");
  return `<HattrickData><PlayerList><YouthPlayer><YouthPlayerID>${id}</YouthPlayerID><FirstName>Ada</FirstName><LastName>Striker</LastName><Age>16</Age><AgeDays>45</AgeDays><Specialty>0</Specialty><OwningYouthTeam><YouthTeamID>20</YouthTeamID></OwningYouthTeam><PlayerSkills>${skills}</PlayerSkills><LastMatch><YouthMatchID>101</YouthMatchID><Date>2026-10-04 18:00:00</Date><PositionCode>111</PositionCode><PlayedMinutes>72</PlayedMinutes><Rating>6.5</Rating></LastMatch></YouthPlayer></PlayerList></HattrickData>`;
}
function player(id = 99): ChppYouthPlayer {
  return parseYouthPlayers(parser.parse(fixture(id)), academy.youthTeamId)[0];
}
function client(players = [player()]) {
  return {
    getYouthAcademy: async () => academy as typeof academy | null,
    getYouthPlayers: async () => players,
    getYouthMatchesArchive: async () => ({
      TeamID: 20,
      TeamName: "Youth FC",
      Matches: [
        {
          MatchID: 101,
          MatchDate: "2026-10-04T16:00:00Z",
          MatchType: 100,
          HomeTeamID: 20,
          HomeTeamName: "Youth FC",
          AwayTeamID: 30,
          AwayTeamName: "Visitors",
          HomeGoals: 2,
          AwayGoals: 1,
        },
      ],
    }),
    getYouthMatchLineup: async () => ({
      MatchID: 101,
      TeamID: 20,
      TeamName: "Youth FC",
      Players: [
        {
          PlayerID: 99,
          PlayerName: "Ada Striker",
          RoleID: 111,
          PositionCode: 111,
          Behaviour: 0,
          RatingStars: 6.5,
        },
      ],
    }),
  };
}

describe("youth XML and change detection", () => {
  it("requests full Stockholm timestamps so today's completed matches are included", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      assert.ok(!String(input).includes("+"), "OAuth timestamp spaces must use percent encoding");
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("isYouth"), "true");
      assert.equal(url.searchParams.get("LastMatchDate"), "2026-10-05 16:00:00");
      assert.equal(url.searchParams.get("FirstMatchDate"), "2026-09-05 16:00:00");
      return new Response(
        "<HattrickData><Team><TeamID>20</TeamID><MatchList /></Team></HattrickData>",
      );
    };
    try {
      const chpp = new ChppClient({
        consumerKey: "test",
        consumerSecret: "test",
        accessToken: "test",
        accessTokenSecret: "test",
      });
      assert.equal(
        (
          await chpp.getYouthMatchesArchive(
            20,
            new Date("2026-09-05T14:00:00Z"),
            new Date("2026-10-05T14:00:00Z"),
          )
        ).Matches.length,
        0,
      );
    } finally {
      globalThis.fetch = original;
    }
  });
  it("uses the youth lineup source and field roles when PositionCode is absent", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      assert.equal(new URL(String(input)).searchParams.get("sourceSystem"), "youth");
      return new Response(
        "<HattrickData><MatchID>101</MatchID><Team><TeamID>20</TeamID><Lineup><Player><PlayerID>99</PlayerID><RoleID>111</RoleID><RatingStars>0</RatingStars></Player></Lineup></Team></HattrickData>",
      );
    };
    try {
      const chpp = new ChppClient({
        consumerKey: "test",
        consumerSecret: "test",
        accessToken: "test",
        accessTokenSecret: "test",
      });
      assert.equal((await chpp.getYouthMatchLineup(101, 20)).Players[0].PositionCode, 111);
    } finally {
      globalThis.fetch = original;
    }
  });
  it("distinguishes a valid zero from an unknown potential and reads exact last-match minutes", () => {
    const p = player();
    assert.equal(p.skills.keeper.current, 0);
    assert.equal(p.skills.keeper.currentAvailable, true);
    assert.equal(p.skills.keeper.potential, null);
    assert.equal(p.skills.keeper.potentialAvailable, false);
    assert.equal(p.specialty, null);
    assert.equal(p.lastMatch?.playedMinutes, 72);
    assert.equal(p.lastMatch?.date, "2026-10-04T16:00:00.000Z");
  });
  it("accepts singleton and empty lists, rejecting incomplete, duplicate and wrong-team responses", () => {
    assert.equal(
      parseYouthPlayers(parser.parse("<HattrickData><PlayerList /></HattrickData>"), 20).length,
      0,
    );
    assert.throws(() => parseYouthPlayers({ HattrickData: {} }, 20));
    assert.throws(() =>
      parseYouthPlayers(
        parser.parse(
          fixture()
            .replace("<PlayerSkills>", "<HiddenSkills>")
            .replace("</PlayerSkills>", "</HiddenSkills>"),
        ),
        20,
      ),
    );
    assert.throws(() => parseYouthPlayers(parser.parse(fixture()), 21));
    const data = parser.parse(fixture());
    data.HattrickData.PlayerList.YouthPlayer = [
      data.HattrickData.PlayerList.YouthPlayer,
      data.HattrickData.PlayerList.YouthPlayer,
    ];
    assert.throws(() => parseYouthPlayers(data, 20));
    assert.throws(() =>
      parseYouthPlayers({ HattrickData: { PlayerList: { UnexpectedPlayer: {} } } }, 20),
    );
    assert.throws(() => parseYouthPlayers({ HattrickData: { PlayerList: "malformed" } }, 20));
  });
  it("reads CHPP's capitalized boolean attributes without hiding revealed levels", () => {
    const p = parseYouthPlayers(
      parser.parse(
        fixture()
          .replaceAll('="true"', '="True"')
          .replaceAll('="false"', '="False"')
          .replace('IsMaxReached="False"', 'IsMaxReached="True"'),
      ),
      20,
    )[0];
    assert.equal(p.skills.keeper.current, 0);
    assert.equal(p.skills.keeper.potential, null);
    assert.equal(p.skills.keeper.isMaxReached, true);
  });
  it("discovers the configured club's academy instead of the primary club's", () => {
    assert.deepEqual(
      parseYouthAcademy(
        {
          HattrickData: {
            Teams: {
              Team: [
                { TeamID: 11, YouthTeamID: 21 },
                { TeamID: 10, YouthTeamID: 20, YouthTeamName: "Youth FC" },
              ],
            },
          },
        },
        10,
      ),
      academy,
    );
    assert.equal(
      parseYouthAcademy({ HattrickData: { Teams: { Team: { TeamID: 10, YouthTeamID: 0 } } } }, 10),
      null,
    );
    assert.throws(() => parseYouthAcademy({ HattrickData: { Error: "Denied" } }, 10));
    assert.throws(() =>
      parseYouthAcademy({ HattrickData: { Teams: { Team: { TeamID: 10 } } } }, 10),
    );
  });
  it("treats initial observations as baseline and repeated observations as no change", () => {
    assert.deepEqual(detectYouthChanges(null, player()), []);
    assert.deepEqual(detectYouthChanges(player(), player()), []);
  });
  it("separates discoveries, improvement, potential corrections, decreases and maximum reached", () => {
    const before = player();
    const current = player();
    before.skills.keeper.current = null;
    current.skills.keeper.current = 4;
    current.skills.keeper.potential = 7;
    current.skills.scorer.current = 1;
    before.skills.passing.potential = 6;
    current.skills.passing.potential = 7;
    before.skills.defender.current = 5;
    current.skills.defender.current = 4;
    current.skills.scorer.isMaxReached = true;
    const changes = detectYouthChanges(before, current);
    assert.equal(changes.find((c) => c.key === "keeper.current")?.kind, "current_discovered");
    assert.equal(changes.find((c) => c.key === "keeper.potential")?.kind, "potential_discovered");
    assert.equal(changes.find((c) => c.key === "scorer.current")?.kind, "improvement");
    assert.equal(changes.find((c) => c.key === "passing.potential")?.kind, "value_changed");
    assert.equal(changes.find((c) => c.key === "defender.current")?.kind, "value_changed");
    assert.equal(changes.find((c) => c.key === "scorer.isMaxReached")?.kind, "max_reached");
  });
});

describe("youth persistence and refresh", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ht-youth-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  before(() => {
    execFileSync(
      process.execPath,
      [
        path.resolve(__dirname, "../../node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        path.resolve(__dirname, "../../prisma/schema.prisma"),
      ],
      { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
    );
  });
  after(async () => {
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("starts uninitialized, stores baseline and records improvements with detection timestamps", async () => {
    assert.equal((await getYouthSquad(prisma, 10)).status, "not_synced");
    await storeYouthRoster(prisma, academy, [player()], new Date("2026-10-04T20:00:00Z"));
    assert.equal(await prisma.youthChange.count(), 0);
    const next = player();
    next.skills.scorer.current = 4;
    await storeYouthRoster(prisma, academy, [next], new Date("2026-10-05T20:00:00Z"));
    const detail = await getYouthPlayer(prisma, 99, 10);
    assert.equal(detail?.history.length, 2);
    assert.equal(detail?.changes[0].kind, "improvement");
    assert.equal(detail?.changes[0].detectedAt.toISOString(), "2026-10-05T20:00:00.000Z");
    assert.equal(detail?.player.skills.scorer.current, 4);
  });
  it("archives absent players and preserves their full history", async () => {
    await storeYouthRoster(prisma, academy, [], new Date("2026-10-06T20:00:00Z"));
    const detail = await getYouthPlayer(prisma, 99, 10);
    assert.equal(detail?.player.isActive, false);
    assert.equal(detail?.history.length, 2);
    assert.equal(detail?.changes[0].kind, "roster_departure");
    assert.equal((await getYouthSquad(prisma, 10)).players.length, 1);
    assert.equal((await getYouthSquad(prisma, 10)).status, "ready");
  });
  it("does not archive or overwrite existing observations when CHPP fails", async () => {
    await storeYouthRoster(prisma, academy, [player()], new Date("2026-10-07T20:00:00Z"));
    const snapshots = await prisma.youthSnapshot.count();
    await assert.rejects(
      refreshYouthSquad(
        prisma,
        {
          ...client(),
          getYouthPlayers: async () => {
            throw new Error("Incomplete skills");
          },
        },
        10,
      ),
      /Incomplete skills/,
    );
    assert.equal(await prisma.youthSnapshot.count(), snapshots);
    assert.equal((await getYouthPlayer(prisma, 99, 10))?.player.isActive, true);
  });
  it("rolls back roster departures and snapshots together when persistence fails", async () => {
    const snapshots = await prisma.youthSnapshot.count();
    await assert.rejects(
      storeYouthRoster(prisma, academy, [{ ...player(100), age: Number.NaN }], new Date()),
    );
    assert.equal(await prisma.youthSnapshot.count(), snapshots);
    assert.equal((await getYouthPlayer(prisma, 99, 10))?.player.isActive, true);
    assert.equal(await getYouthPlayer(prisma, 100, 10), null);
  });
  it("records an arrival after a previously empty academy baseline", async () => {
    const emptyAcademy = { youthTeamId: 22, seniorTeamId: 12, name: "Empty Academy" };
    await storeYouthRoster(prisma, emptyAcademy, [], new Date());
    await storeYouthRoster(prisma, emptyAcademy, [player(102)], new Date());
    const detail = await getYouthPlayer(prisma, 102, 12);
    assert.equal(detail?.changes[0].kind, "roster_arrival");
    assert.equal(detail?.changes.length, 1);
  });
  it("keeps roster data on lineup failures, retries pending lineups and never duplicates appearances", async () => {
    const stub = client();
    const fail = {
      ...stub,
      getYouthMatchLineup: async () => {
        throw new Error("Lineup unavailable");
      },
    };
    const first = await refreshYouthSquad(prisma, fail, 10);
    assert.equal(first.sync.failures.length, 1);
    assert.equal(first.players[0].isActive, true);
    assert.equal((await prisma.youthMatch.findFirst())?.lineupFetchedAt, null);
    const second = await refreshYouthSquad(prisma, stub, 10);
    assert.equal(second.sync.lineupsStored, 1);
    assert.equal(second.sync.failures.length, 0);
    assert.equal(await prisma.youthAppearance.count(), 1);
    assert.equal((await prisma.youthAppearance.findFirst())?.playedMinutes, 72);
    const third = await refreshYouthSquad(prisma, stub, 10);
    assert.equal(third.sync.lineupsStored, 0);
    assert.equal(await prisma.youthAppearance.count(), 1);
    const detail = await getYouthPlayer(prisma, 99, 10);
    assert.equal(detail?.matches[0].opponentTeamName, "Visitors");
    assert.equal(detail?.matches[0].ratingStars, 6.5);
  });
  it("never assigns last-match minutes to an older match", async () => {
    const current = player();
    current.lastMatch!.matchId = 102;
    await prisma.youthMatch.updateMany({ data: { lineupFetchedAt: null } });
    await syncYouthMatches(prisma, client([current]), 20, [current], new Date());
    assert.equal((await prisma.youthAppearance.findFirst())?.playedMinutes, null);
  });
  it("retains the successful match cursor and roster when the archive fails", async () => {
    const before = (await prisma.youthAcademy.findUniqueOrThrow({ where: { youthTeamId: 20 } }))
      .matchesSyncedAt;
    const result = await refreshYouthSquad(
      prisma,
      {
        ...client(),
        getYouthMatchesArchive: async () => {
          throw new Error("Archive unavailable");
        },
      },
      10,
    );
    assert.equal(result.sync.failures[0].matchId, null);
    assert.equal(result.sync.playersStored, 1);
    const after = (await prisma.youthAcademy.findUniqueOrThrow({ where: { youthTeamId: 20 } }))
      .matchesSyncedAt;
    assert.deepEqual(after, before);
  });
  it("keeps senior matches and player IDs separate and restricts club reads", async () => {
    await prisma.teamMatch.create({
      data: {
        matchId: 101,
        matchDate: new Date(),
        matchType: 1,
        homeTeamId: 10,
        homeTeamName: "Senior FC",
        awayTeamId: 40,
        awayTeamName: "Visitors",
      },
    });
    await prisma.playerTracking.create({ data: { playerId: 99 } });
    assert.equal(await prisma.teamMatch.count(), 1);
    assert.equal(await prisma.youthMatch.count(), 1);
    assert.equal(await getYouthPlayer(prisma, 99, 11), null);
  });
  it("prevents overlapping refreshes and releases the lock after failure", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = refreshYouthSquad(
      prisma,
      {
        ...client(),
        getYouthAcademy: async () => {
          await gate;
          throw new Error("Failed discovery");
        },
      },
      10,
    );
    await assert.rejects(refreshYouthSquad(prisma, client(), 10), YouthRefreshBusy);
    release();
    await assert.rejects(first, /Failed discovery/);
    assert.equal((await refreshYouthSquad(prisma, client(), 10)).status, "ready");
  });
  it("distinguishes no academy from an empty roster and retains the archive", async () => {
    const result = await refreshYouthSquad(
      prisma,
      { ...client(), getYouthAcademy: async () => null },
      10,
    );
    assert.equal(result.status, "no_academy");
    assert.equal(result.players[0].isActive, false);
    assert.ok((await getYouthPlayer(prisma, 99, 10))!.history.length > 2);
  });
});
