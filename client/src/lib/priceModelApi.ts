const BASE = "/api/price-model";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

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

export interface PlayerPrediction {
  playerId: number;
  predictedPrice: number;
}

export interface StudyPredictions {
  predictions: Record<number, number>;
}

export function fetchPriceModelStatus(): Promise<{ model: PriceModelStatus | null }> {
  return fetchJson("/");
}

export function trainPriceModel(): Promise<TrainResponse> {
  return postJson("/train");
}

export function fetchPlayerPrediction(playerId: number): Promise<PlayerPrediction> {
  return fetchJson(`/predict/player/${playerId}`);
}

export function fetchStudyPredictions(studyId: number): Promise<StudyPredictions> {
  return fetchJson(`/predict/study/${studyId}`);
}
