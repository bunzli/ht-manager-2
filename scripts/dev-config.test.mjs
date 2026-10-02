import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { availableFrontendPort, mainCheckout, sharedDatabaseUrl } from "./dev-config.mjs";

test("a linked worktree discovers the main checkout and its relative SQLite DB", (t) => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ht-manager-config-")));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const checkout = path.join(temporary, "main checkout");
  const worktree = path.join(temporary, "other worktree");
  fs.mkdirSync(checkout);
  const git = (args) => execFileSync("git", args, { cwd: checkout, stdio: "pipe" });
  git(["init"]);
  git([
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "init",
  ]);
  git(["worktree", "add", "--detach", worktree]);
  assert.equal(mainCheckout(worktree), checkout);
  assert.equal(
    sharedDatabaseUrl("file:./prisma/dev.db", mainCheckout(worktree)),
    `file:${path.join(checkout, "server/prisma/prisma/dev.db")}`,
  );
});

test("an absolute shared SQLite URL and its options remain intact", () => {
  assert.equal(
    sharedDatabaseUrl("file:/tmp/shared data/dev.db?connection_limit=1", "/other/checkout"),
    "file:/tmp/shared data/dev.db?connection_limit=1",
  );
});

test("local startup rejects non-SQLite and missing database paths", () => {
  for (const url of [undefined, "", "postgresql://localhost/database", "file:"]) {
    assert.throws(() => sharedDatabaseUrl(url, "/checkout"));
  }
});

test("frontend port selection skips listeners on both loopback and wildcard addresses", async () => {
  for (const host of ["127.0.0.1", "0.0.0.0", "::1"]) {
    const server = net.createServer();
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, host, resolve);
      });
      const occupied = server.address().port;
      assert.ok(availableFrontendPort(occupied) > occupied);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
