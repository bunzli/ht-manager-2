import { createHash, timingSafeEqual } from "node:crypto";
import express, { Router, type ErrorRequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import { createSquadMcpServer } from "../mcp/server";

export interface McpConfig {
  accessToken?: string;
  allowedHosts: string[];
  allowedOrigins: string[];
}

function csv(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

export function mcpConfigFromEnv(): McpConfig {
  return {
    accessToken: process.env.MCP_ACCESS_TOKEN?.trim(),
    allowedHosts: csv(process.env.MCP_ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]"),
    allowedOrigins: csv(process.env.MCP_ALLOWED_ORIGINS),
  };
}

export function createMcpRouter(prisma: PrismaClient, config = mcpConfigFromEnv()) {
  const router = Router();
  if (!config.accessToken) {
    // End requests here so production never serves the frontend for a disabled MCP endpoint.
    router.use((_req, res) => {
      res.status(404).json({ error: "MCP is disabled" });
    });
    return router;
  }
  const tokenHash = createHash("sha256").update(config.accessToken).digest();
  router.use(hostHeaderValidation(config.allowedHosts));
  router.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && !config.allowedOrigins.includes(origin)) {
      res.status(403).json({ error: "Origin is not allowed" });
      return;
    }
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.vary("Origin");
    }
    // Browsers preflight without Authorization; this exposes no tools or data.
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
      res.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id",
      );
      res.sendStatus(204);
      return;
    }
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") ?? "");
    const suppliedHash = createHash("sha256")
      .update(match?.[1] ?? "")
      .digest();
    if (!match || !timingSafeEqual(tokenHash, suppliedHash)) {
      res.set("WWW-Authenticate", 'Bearer realm="ht-manager-mcp"');
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
  router.use(express.json({ limit: "64kb" }));
  router.post("/", async (req, res) => {
    const server = createSquadMcpServer(prisma);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    // Install cleanup before handling the request, including fast notifications and failures.
    res.on("close", () => {
      void server.close().catch(() => console.error("[mcp] Transport cleanup failed"));
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      console.error("[mcp] Request handling failed");
      if (!res.headersSent) {
        res
          .status(500)
          .json({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32603, message: "Internal server error" },
          });
      }
      await server.close();
    }
  });
  router.all("/", (_req, res) => {
    res.set("Allow", "POST, OPTIONS");
    res
      .status(405)
      .json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed" } });
  });
  router.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.type === "entity.too.large" ? 413 : 400;
    res
      .status(status)
      .json({ error: status === 413 ? "Request body too large" : "Invalid request body" });
  };
  router.use(errorHandler);
  return router;
}
