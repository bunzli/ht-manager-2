import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { ChppClient } from "../chpp/client";
import { asyncHandler } from "../lib/asyncHandler";
import { errorResponse } from "../lib/routeUtils";
import {
  getYouthSquad,
  getYouthPlayer,
  refreshYouthSquad,
  YouthRefreshBusy,
} from "../services/youth.service";

export function createYouthRouter(prisma: PrismaClient, chpp: ChppClient) {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(await getYouthSquad(prisma));
    }),
  );
  router.post(
    "/refresh",
    asyncHandler(async (_req, res) => {
      try {
        res.json(await refreshYouthSquad(prisma, chpp));
      } catch (err) {
        errorResponse(
          res,
          "Failed to refresh youth squad",
          err,
          err instanceof YouthRefreshBusy ? 409 : 502,
        );
      }
    }),
  );
  router.get(
    "/players/:id",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "Invalid youth player ID" });
        return;
      }
      const player = await getYouthPlayer(prisma, id);
      if (!player) {
        res.status(404).json({ error: "Youth player not found" });
        return;
      }
      res.json(player);
    }),
  );
  return router;
}
