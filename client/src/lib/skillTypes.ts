export const SKILL_TYPE_MAP: { id: number; label: string; field: string }[] = [
  { id: 1, label: "Keeper", field: "keeperSkill" },
  { id: 2, label: "Stamina", field: "staminaSkill" },
  { id: 3, label: "Set Pieces", field: "setPiecesSkill" },
  { id: 4, label: "Defending", field: "defenderSkill" },
  { id: 5, label: "Scoring", field: "scorerSkill" },
  { id: 6, label: "Winger", field: "wingerSkill" },
  { id: 7, label: "Passing", field: "passingSkill" },
  { id: 8, label: "Playmaking", field: "playmakerSkill" },
];

export const SKILL_TYPE_LABELS: Record<number, string> = Object.fromEntries(
  SKILL_TYPE_MAP.map((s) => [s.id, s.label]),
);

export const SKILL_TYPE_TO_FIELD: Record<number, string> = Object.fromEntries(
  SKILL_TYPE_MAP.map((s) => [s.id, s.field]),
);
