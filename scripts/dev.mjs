#!/usr/bin/env node
// Keep the bootstrap compatible with Node 16 so an old shell can select Node 22.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { availableFrontendPort, mainCheckout, sharedDatabaseUrl } from "./dev-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pinnedVersion = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const children = new Set();
let stopping = false;
let stopPromise;
let viteServer;
let frontendPromise;

function compatible(version) {
  const [major, minor] = version.replace(/^v/, "").split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 13);
}

function signalChild(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function shutdown(code = 0) {
  if (stopPromise) return stopPromise;
  stopping = true;
  stopPromise = (async () => {
    const active = [...children];
    const exited = Promise.all([
      ...active.map((child) => new Promise((resolve) => child.once("exit", resolve))),
      Promise.resolve(frontendPromise)
        .catch(() => {})
        .then(() => viteServer?.close()),
    ]);
    active.forEach((child) => signalChild(child, "SIGTERM"));
    let timer;
    await Promise.race([
      exited,
      new Promise((resolve) => {
        timer = setTimeout(() => {
          active.forEach((child) => signalChild(child, "SIGKILL"));
          resolve();
        }, 3000);
      }),
    ]);
    clearTimeout(timer);
    process.exitCode = code;
  })();
  return stopPromise;
}

process.on("SIGINT", () => void shutdown(130));
process.on("SIGTERM", () => void shutdown(143));

function launch(command, args, options = {}) {
  if (stopping) throw new Error("Startup cancelled.");
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    detached: true,
    ...options,
  });
  children.add(child);
  child.once("exit", () => children.delete(child));
  child.once("error", () => children.delete(child));
  return child;
}

