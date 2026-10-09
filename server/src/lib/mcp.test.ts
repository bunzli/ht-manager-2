import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { request, type Server } from "node:http";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpRouter, mcpConfigFromEnv } from "../routes/mcp";
import { YOUTH_SKILLS } from "../chpp/youth";
import { getTeamSettings, updateTrainingSettings } from "../services/training.service";
import { createProductionBasicAuth } from "./basicAuth";

function object(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function rows(value: unknown): Array<Record<string, unknown>> {
  assert.ok(Array.isArray(value));
  return value.map(object);
}

describe("read-only squad MCP over HTTP", () => {
  let prisma: PrismaClient;
  let httpServer: Server;
  let client: Client;
  let url: string;
  let directory: string;
  let attemptedWrites = 0;
  let attemptedExternalRequests = 0;
  let failReads = false;
  const previousTeam = process.env.CHPP_TEAM_ID;
  const originalFetch = globalThis.fetch;
  const token = "integration-test-token";

  before(async () => {
    process.env.CHPP_TEAM_ID = "10";
    directory = mkdtempSync(path.join(tmpdir(), "ht-mcp-"));
    const databaseUrl = `file:${path.join(directory, "test.db")}`;
    execFileSync(
      process.execPath,
      [
        path.resolve(__dirname, "../../node_modules/prisma/build/index.js"),
        "db",
        "push",
        "--skip-generate",
        "--schema",
        path.resolve(__dirname, "../../prisma/schema.prisma"),
      ],
      { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const readOnlyPrisma = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ operation, args, query }) {
            if (
              !["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"].includes(
                operation,
              )
            ) {
              attemptedWrites++;
              throw new Error("MCP attempted a database mutation");
            }
            if (failReads) throw new Error("Private connection details must not reach clients");
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;
    globalThis.fetch = async (input, init) => {
      const target = new URL(input instanceof Request ? input.url : String(input));
      if (target.hostname !== "127.0.0.1") {
        attemptedExternalRequests++;
        throw new Error("MCP attempted an external request");
      }
      return originalFetch(input, init);
    };
    const app = express();
    const config = {
      accessToken: token,
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: ["https://allowed.example"],
    };
    app.use("/mcp", createMcpRouter(readOnlyPrisma, config));
    app.use("/disabled", createMcpRouter(readOnlyPrisma, { ...config, accessToken: "" }));
    app.use(
      createProductionBasicAuth({
        NODE_ENV: "production",
        BASIC_AUTH_USERNAME: "web-user",
        BASIC_AUTH_PASSWORD: "web-password",
      }),
    );
    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
    // Simulate the production frontend fallback; MCP errors must never reach it.
    app.get("*", (_req, res) => res.send("frontend"));
    httpServer = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => httpServer.once("listening", resolve));
    const address = httpServer.address();
    assert.ok(address && typeof address !== "string");
    url = `http://127.0.0.1:${address.port}/mcp`;
    client = new Client({ name: "ht-manager-test-client", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (previousTeam === undefined) delete process.env.CHPP_TEAM_ID;
    else process.env.CHPP_TEAM_ID = previousTeam;
    await client?.close();
    if (httpServer)
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
        httpServer.closeAllConnections();
      });
    await prisma?.$disconnect();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    const content = rows(result.content)[0];
    assert.equal(content.type, "text");
    assert.equal(typeof content.text, "string");
    const data = object(JSON.parse(content.text as string));
    assert.deepEqual(result.structuredContent, data);
    return data;
  }

  it("initializes, discovers exactly four read-only tools, and reads empty squads", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      "get_senior_player",
      "get_senior_squad",
      "get_youth_player",
      "get_youth_squad",
    ]);
    for (const tool of tools) assert.equal(tool.annotations?.readOnlyHint, true);
    const senior = await call("get_senior_squad");
    assert.deepEqual(senior.players, []);
    assert.equal(senior.fetchedAt, null);
    const youth = await call("get_youth_squad");
    assert.equal(youth.status, "not_synced");
    assert.deepEqual(youth.players, []);
    assert.equal(await prisma.teamSettings.count(), 0);
  });

  it("requires authentication and rejects disallowed hosts and origins", async () => {
    for (const authorization of [
      undefined,
      "Bearer wrong",
      "Basic credentials",
      `Basic ${Buffer.from("web-user:web-password").toString("base64")}`,
      "Bearer",
    ]) {
      const response = await fetch(url, {
        method: "POST",
        headers: authorization ? { Authorization: authorization } : {},
      });
      assert.equal(response.status, 401);
      assert.match(response.headers.get("www-authenticate") ?? "", /Bearer/);
    }
    const headers = { Authorization: `Bearer ${token}` };
    const spoofedHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            Host: "attacker.example",
            "X-Forwarded-Host": "127.0.0.1",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(spoofedHostStatus, 403);
    const denied = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        Origin: "https://denied.example",
      },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: "https://allowed.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://allowed.example");
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: {
            Origin: "https://allowed.example",
          },
        })
      ).status,
      401,
    );
    const browserClient = new Client({ name: "browser-test", version: "1" });
    try {
      await browserClient.connect(
        new StreamableHTTPClientTransport(new URL(url), {
          requestInit: { headers: { ...headers, Origin: "https://allowed.example" } },
        }),
      );
      assert.equal((await browserClient.listTools()).tools.length, 4);
    } finally {
      await browserClient.close();
    }
  });

  it("keeps disabled and unsupported requests out of the frontend fallback", async () => {
    for (const method of ["GET", "POST", "OPTIONS"]) {
      const response = await fetch(url.replace("/mcp", "/disabled"), { method });
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: "MCP is disabled" });
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST, OPTIONS");
    assert.equal(
      (
        await fetch(url + "/missing", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
      404,
    );
    assert.deepEqual(await (await fetch(url.replace("/mcp", "/api/health"))).json(), {
      status: "ok",
    });
  });

  it("rejects malformed and oversized bodies without leaking errors", async () => {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const malformed = await fetch(url, { method: "POST", headers, body: "{" });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Invalid request body" });
    const oversized = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ value: "a".repeat(70_000) }),
    });
    assert.equal(oversized.status, 413);
  });

  it("distinguishes no academy from an unsynchronized academy", async () => {
    await prisma.youthClubStatus.create({ data: { seniorTeamId: 10, checkedAt: new Date() } });
    const squad = await call("get_youth_squad");
    assert.equal(squad.status, "no_academy");
    assert.equal(squad.academy, null);
    assert.ok(squad.fetchedAt);
  });

  it("reads saved senior and youth data, scopes membership, and preserves unknown skills", async () => {
    const skills = Object.fromEntries(
      YOUTH_SKILLS.map((key) => [
        key,
        {
          current: 0,
          potential: null,
          currentAvailable: true,
          potentialAvailable: false,
          isMaxReached: false,
        },
      ]),
    );
    await prisma.youthAcademy.create({
      data: {
        youthTeamId: 20,
        seniorTeamId: 10,
        name: "Youth FC",
        fetchedAt: new Date("2026-10-05T12:00:00Z"),
      },
    });
    await prisma.youthClubStatus.update({ where: { seniorTeamId: 10 }, data: { youthTeamId: 20 } });
    const youth = await prisma.youthPlayer.create({ data: { youthTeamId: 20, youthPlayerId: 99 } });
    const archived = await prisma.youthPlayer.create({
      data: { youthTeamId: 20, youthPlayerId: 98, isActive: false, archivedAt: new Date() },
    });
    await prisma.youthAcademy.create({
      data: { youthTeamId: 30, seniorTeamId: 11, name: "Other club" },
    });
    const other = await prisma.youthPlayer.create({ data: { youthTeamId: 30, youthPlayerId: 97 } });
    for (const player of [archived, other]) {
      await prisma.youthSnapshot.create({
        data: {
          playerId: player.id,
          fetchedAt: new Date(),
          firstName: "Other",
          nickName: "",
          lastName: "Player",
          age: 16,
          ageDays: 10,
          skills: JSON.stringify(skills),
        },
      });
    }
    for (let i = 0; i < 55; i++) {
      const at = new Date(Date.UTC(2026, 7, i + 1));
      const snapshot = await prisma.playerDetails.create({
        data: {
          playerId: 1,
          fetchedAt: at,
          firstName: "Senior",
          lastName: "Player",
          age: 20,
          ageDays: 5,
          tsi: 1000 + i,
          playerForm: 5,
          experience: 3,
          loyalty: 5,
          leadership: 3,
          scorerSkill: 4,
          staminaSkill: 5,
        },
      });
      await prisma.playerTracking.upsert({
        where: { playerId: 1 },
        create: { playerId: 1, latestDetailsId: snapshot.id, lastUpdatedAt: at },
        update: { latestDetailsId: snapshot.id, lastUpdatedAt: at },
      });
      await prisma.playerChange.create({
        data: {
          playerId: 1,
          key: "tsi",
          detectedAt: at,
          oldValue: String(999 + i),
          newValue: String(1000 + i),
        },
      });
      await prisma.youthSnapshot.create({
        data: {
          playerId: youth.id,
          fetchedAt: at,
          firstName: "Youth",
          nickName: "",
          lastName: "Player",
          age: 16,
          ageDays: i,
          skills: JSON.stringify(skills),
        },
      });
      await prisma.youthChange.create({
        data: {
          playerId: youth.id,
          detectedAt: at,
          kind: "improvement",
          key: "scorer.current",
          oldValue: "0",
          newValue: "1",
        },
      });
      const match = await prisma.teamMatch.create({
        data: {
          matchId: 100 + i,
          matchDate: at,
          matchType: 1,
          homeTeamId: 10,
          homeTeamName: "Our team",
          awayTeamId: 12,
          awayTeamName: "Visitors",
          homeGoals: 2,
          awayGoals: 0,
        },
      });
      await prisma.playerMatchAppearance.create({
        data: {
          teamMatchId: match.id,
          playerId: 1,
          roleId: 111,
          positionCode: 111,
          behaviour: 0,
          ratingStars: 5,
        },
      });
      const youthMatch = await prisma.youthMatch.create({
        data: {
          youthTeamId: 20,
          matchId: 200 + i,
          matchDate: at,
          matchType: 100,
          homeTeamId: 20,
          homeTeamName: "Youth FC",
          awayTeamId: 21,
          awayTeamName: "Visitors",
        },
      });
      await prisma.youthAppearance.create({
        data: {
          youthMatchId: youthMatch.id,
          youthPlayerId: 99,
          roleId: 111,
          positionCode: 111,
          behaviour: 0,
          ratingStars: 5,
        },
      });
    }
    const outsider = await prisma.playerDetails.create({
      data: {
        playerId: 2,
        firstName: "Market",
        lastName: "Player",
        age: 22,
        ageDays: 5,
        tsi: 4000,
        playerForm: 5,
        experience: 3,
        loyalty: 5,
        leadership: 3,
      },
    });
    await prisma.playerTracking.create({
      data: { playerId: 2, isTracking: false, latestDetailsId: outsider.id },
    });
    const senior = await call("get_senior_squad");
    assert.deepEqual(
      rows(senior.players).map((p) => p.playerId),
      [1],
    );
    assert.equal(rows(senior.players)[0].scorerSkill, 4);
    assert.ok(rows(senior.players)[0].positionScores);
    assert.ok(senior.fetchedAt);
    const squad = await call("get_youth_squad");
    assert.equal(squad.status, "ready");
    assert.deepEqual(
      rows(squad.players).map((p) => p.youthPlayerId),
      [99],
    );
    const keeper = object(object(rows(squad.players)[0].skills).keeper);
    assert.equal(keeper.current, 0);
    assert.equal(keeper.potential, null);
    assert.deepEqual(
      rows((await call("get_youth_squad", { includeArchived: true })).players).map(
        (p) => p.youthPlayerId,
      ),
      [98, 99],
    );
    assert.equal(object((await call("get_youth_player", { playerId: 98 })).player).isActive, false);
  });

  it("limits each history collection, keeps the newest entries, and reports truncation", async () => {
    for (const [name, playerId] of [
      ["get_senior_player", 1],
      ["get_youth_player", 99],
    ] as const) {
      const defaultResult = await call(name, { playerId });
      assert.equal(rows(defaultResult.history).length, 50);
      assert.equal(rows(defaultResult.matches).length, 50);
      assert.equal(rows(defaultResult.changes).length, 50);
      assert.equal(object(defaultResult.truncated).history, true);
      const limited = await call(name, { playerId, historyLimit: 1 });
      for (const key of ["history", "changes", "matches"]) {
        assert.equal(rows(limited[key]).length, 1);
        assert.equal(object(limited.truncated)[key], true);
      }
      assert.equal(rows(limited.history)[0].at, new Date(Date.UTC(2026, 7, 55)).toISOString());
      const complete = await call(name, { playerId, historyLimit: 200 });
      assert.equal(rows(complete.history).length, 55);
      assert.equal(rows(complete.matches).length, 55);
      assert.equal(object(complete.truncated).history, false);
      assert.equal(object(complete.truncated).matches, false);
    }
    const senior = await call("get_senior_player", { playerId: 1 });
    assert.equal(object(rows(senior.history)[0].skills).scorerSkill, 4);
  });

  it("rejects invalid arguments and players outside the configured squad", async () => {
    for (const name of ["get_senior_player", "get_youth_player"]) {
      for (const args of [
        {},
        { playerId: 0 },
        { playerId: -1 },
        { playerId: 1.5 },
        { playerId: "1" },
        { playerId: Number.MAX_SAFE_INTEGER + 1 },
        { playerId: 1, historyLimit: 0 },
        { playerId: 1, historyLimit: 201 },
      ]) {
        assert.equal((await client.callTool({ name, arguments: args })).isError, true);
      }
    }
    for (const [name, playerId] of [
      ["get_senior_player", 2],
      ["get_senior_player", 999],
      ["get_youth_player", 97],
      ["get_youth_player", 999],
    ] as const) {
      const result = await client.callTool({ name, arguments: { playerId } });
      assert.equal(result.isError, true);
      assert.match(String(rows(result.content)[0].text), /Player not found/);
    }
    assert.equal(
      (await client.callTool({ name: "get_youth_squad", arguments: { includeArchived: "yes" } }))
        .isError,
      true,
    );
  });

  it("sanitizes database failures and performs no writes or external requests", async () => {
    failReads = true;
    try {
      const result = await client.callTool({ name: "get_senior_squad", arguments: {} });
      assert.equal(result.isError, true);
      assert.match(String(rows(result.content)[0].text), /Unable to read squad data/);
      assert.doesNotMatch(JSON.stringify(result), /Private connection/);
    } finally {
      failReads = false;
    }
    assert.equal(attemptedWrites, 0);
    assert.equal(attemptedExternalRequests, 0);
    assert.equal(await prisma.teamSettings.count(), 0);
    const defaults = await getTeamSettings(prisma);
    assert.equal(defaults.trainingTypeId, null);
    // Existing settings writes still initialize and persist the row explicitly.
    await updateTrainingSettings(prisma, { trainingTypeId: 8 });
    assert.equal((await getTeamSettings(prisma)).trainingTypeId, 8);
    assert.equal(await prisma.teamSettings.count(), 1);
  });
});

it("MCP configuration defaults to local hosts and no browser origins", () => {
  const names = ["MCP_ACCESS_TOKEN", "MCP_ALLOWED_HOSTS", "MCP_ALLOWED_ORIGINS"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    assert.deepEqual(mcpConfigFromEnv(), {
      accessToken: undefined,
      allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
      allowedOrigins: [],
    });
    process.env.MCP_ACCESS_TOKEN = "  token  ";
    process.env.MCP_ALLOWED_HOSTS = " ht.example.com, localhost, ";
    process.env.MCP_ALLOWED_ORIGINS = "https://client.example.com";
    assert.deepEqual(mcpConfigFromEnv(), {
      accessToken: "token",
      allowedHosts: ["ht.example.com", "localhost"],
      allowedOrigins: ["https://client.example.com"],
    });
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
