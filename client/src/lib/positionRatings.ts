// Display metadata for each HT position.
// Scoring is computed server-side and returned via the API as `positionScores`.
// Source: https://wiki.hattrick.org/wiki/Contribution
//
// Weights below are the raw wiki skill-contribution coefficients (normal orders).
// The server normalises by Σw and applies form / stamina / XP / loyalty / specialty
// modifiers, so the displayed score is a weighted-average effective skill.

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
      keeperSkill: 0.74,
      defenderSkill: 0.30,
    },
  },
  {
    id: "centralDefender",
    label: "Central Defender",
    shortLabel: "CD",
    weights: {
      defenderSkill: 1.0,
      playmakerSkill: 0.25,
    },
  },
  {
    id: "wingBack",
    label: "Wing Back",
    shortLabel: "WB",
    weights: {
      defenderSkill: 1.3,
      playmakerSkill: 0.1,
      wingerSkill: 0.45,
    },
  },
  {
    id: "innerMidfielder",
    label: "Inner Midfielder",
    shortLabel: "IM",
    weights: {
      playmakerSkill: 1.0,
      defenderSkill: 0.4,
      passingSkill: 0.33,
      scorerSkill: 0.22,
    },
  },
  {
    id: "winger",
    label: "Winger",
    shortLabel: "W",
    weights: {
      defenderSkill: 0.55,
      playmakerSkill: 0.45,
      wingerSkill: 0.86,
      passingSkill: 0.37,
    },
  },
  {
    id: "forward",
    label: "Forward",
    shortLabel: "FW",
    weights: {
      scorerSkill: 1.0,
      passingSkill: 0.369,
      playmakerSkill: 0.25,
    },
  },
];