async function run(command, args, options = {}) {
  const child = launch(command, args, options);
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed (${signal || code}).`));
    });
  });
}

async function selectNode() {
  if (compatible(process.version)) return false;
  const asdfEnv = { ...process.env, ASDF_NODEJS_VERSION: pinnedVersion };
  let asdf = spawnSync("asdf", ["where", "nodejs", pinnedVersion], {
    encoding: "utf8",
    env: asdfEnv,
  });
  const candidates = [
    asdf.status === 0 && path.join(asdf.stdout.trim(), "bin/node"),
    path.join(process.env.HOME || "", `.nvm/versions/node/v${pinnedVersion}/bin/node`),
    path.join(
      process.env.HOME || "",
      `.local/share/fnm/node-versions/v${pinnedVersion}/installation/bin/node`,
    ),
    "/opt/homebrew/opt/node@22/bin/node",
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
  ].filter(Boolean);
  let node = candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    return result.status === 0 && compatible(result.stdout.trim());
  });
  if (!node && !asdf.error) {
    console.log(`[dev] Installing Node ${pinnedVersion} with asdf...`);
    await run("asdf", ["install", "nodejs", pinnedVersion], { env: asdfEnv });
    asdf = spawnSync("asdf", ["where", "nodejs", pinnedVersion], {
      encoding: "utf8",
      env: asdfEnv,
    });
    if (asdf.status === 0) node = path.join(asdf.stdout.trim(), "bin/node");
  }
  if (!node) {
    throw new Error(
      `Node 22.13+ is required. Install Node ${pinnedVersion} with your Node manager, then run npm run dev again.`,
    );
  }
  console.log(`[dev] Switching from ${process.version} to ${node}.`);
  await run(node, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    env: {
      ...process.env,
      ASDF_NODEJS_VERSION: pinnedVersion,
      PATH: `${path.dirname(node)}${path.delimiter}${process.env.PATH || ""}`,
    },
  });
  return true;
}

async function installDependencies(directory) {
  const lock = fs.readFileSync(path.join(directory, "package-lock.json"));
  const digest = createHash("sha256")
    .update(lock)
    .update(process.versions.node.split(".")[0])
    .digest("hex");
  const marker = path.join(directory, "node_modules/.ht-manager-install");
  if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8") === digest) return;
  console.log(`[dev] Installing dependencies in ${path.relative(root, directory) || "root"}...`);
  await run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: directory });
  fs.writeFileSync(marker, digest);
}

async function start() {
  if (await selectNode()) return;
  // Use npm and child tools from the selected Node installation.
  process.env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`;
  const command = process.argv[2] || "dev";
  if (!["dev", "migrate", "generate"].includes(command)) {
    throw new Error(`Unknown development command: ${command}`);
  }
  const checkout = mainCheckout(root);
  const envFile = process.env.HT_MANAGER_ENV_FILE
    ? path.resolve(root, process.env.HT_MANAGER_ENV_FILE)
    : path.join(checkout, ".env");
  if (!fs.existsSync(envFile)) {
    throw new Error(`Create ${envFile} from .env.example and configure your CHPP credentials.`);
  }
  for (const directory of [root, path.join(root, "server"), path.join(root, "client")]) {
    await installDependencies(directory);
  }
  const require = createRequire(path.join(root, "server/package.json"));
  const sharedEnv = require("dotenv").parse(fs.readFileSync(envFile));
  const databaseUrl = sharedDatabaseUrl(
    process.env.DATABASE_URL || sharedEnv.DATABASE_URL,
    checkout,
  );
  const env = {
    ...sharedEnv,
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl,
  };
  console.log(`[dev] Node ${process.version}; shared configuration: ${envFile}`);
  console.log(`[dev] Shared database: ${databaseUrl}`);
  const serverRoot = path.join(root, "server");
  const prisma = path.join(serverRoot, "node_modules/prisma/build/index.js");
  if (command !== "dev") {
    await run(
      process.execPath,
      [
        prisma,
        command === "migrate" ? "migrate" : "generate",
        ...(command === "migrate" ? ["dev"] : []),
        "--schema",
        "prisma/schema.prisma",
      ],
      { cwd: serverRoot, env },
    );
    return;
  }
  const databaseFile = databaseUrl.slice(5).split("?")[0];
  if (!fs.existsSync(databaseFile)) {
    throw new Error("Shared database does not exist. Run npm run db:migrate to initialize it.");
  }
  for (const key of [
    "CHPP_CONSUMER_KEY",
    "CHPP_CONSUMER_SECRET",
    "CHPP_ACCESS_TOKEN",
    "CHPP_ACCESS_TOKEN_SECRET",
  ]) {
    if (!env[key]) throw new Error(`Missing ${key} in ${envFile}.`);
  }
  // Generate only the client: startup never changes a shared database's schema.
  await run(process.execPath, [prisma, "generate", "--schema", "prisma/schema.prisma"], {
    cwd: serverRoot,
    env,
  });

  let apiUrl;
  let proxyOptions;
  const backend = launch(
    process.execPath,
    [
      path.join(serverRoot, "node_modules/tsx/dist/cli.mjs"),
      "watch",
      "--clear-screen=false",
      "src/index.ts",
    ],
    { cwd: serverRoot, env: { ...env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"] },
  );
  backend.once("error", (error) => {
    console.error(`[dev] ${error.message}`);
    void shutdown(1);
  });
  backend.once("exit", (code) => {
    if (!stopping) void shutdown(code || 1);
  });
  let ready = false;
  const timeout = setTimeout(() => {
    if (!ready) {
      console.error("[dev] API did not start within 30 seconds; see the server error above.");
      void shutdown(1);
    }
  }, 30000);
  backend.once("exit", () => clearTimeout(timeout));
  createInterface({ input: backend.stdout }).on("line", (line) => {
    console.log(line);
    const match = line.match(/^\[server\] Running on http:\/\/localhost:(\d+)$/);
    if (!match || stopping) return;
    ready = true;
    clearTimeout(timeout);
    const nextUrl = `http://127.0.0.1:${match[1]}`;
    if (nextUrl === apiUrl) return;
    apiUrl = nextUrl;
    // Keep the browser URL stable when tsx restarts the API on another free port.
    if (proxyOptions) proxyOptions.target = apiUrl;
    console.log(`[dev] API: ${apiUrl}`);
    if (frontendPromise) return;
    frontendPromise = (async () => {
      const { createServer } = await import(
        pathToFileURL(path.join(root, "client/node_modules/vite/dist/node/index.js")).href
      );
      if (stopping) return;
      // Match a normal `cd client && vite` launch, including Tailwind's paths.
      process.chdir(path.join(root, "client"));
      viteServer = await createServer({
        root: path.join(root, "client"),
        configFile: path.join(root, "client/vite.config.ts"),
        server: {
          host: "127.0.0.1",
          port: 5173,
          strictPort: true,
          proxy: {
            "/api": {
              target: apiUrl,
              changeOrigin: true,
              configure(_proxy, options) {
                proxyOptions = options;
              },
            },
          },
        },
      });
      if (stopping) return;
      let bindError;
      const captureError = (error) => {
        bindError = error;
      };
      viteServer.httpServer.on("error", captureError);
      try {
        let port = availableFrontendPort();
        while (!stopping) {
          bindError = undefined;
          try {
            await viteServer.listen(port);
            break;
          } catch (error) {
            if (bindError?.code !== "EADDRINUSE") throw error;
            // Another worktree may have bound this port since the lsof check.
            port = availableFrontendPort(port + 1);
          }
        }
      } finally {
        viteServer.httpServer.off("error", captureError);
      }
      viteServer.printUrls();
    })();
    frontendPromise.catch((error) => {
      console.error(`[dev] ${error.message}`);
      void shutdown(1);
    });
  });
}

start().catch(async (error) => {
  if (!stopping) console.error(`[dev] ${error.message}`);
  await shutdown(stopping ? process.exitCode || 130 : 1);
});
