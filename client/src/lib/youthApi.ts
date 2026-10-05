export const YOUTH_SKILLS = [
  { key: "keeper", label: "Keeper" },
  { key: "defender", label: "Defending" },
  { key: "playmaker", label: "Playmaking" },
  { key: "winger", label: "Winger" },
  { key: "scorer", label: "Scoring" },
  { key: "passing", label: "Passing" },
  { key: "setPieces", label: "Set pieces" },
] as const;
export type YouthSkillKey = (typeof YOUTH_SKILLS)[number]["key"];
export interface YouthSkill {
  current: number | null;
  potential: number | null;
  currentAvailable: boolean;
  potentialAvailable: boolean;
  isMaxReached: boolean;
}
export type YouthSkills = Record<YouthSkillKey, YouthSkill>;
export interface YouthChange {
  id: number;
  detectedAt: string;
  kind: string;
  key: string;
  oldValue: string | null;
  newValue: string | null;
}
export interface YouthPlayer {
  youthPlayerId: number;
  youthTeamId: number;
  firstName: string;
  nickName: string;
  lastName: string;
  age: number;
  ageDays: number;
  specialty: number | null;
  isActive: boolean;
  archivedAt: string | null;
  fetchedAt: string;
  skills: YouthSkills;
  lastMatch: {
    matchId: number;
    date: string;
    positionCode: number | null;
    playedMinutes: number | null;
    ratingStars: number | null;
  } | null;
  recentChanges?: YouthChange[];
  lastChangeAt?: string | null;
}
export interface YouthSquadResponse {
  status: "not_synced" | "no_academy" | "ready";
  academy: { youthTeamId: number; name: string } | null;
  fetchedAt: string | null;
  players: YouthPlayer[];
}
export interface YouthRefreshResponse extends YouthSquadResponse {
  sync: {
    playersStored: number;
    matchesFound: number;
    lineupsStored: number;
    failures: { matchId: number | null; message: string }[];
  };
}
export interface YouthPlayerResponse {
  player: YouthPlayer;
  history: { at: string; skills: YouthSkills }[];
  changes: YouthChange[];
  matches: {
    matchId: number;
    matchDate: string;
    matchType: number;
    opponentTeamName: string;
    isHome: boolean;
    goalsFor: number | null;
    goalsAgainst: number | null;
    roleId: number;
    positionCode: number | null;
    behaviour: number | null;
    ratingStars: number | null;
    playedMinutes: number | null;
  }[];
}
async function request<T>(path: string, method = "GET"): Promise<T> {
  const response = await fetch(`/api/youth${path}`, { method });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      details?: string;
    } | null;
    throw new Error(body?.details ?? body?.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export const fetchYouthSquad = () => request<YouthSquadResponse>("");
export const refreshYouthSquad = () => request<YouthRefreshResponse>("/refresh", "POST");
export const fetchYouthPlayer = (id: number) => request<YouthPlayerResponse>(`/players/${id}`);
export const youthPlayerName = (p: YouthPlayer) =>
  [p.firstName, p.nickName ? `“${p.nickName}”` : "", p.lastName].filter(Boolean).join(" ");

export function youthChangeLabel(change: YouthChange) {
  const [key, field] = change.key.split(".");
  const label =
    YOUTH_SKILLS.find((skill) => skill.key === key)?.label ??
    {
      firstName: "First name",
      nickName: "Nickname",
      lastName: "Last name",
      specialty: "Specialty",
      membership: "Academy",
    }[key] ??
    key;
  const before = change.oldValue ?? "?";
  const after = change.newValue ?? "?";
  switch (change.kind) {
    case "current_discovered":
      return `${label} discovered: ${after}`;
    case "potential_discovered":
      return `${label} potential discovered: ${after}`;
    case "improvement":
      return `${label} improved: ${before} → ${after}`;
    case "max_reached":
      return `${label}: maximum reached`;
    case "roster_arrival":
      return "Joined the academy";
    case "roster_departure":
      return "Left the academy";
    default:
      return `${label}${field === "potential" ? " potential" : field === "isMaxReached" ? " maximum reached" : ""}: ${before} → ${after}`;
  }
}
