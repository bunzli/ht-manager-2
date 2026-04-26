import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler";
import { parseIntParam, errorResponse } from "../lib/routeUtils";
import {
  trainModel,
  getLatestModel,
  predictForPlayer,
  predictForStudyPlayers,
  predictFromSkills,
} from "../services/pricePredictor.service";

export function createPriceModelRouter(prisma: PrismaClient) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      try {
        const model = await getLatestModel(prisma);
        res.json({ model });
      } catch (err) {
        errorResponse(res, "Failed to get model status", err);
      }
    }),
  );

  router.post(
    "/train",
    asyncHandler(async (_req, res) => {
      try {
        const result = await trainModel(prisma);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Training failed", err, 422);
      }
    }),
  );

  router.get(
    "/predict/player/:playerId",
    asyncHandler(async (req, res) => {
      const playerId = parseIntParam(req, res, "playerId");
      if (playerId === null) return;
      try {
        const result = await predictForPlayer(prisma, playerId);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Prediction failed", err);
      }
    }),
  );

  router.get(
    "/predict/study/:studyId",
    asyncHandler(async (req, res) => {
      const studyId = parseIntParam(req, res, "studyId");
      if (studyId === null) return;
      try {
        const predictions = await predictForStudyPlayers(prisma, studyId);
        res.json({ predictions });
      } catch (err) {
        errorResponse(res, "Prediction failed", err);
      }
    }),
  );

  router.post(
    "/predict",
    asyncHandler(async (req, res) => {
      const skills = req.body;
      if (!skills || typeof skills.age !== "number") {
        res.status(400).json({ error: "Request body must include player skill fields" });
        return;
      }
      try {
        const result = await predictFromSkills(prisma, skills);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Prediction failed", err);
      }
    }),
  );

  return router;
}
