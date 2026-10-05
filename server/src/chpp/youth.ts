import { stockholmToUtcIso } from "./parsers";

export const YOUTH_SKILLS = [
  "keeper",
  "defender",
  "playmaker",
  "winger",
  "scorer",
  "passing",
  "setPieces",
] as const;
export type YouthSkillKey = (typeof YOUTH_SKILLS)[number];
export interface YouthSkill {
  current: number | null;
  potential: number | null;
  currentAvailable: boolean;
  potentialAvailable: boolean;
  isMaxReached: boolean;
}
export type YouthSkills = Record<YouthSkillKey, YouthSkill>;
export interface YouthLastMatch {
  matchId: number;
  date: string;
  positionCode: number | null;
  playedMinutes: number | null;
  ratingStars: number | null;
}
export interface ChppYouthPlayer {
  youthPlayerId: number;
  firstName: string;
  nickName: string;
  lastName: string;
  age: number;
  ageDays: number;
  specialty: number | null;
  skills: YouthSkills;
  lastMatch: YouthLastMatch | null;
}
export interface ChppYouthAcademy {
  youthTeamId: number;
  seniorTeamId: number;
  name: string;
}

type Xml = Record<string, unknown>;
export function youthArchiveTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
function object(value: unknown): Xml {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Xml) : {};
}
function array(value: unknown): Xml[] {
  if (value == null || value === "") return [];
  return (Array.isArray(value) ? value : [value]).map(object);
}
function bool(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    (typeof value === "string" && ["true", "1"].includes(value.toLowerCase()))
  );
}
function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function integer(value: unknown, label: string, min = 0): number {
  const n = number(value);
  if (n == null || !Number.isSafeInteger(n) || n < min) throw new Error(`Invalid youth ${label}`);
  return n;
}
function envelope(data: Xml): Xml {
  const hd = object(data.HattrickData);
  if (!Object.keys(hd).length || hd.Error) throw new Error("Invalid CHPP youth response");
  return hd;
}

export function parseYouthAcademy(data: Xml, seniorTeamId: number): ChppYouthAcademy | null {
  const hd = envelope(data);
  const teams = array(object(hd.Teams).Team ?? hd.Team);
  const team = teams.find((t) => number(t.TeamID) === seniorTeamId);
  if (!team || team.YouthTeamID == null)
    throw new Error("CHPP did not return the configured team's academy status");
  const youthTeamId = integer(team.YouthTeamID, "team ID");
  return youthTeamId === 0
    ? null
    : { youthTeamId, seniorTeamId, name: String(team.YouthTeamName ?? "Youth Squad") };
}

function skillValue(value: unknown) {
  const node = object(value);
  if (!("@_IsAvailable" in node)) throw new Error("Incomplete CHPP youth skills");
  const available = bool(node["@_IsAvailable"]);
  return {
    available,
    value: available ? integer(node["#text"], "skill value") : null,
    isMaxReached: bool(node["@_IsMaxReached"]),
  };
}

export function parseYouthPlayers(data: Xml, youthTeamId: number): ChppYouthPlayer[] {
  const hd = envelope(data);
  if (!("PlayerList" in hd)) throw new Error("Missing CHPP youth player list");
  if (
    hd.PlayerList !== "" &&
    (typeof hd.PlayerList !== "object" || hd.PlayerList == null || Array.isArray(hd.PlayerList))
  )
    throw new Error("Invalid CHPP youth player list");
  if (Object.keys(object(hd.PlayerList)).length > 0 && !("YouthPlayer" in object(hd.PlayerList)))
    throw new Error("Incomplete CHPP youth player list");
  const list = array(object(hd.PlayerList).YouthPlayer);
  const seen = new Set<number>();
  return list.map((p) => {
    const youthPlayerId = integer(p.YouthPlayerID, "player ID", 1);
    if (seen.has(youthPlayerId)) throw new Error("Duplicate CHPP youth player ID");
    seen.add(youthPlayerId);
    const owner = object(p.OwningYouthTeam);
    if (integer(owner.YouthTeamID, "owning team ID", 1) !== youthTeamId)
      throw new Error("CHPP returned a different youth team");
    const rawSkills = object(p.PlayerSkills);
    const skills = {} as YouthSkills;
    for (const key of YOUTH_SKILLS) {
      const xmlKey = `${key[0].toUpperCase()}${key.slice(1)}Skill`;
      const current = skillValue(rawSkills[xmlKey]);
      const potential = skillValue(rawSkills[`${xmlKey}Max`]);
      skills[key] = {
        current: current.value,
        potential: potential.value,
        currentAvailable: current.available,
        potentialAvailable: potential.available,
        isMaxReached: current.isMaxReached,
      };
    }
    const rawMatch = object(p.LastMatch);
    const matchId = number(rawMatch.YouthMatchID);
    const date = stockholmToUtcIso(String(rawMatch.Date ?? ""));
    return {
      youthPlayerId,
      firstName: String(p.FirstName ?? ""),
      nickName: String(p.NickName ?? ""),
      lastName: String(p.LastName ?? ""),
      age: integer(p.Age, "age", 1),
      ageDays: integer(p.AgeDays, "age days"),
      specialty: number(p.Specialty) || null,
      skills,
      lastMatch:
        matchId && !Number.isNaN(new Date(date).getTime())
          ? {
              matchId,
              date,
              positionCode: number(rawMatch.PositionCode),
              playedMinutes: number(rawMatch.PlayedMinutes),
              ratingStars: number(rawMatch.Rating),
            }
          : null,
    };
  });
}
