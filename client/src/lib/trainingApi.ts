import type { TrainingProgress, TrainingProgramsResponse, TrainingSettings, TrainingSettingsPayload } from "./types";

const BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export function fetchTrainingPrograms(): Promise<TrainingProgramsResponse> {
  return fetchJson<TrainingProgramsResponse>("/training/programs");
}

export function fetchTrainingSettings(): Promise<TrainingSettings> {
  return fetchJson<TrainingSettings>("/training/settings");
}

export function updateTrainingSettings(
  settings: TrainingSettingsPayload,
): Promise<TrainingSettings> {
  return patchJson<TrainingSettings>("/training/settings", settings);
}

export function fetchTrainingProgress(
  trainingTypeId: number,
): Promise<{ trainingTypeId: number; progress: TrainingProgress[] }> {
  return fetchJson(`/training/progress?trainingTypeId=${trainingTypeId}`);
}
