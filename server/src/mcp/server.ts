import type { PrismaClient } from "@prisma/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getPlayerDetail, getPlayersFromDb } from "../services/player.service";
import { getYouthPlayer, getYouthSquad } from "../services/youth.service";

const playerInput = {
  playerId: z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .describe("Hattrick player ID from the corresponding squad tool."),
  historyLimit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum entries per history collection, newest first (default 50, maximum 200)."),
};
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function toolError(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

async function readTool(read: () => Promise<object | null>): Promise<CallToolResult> {
  try {
    const data = await read();
    if (!data) return toolError("Player not found in the configured squad.");
    // Normalize dates and undefined values identically for both representations.
    const text = JSON.stringify(data);
    return { content: [{ type: "text", text }], structuredContent: JSON.parse(text) };
  } catch (error) {
    // Log neither request headers nor raw errors, which can include connection credentials.
    console.error("[mcp] Squad read failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return toolError("Unable to read squad data. Check the server configuration and database.");
  }
}

function limitCollection<T>(rows: T[], limit: number) {
  return { entries: rows.slice(0, limit), truncated: rows.length > limit };
}

export function createSquadMcpServer(prisma: PrismaClient): McpServer {
  const server = new McpServer(
    { name: "ht-manager-squads", version: "1.0.0" },
    {
      instructions:
        "Read-only access to the configured Hattrick club's saved senior and youth squads. " +
        "Use squad tools to discover player IDs. Data reflects saved snapshots, not live Hattrick data; " +
        "check fetchedAt before drawing conclusions. Unknown youth skills are null, not zero.",
    },
  );

  server.registerTool(
    "get_senior_squad",
    {
      description:
        "Read the current tracked senior squad, skills, position scores, training metrics, " +
        "recent changes and snapshot timestamps. Does not refresh Hattrick data.",
      inputSchema: {},
      annotations,
    },
    () => readTool(() => getPlayersFromDb(prisma)),
  );

  server.registerTool(
    "get_senior_player",
    {
      description:
        "Read a tracked senior player's details, skill and training history, changes and " +
        "saved match appearances. History collections are newest first and report truncation.",
      inputSchema: playerInput,
      annotations,
    },
    ({ playerId, historyLimit }) =>
      readTool(async () => {
        const detail = await getPlayerDetail(prisma, playerId, {
          requireTracked: true,
          matchLimit: historyLimit + 1,
        });
        if (!detail) return null;
        const history = limitCollection([...detail.history].reverse(), historyLimit);
        const changes = limitCollection(detail.allChanges, historyLimit);
        const matches = limitCollection(detail.matches, historyLimit);
        const recentChanges = limitCollection(detail.player.recentChanges, historyLimit);
        return {
          player: { ...detail.player, recentChanges: recentChanges.entries },
          history: history.entries,
          changes: changes.entries,
          matches: matches.entries,
          truncated: {
            history: history.truncated,
            changes: changes.truncated,
            matches: matches.truncated,
            recentChanges: recentChanges.truncated,
          },
        };
      }),
  );

  server.registerTool(
    "get_youth_squad",
    {
      description:
        "Read academy status, youth players, known current and potential skills, recent " +
        "changes and snapshot timestamps. Unknown skills stay null. Optionally include archived players.",
      inputSchema: { includeArchived: z.boolean().default(false) },
      annotations,
    },
    ({ includeArchived }) =>
      readTool(async () => {
        const squad = await getYouthSquad(prisma);
        return {
          ...squad,
          players: squad.players.filter((player) => includeArchived || player.isActive),
        };
      }),
  );

  server.registerTool(
    "get_youth_player",
    {
      description:
        "Read an active or archived youth player's details, current and potential skill " +
        "history, changes and match appearances within the configured club. Histories are newest first.",
      inputSchema: playerInput,
      annotations,
    },
    ({ playerId, historyLimit }) =>
      readTool(async () => {
        const detail = await getYouthPlayer(prisma, playerId);
        if (!detail) return null;
        const history = limitCollection([...detail.history].reverse(), historyLimit);
        const changes = limitCollection(detail.changes, historyLimit);
        const matches = limitCollection(detail.matches, historyLimit);
        return {
          player: detail.player,
          history: history.entries,
          changes: changes.entries,
          matches: matches.entries,
          truncated: {
            history: history.truncated,
            changes: changes.truncated,
            matches: matches.truncated,
          },
        };
      }),
  );

  return server;
}
