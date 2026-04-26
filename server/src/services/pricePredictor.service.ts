import { PrismaClient } from "@prisma/client";
import { TRANSFER_STATUS } from "../lib/constants";
import {
  extractFeatures,
  trainOLS,
  predict,
  FEATURE_NAMES,
  type PlayerFeatureSource,
  type TrainResult,
} from "../lib/regression";

export interface PriceModelStatus {
  id: number;
  trainedAt: string;
  sampleCount: number;
  r2: number;
  meanAbsError: number;
  medianAbsError: number;
  featureCount: number;
}

export interface TrainResponse {
  model: PriceModelStatus;
}

export interface PredictionResult {
  playerId: number;
  predictedPrice: number;
}

export async function trainModel(prisma: PrismaClient): Promise<TrainResponse> {
  const soldPlayers = await prisma.transferPlayer.findMany({
    where: {
      status: TRANSFER_STATUS.SOLD,
      finalPrice: { not: null },
    },
    include: { playerDetails: true },
  });

  if (soldPlayers.length === 0) {
    throw new Error("No sold players in the database. Run market studies and resolve transfers first.");
  }

  // Filter out zero-price entries and build training data
  const validPlayers = soldPlayers.filter((p) => (p.finalPrice ?? 0) > 0);
  if (validPlayers.length < FEATURE_NAMES.length + 1) {
    throw new Error(
      `Not enough training data: ${validPlayers.length} sold players, need at least ${FEATURE_NAMES.length + 1}.`,
    );
  }

  const X: number[][] = [];
  const y: number[] = [];

  for (const tp of validPlayers) {
    const d = tp.playerDetails;
    const features = extractFeatures(d as PlayerFeatureSource);
    X.push(features);
    y.push(Math.log(tp.finalPrice!));
  }

  let result: TrainResult;
  try {
    result = trainOLS(X, y);
  } catch (err) {
    throw new Error(
      `Training failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const model = await prisma.priceModel.create({
    data: {
      coefficients: JSON.stringify(result.coefficients),
      featureNames: JSON.stringify(result.featureNames),
      metadata: JSON.stringify(result.stats),
    },
  });

  return {
    model: {
      id: model.id,
      trainedAt: model.trainedAt.toISOString(),
      featureCount: result.featureNames.length,
      ...result.stats,
    },
  };
}

export async function getLatestModel(
  prisma: PrismaClient,
): Promise<PriceModelStatus | null> {
  const model = await prisma.priceModel.findFirst({
    orderBy: { trainedAt: "desc" },
  });
  if (!model) return null;

  const stats = JSON.parse(model.metadata) as TrainResult["stats"];
  const featureNames = JSON.parse(model.featureNames) as string[];

  return {
    id: model.id,
    trainedAt: model.trainedAt.toISOString(),
    featureCount: featureNames.length,
    ...stats,
  };
}

async function loadCoefficients(prisma: PrismaClient): Promise<number[]> {
  const model = await prisma.priceModel.findFirst({
    orderBy: { trainedAt: "desc" },
  });
  if (!model) throw new Error("No trained price model found. Train one first.");
  return JSON.parse(model.coefficients) as number[];
}

export async function predictForPlayer(
  prisma: PrismaClient,
  playerId: number,
): Promise<PredictionResult> {
  const tracking = await prisma.playerTracking.findUnique({
    where: { playerId },
    include: { latestDetails: true },
  });
  if (!tracking?.latestDetails) {
    throw new Error(`Player ${playerId} not found or has no details.`);
  }

  const coefficients = await loadCoefficients(prisma);
  const features = extractFeatures(tracking.latestDetails as PlayerFeatureSource);
  const predictedPrice = predict(coefficients, features);

  return { playerId, predictedPrice };
}

export async function predictForStudyPlayers(
  prisma: PrismaClient,
  studyId: number,
): Promise<Record<number, number>> {
  const study = await prisma.marketStudy.findUnique({
    where: { id: studyId },
    include: {
      transferPlayers: {
        include: { playerDetails: true },
      },
    },
  });
  if (!study) throw new Error(`Market study ${studyId} not found.`);

  const coefficients = await loadCoefficients(prisma);
  const predictions: Record<number, number> = {};

  for (const tp of study.transferPlayers) {
    const features = extractFeatures(tp.playerDetails as PlayerFeatureSource);
    predictions[tp.id] = predict(coefficients, features);
  }

  return predictions;
}

export async function predictFromSkills(
  prisma: PrismaClient,
  skills: PlayerFeatureSource,
): Promise<{ predictedPrice: number }> {
  const coefficients = await loadCoefficients(prisma);
  const features = extractFeatures(skills);
  const predictedPrice = predict(coefficients, features);
  return { predictedPrice };
}
