import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}

export function createProductionBasicAuth(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  if (env.NODE_ENV !== "production") return (_req, _res, next) => next();

  const username = env.BASIC_AUTH_USERNAME;
  const password = env.BASIC_AUTH_PASSWORD;
  if (!username || !password) {
    throw new Error("Production requires BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD");
  }
  if (username.includes(":")) {
    throw new Error("BASIC_AUTH_USERNAME must not contain a colon");
  }

  const usernameHash = hash(username);
  const passwordHash = hash(password);

  return (req, res, next) => {
    // Only the exact GET health check is public; other methods and paths stay protected.
    if (req.method === "GET" && req.path === "/api/health") {
      next();
      return;
    }

    const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(req.get("authorization") ?? "");
    const decoded = Buffer.from(match?.[1] ?? "", "base64");
    const credentials = decoded.toString("utf8");
    const separator = credentials.indexOf(":");
    // Buffer's decoder is permissive, so require canonical Base64 and valid UTF-8.
    const valid =
      !!match &&
      decoded.toString("base64") === match[1] &&
      Buffer.from(credentials, "utf8").equals(decoded) &&
      separator >= 0;
    const usernameMatches = timingSafeEqual(usernameHash, hash(credentials.slice(0, separator)));
    const passwordMatches = timingSafeEqual(passwordHash, hash(credentials.slice(separator + 1)));
    if (!valid || !usernameMatches || !passwordMatches) {
      res.set("WWW-Authenticate", 'Basic realm="HT Manager", charset="UTF-8"');
      res.set("Cache-Control", "no-store");
      res.status(401).send("Unauthorized");
      return;
    }
    next();
  };
}
