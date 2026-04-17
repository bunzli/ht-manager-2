#!/usr/bin/env node
/**
 * Kills any process occupying the dev ports before starting.
 * Works on macOS and Linux using lsof.
 */
import { execSync } from "child_process";

const PORTS = [3010, 5173];

for (const port of PORTS) {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    if (pids.length === 0) continue;

    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`);
        console.log(`Killed process ${pid} on port ${port}`);
      } catch {
        // Process may have already exited
      }
    }
  } catch {
    // lsof returns non-zero when no process is found — that's fine
  }
}
