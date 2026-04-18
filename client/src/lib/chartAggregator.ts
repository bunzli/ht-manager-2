import type {
  TransferPlayerRow,
  CustomChartConfig,
  ChartBucket,
} from "./types";
import { specialtyLabel, skillLabel } from "./skills";

const SKILL_FIELDS = new Set([
  "keeperSkill",
  "staminaSkill",
  "setPiecesSkill",
  "defenderSkill",
  "scorerSkill",
  "wingerSkill",
  "passingSkill",
  "playmakerSkill",
]);

function isSkillField(field: string): boolean {
  return SKILL_FIELDS.has(field);
}

function getFieldValue(
  details: TransferPlayerRow["playerDetails"],
  field: string,
): number {
  return (details as unknown as Record<string, number>)[field] ?? 0;
}

function labelForBucket(field: string, key: number): string {
  if (field === "specialty") return specialtyLabel(key) || `#${key}`;
  if (field === "age") return String(key);
  if (isSkillField(field)) return `${key} (${skillLabel(key)})`;
  return String(key);
}

export function aggregateCustomChart(
  players: TransferPlayerRow[],
  config: CustomChartConfig,
): ChartBucket[] {
  const sold = players.filter(
    (p) => p.status === "sold" && p.finalPrice != null,
  );

  const filtered = sold.filter((p) => {
    for (const f of config.filters) {
      const val = getFieldValue(p.playerDetails, f.field);
      if (isSkillField(f.field)) {
        if (val < f.value) return false;
      } else {
        if (val !== f.value) return false;
      }
    }
    return true;
  });

  const groups = new Map<number, number[]>();
  for (const p of filtered) {
    const key = getFieldValue(p.playerDetails, config.groupBy);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p.finalPrice!);
  }

  return Array.from(groups.entries())
    .map(([key, prices]) => ({
      key,
      label: labelForBucket(config.groupBy, key),
      avgPrice: Math.round(
        prices.reduce((s, p) => s + p, 0) / prices.length,
      ),
      count: prices.length,
    }))
    .sort((a, b) => a.key - b.key);
}
