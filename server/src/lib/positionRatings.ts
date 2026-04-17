// Position scoring based on official HT skill contribution coefficients.
// Source: https://wiki.hattrick.org/wiki/Contribution
//
// Each coefficient = the skill's absolute contribution to a match-rating sector.
// The score is the weighted average of the relevant skills, normalised to 0–20.

interface SkillSnapshot {
  keeperSkill: number;
  defenderSkill: number;
  playmakerSkill: number;
  wingerSkill: number;
  passingSkill: number;
  scorerSkill: number;
}

type PositionSkillKey = keyof SkillSnapshot;

interface PositionDefinition {
  weights: Partial<Record<PositionSkillKey, number>>;
}

// Normal (default) individual orders per role.
// Pairs summed where a skill contributes to more than one sector of the same type.
const POSITIONS: Record<string, PositionDefinition> = {
  goalkeeper: {
    weights: {
      keeperSkill: 0.165 + 0.183,   // central defence + side defence
      defenderSkill: 0.079 + 0.082, // central defence + side defence
    },
  },
  centralDefender: {
    weights: {
      defenderSkill: 0.186 + 0.077, // central defence + side defence
      playmakerSkill: 0.035,        // midfield
    },
  },
  wingBack: {
    weights: {
      defenderSkill: 0.083 + 0.268, // central defence + side defence
      playmakerSkill: 0.023,        // midfield
      wingerSkill: 0.129,           // side attack
    },
  },
  innerMidfielder: {
    weights: {
      defenderSkill: 0.070 + 0.028, // central defence + side defence
      playmakerSkill: 0.139,        // midfield
      passingSkill: 0.028 + 0.057,  // side attack + central attack
      scorerSkill: 0.038,           // central attack
    },
  },
  winger: {
    weights: {
      defenderSkill: 0.037 + 0.104, // central defence + side defence
      playmakerSkill: 0.065,        // midfield
      wingerSkill: 0.219,           // side attack
      passingSkill: 0.054,          // side attack
      scorerSkill: 0.018,           // central attack
    },
  },
  forward: {
    weights: {
      defenderSkill: 0.041 + 0.058, // defence sectors
      playmakerSkill: 0.048,        // midfield
      wingerSkill: 0.032,           // side attack
      passingSkill: 0.178,          // central attack
      scorerSkill: 0.066,           // central attack
    },
  },
};

export type PositionScores = Record<string, number>;

// Returns a score on the 0–20 scale (weighted average of the relevant skills)
// for every position, keyed by position id.
export function computePositionScores(player: SkillSnapshot): PositionScores {
  const scores: PositionScores = {};

  for (const [id, { weights }] of Object.entries(POSITIONS)) {
    const entries = Object.entries(weights) as [PositionSkillKey, number][];
    const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

    if (totalWeight === 0) {
      scores[id] = 0;
      continue;
    }

    const rawScore = entries.reduce(
      (sum, [skill, weight]) => sum + player[skill] * weight,
      0
    );

    scores[id] = rawScore / totalWeight;
  }

  return scores;
}
