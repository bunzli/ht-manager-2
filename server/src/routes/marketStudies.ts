import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import { TransferSearchParams } from "../chpp/types";
import { asyncHandler } from "../lib/asyncHandler";
import { parseIntParam, errorResponse } from "../lib/routeUtils";
import {
  runSearch,
  createStudy,
  listStudies,
  getStudyDetail,
  updateStudyPlayers,
  bulkResolve,
  bulkDelete,
} from "../services/marketStudy.service";

export function createMarketStudiesRouter(
  prisma: PrismaClient,
  chpp: ChppClient,
) {
  const router = Router();

  router.post(
    "/preview",
    asyncHandler(async (req: Request, res: Response) => {
      const searchParams: TransferSearchParams = req.body.searchParams;
      const specialties: number[] = Array.isArray(req.body.specialties)
        ? req.body.specialties
        : [];

      if (
        !searchParams ||
        searchParams.ageMin === undefined ||
        searchParams.ageMax === undefined ||
        searchParams.skillType1 === undefined ||
        searchParams.minSkillValue1 === undefined ||
        searchParams.maxSkillValue1 === undefined
      ) {
        res.status(400).json({
          error:
            "searchParams must include ageMin, ageMax, skillType1, minSkillValue1, maxSkillValue1",
        });
        return;
      }

      try {
        const results = await runSearch(chpp, searchParams, specialties);
        res.json(results);
      } catch (err) {
        errorResponse(res, "Failed to preview transfer search", err);
      }
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const { name, searchParams, specialties } = req.body as {
        name: string;
        searchParams: TransferSearchParams;
        specialties?: number[];
      };

      if (!name || !searchParams) {
        res.status(400).json({ error: "name and searchParams are required" });
        return;
      }

      try {
        const result = await createStudy(
          prisma,
          chpp,
          name,
          searchParams,
          Array.isArray(specialties) ? specialties : [],
        );
        res.status(201).json(result);
      } catch (err) {
        errorResponse(res, "Failed to create market study", err);
      }
    }),
  );

  router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const result = await listStudies(prisma);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to list market studies", err);
      }
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseIntParam(req, res, "id");
      if (id === null) return;

      try {
        const result = await getStudyDetail(prisma, id);
        if (!result) {
          res.status(404).json({ error: "Market study not found" });
          return;
        }
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to get market study", err);
      }
    }),
  );

  router.post(
    "/:id/update",
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseIntParam(req, res, "id");
      if (id === null) return;

      try {
        const result = await updateStudyPlayers(prisma, chpp, id);
        if (!result) {
          res.status(404).json({ error: "Market study not found" });
          return;
        }
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to update market study", err);
      }
    }),
  );

  router.post(
    "/:id/players/update",
    asyncHandler(async (req: Request, res: Response) => {
      const studyId = parseIntParam(req, res, "id");
      if (studyId === null) return;

      const { ids } = req.body as { ids: number[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "ids must be a non-empty array" });
        return;
      }

      try {
        const result = await bulkResolve(prisma, chpp, studyId, ids);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to update transfer players", err);
      }
    }),
  );

  router.delete(
    "/:id/players",
    asyncHandler(async (req: Request, res: Response) => {
      const studyId = parseIntParam(req, res, "id");
      if (studyId === null) return;

      const { ids } = req.body as { ids: number[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "ids must be a non-empty array" });
        return;
      }

      try {
        const result = await bulkDelete(prisma, studyId, ids);
        res.json(result);
      } catch (err) {
        errorResponse(res, "Failed to delete transfer players", err);
      }
    }),
  );

  return router;
}
