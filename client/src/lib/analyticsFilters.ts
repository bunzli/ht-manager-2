import { SKILL_KEYS } from "./skills";
import type { TransferPlayerRow } from "./types";

export const ANALYTICS_SKILL_STORAGE_KEY = "analyticsSkillType";

export type TableStatusFilter = "all" | "listed" | "sold" | "ended" | "not_sold";

export type StudySelection = "all" | number[];

/** Non-zero specialty ids we expose in UI (matches MarketStudyForm checkboxes). */
export const ANALYTICS_SPECIALTY_IDS = [1, 2, 3, 4, 5, 6, 8] as const;

export type SpecialtySelection = "all" | number[];

export type SkillRanges = Record<string, [number, number]>;

export function defaultSkillRanges(): SkillRanges {
  const m: SkillRanges = {};
  for (const s of SKILL_KEYS) {
    m[s.key] = [0, 20];
  }
  return m;
}

export interface AnalyticsFilterModel {
  studyIds: StudySelection;
  specialtyIds: SpecialtySelection;
  ageRange: [number, number];
  priceRange: [number, number];
  skillRanges: SkillRanges;
  tableStatus: TableStatusFilter;
}

export function initialAnalyticsFilters(): AnalyticsFilterModel {
  return {
    studyIds: "all",
    specialtyIds: "all",
    ageRange: [17, 50],
    priceRange: [0, 1_000_000_000],
    skillRanges: defaultSkillRanges(),
    tableStatus: "listed",
  };
}

function passesStudy(p: TransferPlayerRow, studyIds: StudySelection): boolean {
  if (studyIds === "all") return true;
  const sid = p.marketStudyId ?? -1;
  return studyIds.includes(sid);
}

function passesAge(p: TransferPlayerRow, [aMin, aMax]: [number, number]): boolean {
  const a = p.playerDetails.age;
  return a >= aMin && a <= aMax;
}

function passesPriceSold(p: TransferPlayerRow, [pMin, pMax]: [number, number]): boolean {
  const fp = p.finalPrice ?? 0;
  return fp >= pMin && fp <= pMax;
}

function passesPriceListed(
  p: TransferPlayerRow,
  [pMin, pMax]: [number, number],
): boolean {
  const price =
    p.status === "listed"
      ? p.highestBid > 0
        ? p.highestBid
        : p.askingPrice
      : (p.finalPrice ?? 0);
  return price >= pMin && price <= pMax;
}

function passesSkills(p: TransferPlayerRow, skillRanges: SkillRanges): boolean {
  const d = p.playerDetails as unknown as Record<string, number>;
  for (const [field, [lo, hi]] of Object.entries(skillRanges)) {
    const v = d[field] ?? 0;
    if (v < lo || v > hi) return false;
  }
  return true;
}

function passesSpecialty(
  p: TransferPlayerRow,
  specialtyIds: SpecialtySelection,
): boolean {
  if (specialtyIds === "all") return true;
  const spec = p.playerDetails.specialty;
  return specialtyIds.includes(spec);
}

/** Sold rows: studies, age, price, skills — no specialty filter (used for age double-bar base). */
export function filterSoldGlobal(
  players: TransferPlayerRow[],
  f: Pick<AnalyticsFilterModel, "studyIds" | "ageRange" | "priceRange" | "skillRanges">,
): TransferPlayerRow[] {
  return players.filter(
    (p) =>
      p.status === "sold" &&
      p.finalPrice != null &&
      passesStudy(p, f.studyIds) &&
      passesAge(p, f.ageRange) &&
      passesPriceSold(p, f.priceRange) &&
      passesSkills(p, f.skillRanges),
  );
}

/** Sold rows for charts that respect the specialty multi-select. */
export function filterSoldForCharts(
  players: TransferPlayerRow[],
  f: Omit<AnalyticsFilterModel, "tableStatus">,
): TransferPlayerRow[] {
  return filterSoldGlobal(players, f).filter((p) =>
    passesSpecialty(p, f.specialtyIds),
  );
}

/** Table rows: same as charts except price uses listed logic when needed, plus status filter. */
export function filterTablePlayers(
  players: TransferPlayerRow[],
  f: AnalyticsFilterModel,
): TransferPlayerRow[] {
  let list = players.filter(
    (p) =>
      passesStudy(p, f.studyIds) &&
      passesAge(p, f.ageRange) &&
      passesSkills(p, f.skillRanges) &&
      passesSpecialty(p, f.specialtyIds),
  );

  list = list.filter((p) => passesPriceListed(p, f.priceRange));

  if (f.tableStatus !== "all") {
    list = list.filter((p) =>
      f.tableStatus === "not_sold"
        ? p.status === "not_sold" || p.status === "expired"
        : p.status === f.tableStatus,
    );
  }

  return list;
}

export function computeBounds(players: TransferPlayerRow[]): {
  age: [number, number];
  price: [number, number];
} {
  if (players.length === 0) {
    return { age: [17, 35], price: [0, 1] };
  }
  let ageMin = 99;
  let ageMax = 0;
  let priceMin = Number.MAX_SAFE_INTEGER;
  let priceMax = 0;
  for (const p of players) {
    const a = p.playerDetails.age;
    ageMin = Math.min(ageMin, a);
    ageMax = Math.max(ageMax, a);
    const price =
      p.status === "sold" && p.finalPrice != null
        ? p.finalPrice
        : p.highestBid > 0
          ? p.highestBid
          : p.askingPrice;
    priceMin = Math.min(priceMin, price);
    priceMax = Math.max(priceMax, price);
  }
  if (priceMin === Number.MAX_SAFE_INTEGER) priceMin = 0;
  if (priceMax <= priceMin) priceMax = priceMin + 1;
  return { age: [ageMin, ageMax], price: [priceMin, priceMax] };
}
