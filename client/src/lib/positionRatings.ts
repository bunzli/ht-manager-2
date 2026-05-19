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

export function getAutoBestPositionId(
  positionScores: Record<string, number>,
): string {
  return POSITION_RATINGS.reduce(
    (bestId, pos) =>
      (positionScores[pos.id] ?? 0) > (positionScores[bestId] ?? 0)
        ? pos.id
        : bestId,
    POSITION_RATINGS[0].id,
  );
}

/** Squad position: manual override, or highest-rated position. */
export function getEffectivePositionId(player: {
  positionOverride: string | null;
  positionScores: Record<string, number>;
}): string {
  return player.positionOverride ?? getAutoBestPositionId(player.positionScores);
}

export function getEffectivePosition(player: {
  positionOverride: string | null;
  positionScores: Record<string, number>;
}): { pos: PositionRating; score: number } {
  const id = getEffectivePositionId(player);
  const pos = POSITION_RATINGS.find((p) => p.id === id) ?? POSITION_RATINGS[0];
  return { pos, score: player.positionScores[id] ?? 0 };
}
