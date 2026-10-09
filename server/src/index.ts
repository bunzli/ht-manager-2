import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { createChppClient } from "./chpp/client";
import { createPlayersRouter } from "./routes/players";
import { createMarketStudiesRouter } from "./routes/marketStudies";
import { createPriceModelRouter } from "./routes/priceModel";
import { createTrainingRouter } from "./routes/training";
import { createYouthRouter } from "./routes/youth";
import { createMcpRouter } from "./routes/mcp";
import { startScheduler } from "./jobs/scheduler";
import { globalErrorHandler } from "./lib/errorMiddleware";
import { createProductionBasicAuth } from "./lib/basicAuth";

const basicAuth = createProductionBasicAuth();
const prisma = new PrismaClient();
const chpp = createChppClient();

const app = express();
app.use("/mcp", createMcpRouter(prisma));
app.use(basicAuth);
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/players", createPlayersRouter(prisma, chpp));
app.use("/api/market-studies", createMarketStudiesRouter(prisma, chpp));
app.use("/api/price-model", createPriceModelRouter(prisma));
app.use("/api/training", createTrainingRouter(prisma));
app.use("/api/youth", createYouthRouter(prisma, chpp));

app.use(globalErrorHandler);

if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = app.listen(PORT, () => {
  const address = server.address();
  const port = address && typeof address !== "string" ? address.port : PORT;
  console.log(`[server] Running on http://localhost:${port}`);
  startScheduler();
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
