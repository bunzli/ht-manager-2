import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import express from "express";
import cors from "cors";
import { createProductionBasicAuth } from "./basicAuth";

const config = {
  NODE_ENV: "production",
  BASIC_AUTH_USERNAME: "test-user",
  BASIC_AUTH_PASSWORD: "test-password:with:colons",
};

function authorization(
  username = config.BASIC_AUTH_USERNAME,
  password = config.BASIC_AUTH_PASSWORD,
) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

it("requires production credentials without exposing their values in errors", () => {
  for (const env of [
    { NODE_ENV: "production" },
    { ...config, BASIC_AUTH_USERNAME: undefined },
    { ...config, BASIC_AUTH_USERNAME: "" },
    { ...config, BASIC_AUTH_PASSWORD: undefined },
    { ...config, BASIC_AUTH_PASSWORD: "" },
  ]) {
    assert.throws(() => createProductionBasicAuth(env), {
      message: "Production requires BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD",
    });
  }
  assert.throws(() => createProductionBasicAuth({ ...config, BASIC_AUTH_USERNAME: "bad:user" }), {
    message: "BASIC_AUTH_USERNAME must not contain a colon",
  });
});

describe("production HTTP Basic authentication", () => {
  let server: Server;
  let url: string;
  let directory: string;
  let mutations = 0;

  before(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "ht-basic-auth-"));
    writeFileSync(path.join(directory, "index.html"), "<html>HT Manager</html>");
    writeFileSync(path.join(directory, "app.js"), "console.log('asset');");
    const app = express();
    app.use(createProductionBasicAuth(config));
    app.use(cors());
    app.use(express.json());
    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
    app.get("/api/players", (_req, res) => res.json({ players: [] }));
    app.post("/api/players/refresh", (_req, res) => {
      mutations++;
      res.json({ refreshed: true });
    });
    app.use(express.static(directory));
    app.get("*", (_req, res) => res.sendFile(path.join(directory, "index.html")));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    url = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it("challenges unauthenticated pages, static assets, and REST API requests", async () => {
    for (const target of ["/", "/youth", "/index.html", "/app.js", "/api/players"]) {
      const response = await fetch(url + target);
      assert.equal(response.status, 401, target);
      assert.equal(
        response.headers.get("www-authenticate"),
        'Basic realm="HT Manager", charset="UTF-8"',
      );
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(await response.text(), "Unauthorized");
    }
  });

  it("rejects incorrect and malformed credentials", async () => {
    for (const value of [
      authorization("wrong-user"),
      authorization(config.BASIC_AUTH_USERNAME, "wrong-password"),
      "Bearer token",
      "Basic",
      "Basic !!!",
      "Basic " + Buffer.from("no-separator").toString("base64"),
      "Basic " + Buffer.from(":").toString("base64"),
      "Basic " + Buffer.from([0xff, 0x3a, 0xff]).toString("base64"),
      authorization() + "=",
    ]) {
      const response = await fetch(url + "/api/players", { headers: { Authorization: value } });
      assert.equal(response.status, 401);
    }
  });

  it("serves pages, assets, and API data with valid credentials", async () => {
    for (const [target, content] of [
      ["/", "<html>HT Manager</html>"],
      ["/youth", "<html>HT Manager</html>"],
      ["/app.js", "console.log('asset');"],
      ["/api/players", '{"players":[]}'],
    ]) {
      const response = await fetch(url + target, { headers: { Authorization: authorization() } });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), content);
      assert.equal(response.headers.get("www-authenticate"), null);
    }
  });

  it("authenticates before JSON parsing, CORS preflight, and mutation handlers", async () => {
    const denied = await fetch(url + "/api/players/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(denied.status, 401);
    assert.equal(mutations, 0);
    const preflight = await fetch(url + "/api/players/refresh", {
      method: "OPTIONS",
      headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(preflight.status, 401);
    const allowed = await fetch(url + "/api/players/refresh", {
      method: "POST",
      headers: { Authorization: authorization(), "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(allowed.status, 200);
    assert.equal(mutations, 1);
  });

  it("exempts only the exact GET health path", async () => {
    for (const target of ["/api/health", "/api/health?probe=1"]) {
      const response = await fetch(url + target);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    }
    for (const method of ["HEAD", "POST", "OPTIONS", "DELETE"]) {
      assert.equal((await fetch(url + "/api/health", { method })).status, 401);
    }
    for (const target of ["/api/health/", "/api/health/extra", "/API/health", "/mcp-other"]) {
      assert.equal((await fetch(url + target)).status, 401);
    }
  });
});

it("bypasses authentication outside production and preserves UTF-8 credentials exactly", () => {
  for (const NODE_ENV of [undefined, "development", "test"]) {
    // Development ignores even invalid production-only configuration.
    const middleware = createProductionBasicAuth({ ...config, NODE_ENV, BASIC_AUTH_USERNAME: ":" });
    let continued = false;
    middleware({} as express.Request, {} as express.Response, () => {
      continued = true;
    });
    assert.ok(continued);
  }
  const username = "üser";
  const password = " pässword: ";
  const middleware = createProductionBasicAuth({
    NODE_ENV: "production",
    BASIC_AUTH_USERNAME: username,
    BASIC_AUTH_PASSWORD: password,
  });
  let continued = false;
  middleware(
    {
      method: "GET",
      path: "/",
      get: () => authorization(username, password),
    } as unknown as express.Request,
    {} as express.Response,
    () => {
      continued = true;
    },
  );
  assert.ok(continued);
});
