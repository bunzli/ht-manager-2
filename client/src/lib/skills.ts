export const SKILL_LEVELS: Record<number, string> = {
  0: "non-existent",
  1: "disastrous",
  2: "wretched",
  3: "poor",
  4: "weak",
  5: "inadequate",
  6: "passable",
  7: "solid",
  8: "excellent",
  9: "formidable",
  10: "outstanding",
  11: "brilliant",
  12: "magnificent",
  13: "world class",
  14: "supernatural",
  15: "titanic",
  16: "extra-terrestrial",
  17: "mythical",
  18: "magical",
  19: "utopian",
  20: "divine",
};

export function skillLabel(level: number): string {
  return SKILL_LEVELS[level] ?? `${level}`;
}

export function skillColor(level: number, maxLevel = 20): string {
  if (maxLevel === 8) {
    const COLORS_8: Record<number, string> = {
      1: "bg-red-600",
      2: "bg-red-400",
      3: "bg-orange-400",
      4: "bg-amber-400",
      5: "bg-yellow-400",
      6: "bg-lime-400",
      7: "bg-green-500",
      8: "bg-emerald-500",
    };
    return COLORS_8[Math.max(1, Math.min(8, level))] ?? "bg-gray-300";
  }
  const n = (level / maxLevel) * 20;
  if (n <= 3) return "bg-red-400";
  if (n <= 5) return "bg-orange-400";
  if (n <= 7) return "bg-yellow-400";
  if (n <= 10) return "bg-lime-400";
  if (n <= 14) return "bg-green-500";
  return "bg-emerald-500";
}

export const SPECIALTY_NAMES: Record<number, string> = {
  0: "",
  1: "Technical",
  2: "Quick",
  3: "Powerful",
  4: "Unpredictable",
  5: "Head specialist",
  6: "Resilient",
  8: "Support",
};

const WIKI_BASE = "https://wiki.hattrick.org";

export const SPECIALTY_ICONS: Record<number, string> = {
  1: `${WIKI_BASE}/images/d/d5/Spec1Technic.png`,
  2: `${WIKI_BASE}/images/6/68/Spec2Quick.png`,
  3: `${WIKI_BASE}/images/0/0f/Spec3Power.png`,
  4: `${WIKI_BASE}/images/4/43/Spec4Unpred.png`,
  5: `${WIKI_BASE}/images/4/43/Spec5Head.png`,
  6: `${WIKI_BASE}/images/9/9e/Spec6Regainer.png`,
  8: `${WIKI_BASE}/images/b/b6/Spec7support.png`,
};

export function specialtyLabel(id: number): string {
  return SPECIALTY_NAMES[id] ?? "";
}

export function specialtyIcon(id: number): string | null {
  return SPECIALTY_ICONS[id] ?? null;
}

export const FORM_LABELS: Record<number, string> = {
  1: "disastrous",
  2: "wretched",
  3: "poor",
  4: "weak",
  5: "inadequate",
  6: "passable",
  7: "solid",
  8: "excellent",
};

export function formLabel(level: number): string {
  return FORM_LABELS[level] ?? `${level}`;
}

export const SKILL_KEYS = [
  { key: "staminaSkill", label: "Stamina" },
  { key: "keeperSkill", label: "Keeper" },
  { key: "playmakerSkill", label: "Playmaking" },
  { key: "scorerSkill", label: "Scoring" },
  { key: "passingSkill", label: "Passing" },
  { key: "wingerSkill", label: "Winger" },
  { key: "defenderSkill", label: "Defending" },
  { key: "setPiecesSkill", label: "Set Pieces" },
] as const;
