import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

export function mainCheckout(root) {
  const commonDir = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  return path.dirname(commonDir);
}

export function sharedDatabaseUrl(url, checkout) {
  if (!url?.startsWith("file:")) {
    throw new Error("Local development requires a SQLite DATABASE_URL (file:...).");
  }
  const [filename, ...query] = url.slice(5).split("?");
  if (!filename) throw new Error("DATABASE_URL must include a SQLite file path.");
  const absolute = path.resolve(checkout, "server/prisma", filename);
  return `file:${absolute}${query.length ? `?${query.join("?")}` : ""}`;
}

export function availableFrontendPort(first = 5173) {
  // On macOS, a loopback bind may succeed even when another service already
  // listens on the same port on a wildcard address. Check all TCP listeners.
  const result = spawnSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fn"], {
    encoding: "utf8",
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error("Could not list listening ports. Install lsof to run local development.");
  }
  const occupied = new Set(
    [...result.stdout.matchAll(/^n.*:(\d+)$/gm)].map((match) => Number(match[1])),
  );
  for (let port = first; port <= 65535; port++) {
    if (!occupied.has(port)) return port;
  }
  throw new Error("No free frontend port is available.");
}
