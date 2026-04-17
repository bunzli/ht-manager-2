// Display metadata for each HT position.
// Scoring is computed server-side and returned via the API as `positionScores`.
// Source: https://wiki.hattrick.org/wiki/Contribution

export type PositionSkillKey =
  | "keeperSkill"
  | "defenderSkill"
  | "playmakerSkill"
  | "wingerSkill"
  | "passingSkill"
  | "scorerSkill";

export interface PositionRating {
  id: string;
  label: string;
  shortLabel: string;
  // Weight breakdown used only for display (skill % labels in the UI).
  weights: Partial<Record<PositionSkillKey, number>>;
}

export const POSITION_RATINGS: PositionRating[] = [
  {
    id: "goalkeeper",
    label: "Goalkeeper",
    shortLabel: "GK",
    weights: {
      keeperSkill: 0.165 + 0.183,
      defenderSkill: 0.079 + 0.082,
    },
  },
  {
    id: "centralDefender",
    label: "Central Defender",
    shortLabel: "CD",
    weights: {
      defenderSkill: 0.186 + 0.077,
      playmakerSkill: 0.035,
    },
  },
  {
    id: "wingBack",
    label: "Wing Back",
    shortLabel: "WB",
    weights: {
      defenderSkill: 0.083 + 0.268,
      playmakerSkill: 0.023,
      wingerSkill: 0.129,
    },
  },
  {
    id: "innerMidfielder",
    label: "Inner Midfielder",
    shortLabel: "IM",
    weights: {
      defenderSkill: 0.070 + 0.028,
      playmakerSkill: 0.139,
      passingSkill: 0.028 + 0.057,
      scorerSkill: 0.038,
    },
  },
  {
    id: "winger",
    label: "Winger",
    shortLabel: "W",
    weights: {
      defenderSkill: 0.037 + 0.104,
      playmakerSkill: 0.065,
      wingerSkill: 0.219,
      passingSkill: 0.054,
      scorerSkill: 0.018,
    },
  },
  {
    id: "forward",
    label: "Forward",
    shortLabel: "FW",
    weights: {
      defenderSkill: 0.041 + 0.058,
      playmakerSkill: 0.048,
      wingerSkill: 0.032,
      passingSkill: 0.178,
      scorerSkill: 0.066,
    },
  },
];
