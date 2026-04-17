import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import { asyncHandler } from "../lib/asyncHandler";
import { parseIntParam, errorResponse } from "../lib/routeUtils";
import {
  getPlayersFromDb,
  refreshPlayersFromChpp,
  getPlayerDetail,
  setPositionOverride,
} from "../services/player.service";

export function createPlayersRouter(prisma: PrismaClient, chpp: ChppClient) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const result = await getPlayersFromDb(prisma);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to read players", err);
      }
    }),
  );

  router.post(
    "/refresh",
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const result = await refreshPlayersFromChpp(prisma, chpp);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to refresh players", err);
      }
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const playerId = parseIntParam(req, res, "id");
      if (playerId === null) return;

      try {
        const result = await getPlayerDetail(prisma, playerId);
        if (!result) {
          res.status(404).json({ error: "Player not found" });
          return;
        }
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to read player", err);
      }
    }),
  );

  router.patch(
    "/:id/position-override",
    asyncHandler(async (req: Request, res: Response) => {
      const playerId = parseIntParam(req, res, "id");
      if (playerId === null) return;

      const { positionOverride: override } = req.body as {
        positionOverride: string | null;
      };

      try {
        const result = await setPositionOverride(prisma, playerId, override);
        if (!result) {
          res.status(404).json({ error: "Player tracking not found" });
          return;
        }
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to update position override", err);
      }
    }),
  );

  return router;
}
