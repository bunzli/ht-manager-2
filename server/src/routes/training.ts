import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler";
import { errorResponse } from "../lib/routeUtils";
import {
  getTeamSettings,
  getTrainingProgress,
  focusSkillForProgram,
  lastMatchFromDetails,
  listPrograms,
  updateTrainingSettings,
} from "../services/training.service";

export function createTrainingRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    "/programs",
    asyncHandler(async (_req, res) => {
      res.json({ programs: listPrograms() });
    }),
  );

  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const settings = await getTeamSettings(prisma);
      res.json({
        ...settings,
        trainingFocusSkillKey: focusSkillForProgram(
          settings.trainingTypeId,
          settings.trainingFocusSkillKey,
        ),
      });
    }),
  );

  router.patch(
    "/settings",
    asyncHandler(async (req, res) => {
      try {
        const settings = await updateTrainingSettings(prisma, req.body ?? {});
        res.json({
          ...settings,
          trainingFocusSkillKey: focusSkillForProgram(
            settings.trainingTypeId,
            settings.trainingFocusSkillKey,
          ),
        });
      } catch (err) {
        errorResponse(res, "Invalid training type", err, 400);
      }
    }),
  );

  router.get(
    "/progress",
    asyncHandler(async (req, res) => {
      const trainingTypeId = parseInt(String(req.query.trainingTypeId ?? ""), 10);
      if (Number.isNaN(trainingTypeId)) {
        return errorResponse(res, "trainingTypeId query param is required", null, 400);
      }

      const trackings = await prisma.playerTracking.findMany({
        where: { isTracking: true },
        include: { latestDetails: true },
      });

      const playerIds = trackings.map((t) => t.playerId);
      const lastMatchByPlayer = new Map(
        trackings
          .filter((t) => t.latestDetails)
          .map((t) => [
            t.playerId,
            lastMatchFromDetails({
              lastMatchDate: t.latestDetails!.lastMatchDate,
              lastMatchPositionCode: t.latestDetails!.lastMatchPositionCode,
              lastMatchPlayedMinutes: t.latestDetails!.lastMatchPlayedMinutes,
            }),
          ]),
      );

      const progress = await getTrainingProgress(
        prisma,
        playerIds,
        trainingTypeId,
        lastMatchByPlayer,
        focusSkillForProgram(
          trainingTypeId,
          (await getTeamSettings(prisma)).trainingFocusSkillKey,
        ) ?? undefined,
      );

      res.json({ trainingTypeId, progress });
    }),
  );

  return router;
}
