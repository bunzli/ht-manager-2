import {
  PlayersResponse,
  PlayerDetailResponse,
  TransferSearchParams,
  TransferSearchResponse,
  TransferPlayerRow,
  MarketStudy,
  MarketStudyListItem,
  MarketStudyDetail,
  CustomChartConfig,
  ChartFilter,
} from "./types";

const BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export function fetchPlayers(): Promise<PlayersResponse> {
  return fetchJson<PlayersResponse>("/players");
}

export function refreshPlayers(): Promise<PlayersResponse> {
  return postJson<PlayersResponse>("/players/refresh", {});
}

export function fetchPlayer(playerId: number): Promise<PlayerDetailResponse> {
  return fetchJson<PlayerDetailResponse>(`/players/${playerId}`);
}

export async function setPositionOverride(
  playerId: number,
  positionOverride: string | null,
): Promise<void> {
  const res = await fetch(`${BASE}/players/${playerId}/position-override`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positionOverride }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
}

export function previewMarketStudy(
  searchParams: TransferSearchParams,
  specialties: number[],
): Promise<TransferSearchResponse> {
  return postJson<TransferSearchResponse>("/market-studies/preview", {
    searchParams,
    specialties,
  });
}

export function createMarketStudy(
  name: string,
  searchParams: TransferSearchParams,
  specialties: number[],
): Promise<MarketStudy> {
  return postJson<MarketStudy>("/market-studies", {
    name,
    searchParams,
    specialties,
  });
}

export function fetchMarketStudies(): Promise<MarketStudyListItem[]> {
  return fetchJson<MarketStudyListItem[]>("/market-studies");
}

export function fetchMarketStudy(id: number): Promise<MarketStudyDetail> {
  return fetchJson<MarketStudyDetail>(`/market-studies/${id}`);
}

export function updateStudy(id: number): Promise<MarketStudyDetail> {
  return postJson<MarketStudyDetail>(`/market-studies/${id}/update`, {});
}

export async function updateTransferPlayers(
  studyId: number,
  ids: number[],
): Promise<{ players: TransferPlayerRow[]; _result: { checked: number; sold: number; notSold: number; stillListed: number } }> {
  return postJson(`/market-studies/${studyId}/players/update`, { ids });
}

export async function deleteUnsoldPlayers(
  studyId: number,
): Promise<{ deleted: number }> {
  const res = await fetch(`${BASE}/market-studies/${studyId}/players/unsold`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<{ deleted: number }>;
}

export async function deleteTransferPlayers(
  studyId: number,
  ids: number[],
): Promise<{ deleted: number }> {
  const res = await fetch(`${BASE}/market-studies/${studyId}/players`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<{ deleted: number }>;
}

export function addCustomChart(
  studyId: number,
  groupBy: string,
  filters: ChartFilter[],
): Promise<CustomChartConfig> {
  return postJson<CustomChartConfig>(
    `/market-studies/${studyId}/charts`,
    { groupBy, filters },
  );
}

export async function deleteCustomChart(
  studyId: number,
  chartId: number,
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `${BASE}/market-studies/${studyId}/charts/${chartId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<{ deleted: boolean }>;
}
