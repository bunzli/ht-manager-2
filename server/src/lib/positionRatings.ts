// Position scoring based on HT Wiki skill-contribution research.
// Source: https://wiki.hattrick.org/wiki/Contribution
//
// Formula:
//   EffSkill(s) = (s + L + MC + XP) * F
//   PosScore    = StaminaFactor * SpecFactor * Σ(w_i * EffSkill(s_i)) / Σ(w_i)
//
// Where:
//   L  = loyalty bonus  [0.05–1.00] linear on 1–20 HT scale
//   MC = mother-club bonus: 0.5 if true, else 0
//   XP = log10(experience) * 4/3  (experience bonus, wiki approximation)
//   F  = form factor from lookup table below
//   StaminaFactor = ((stamina + 6.5) / 14)^0.6  (wiki midfield decay formula)
//   SpecFactor    = per-position specialty bonus (see SPECIALTY_FACTORS)

interface SkillSnapshot {
  keeperSkill: number;
  defenderSkill: number;
  playmakerSkill: number;
  wingerSkill: number;
  passingSkill: number;
  scorerSkill: number;
  staminaSkill?: number;
  playerForm?: number;
  experience?: number;
  loyalty?: number;
  motherClubBonus?: boolean;
  specialty?: number;
}

type PositionSkillKey =
  | "keeperSkill"
  | "defenderSkill"
  | "playmakerSkill"
  | "wingerSkill"
  | "passingSkill"
  | "scorerSkill";

interface PositionDefinition {
  weights: Partial<Record<PositionSkillKey, number>>;
}

// Form: HT scale 1 (disastrous) → 8 (excellent).
// excellent+ = 1.00 capability, lower forms reduce performance.
const FORM_FACTOR: Record<number, number> = {
  1: 0.33,
  2: 0.46,
  3: 0.60,
  4: 0.72,
  5: 0.82,
  6: 0.90,
  7: 0.96,
};

function formFactor(form: number): number {
  if (form >= 8) return 1.0;
  return FORM_FACTOR[Math.max(1, Math.round(form))] ?? 0.33;
}

// XP bonus: wiki formula log10(experience) * 4/3.
// experience=1 → 0, experience=6 → ~1.04, experience=20 → ~1.73.
function xpBonus(experience: number): number {
  if (experience <= 0) return 0;
  return Math.log10(experience) * (4 / 3);
}

// Loyalty bonus: linear interpolation 0.05–1.00 on the 1–20 HT skill scale.
function loyaltyBonus(loyalty: number): number {
  if (loyalty <= 0) return 0;
  return ((Math.max(1, Math.min(20, loyalty)) - 1) / 19) * 0.95 + 0.05;
}

// Stamina factor: wiki midfield-decay formula.
// Practical values: solid ~0.978, excellent ~1.021 (used as-is, not capped).
function staminaFactor(stamina: number): number {
  if (stamina <= 0) return 0.5;
  return Math.pow((stamina + 6.5) / 14, 0.6);
}

// Specialty IDs (from HT): 0=none, 1=Technical, 2=Quick, 3=Powerful,
// 4=Unpredictable, 5=Head, 6=Resilient, 8=Support.
// Specialty bonuses are modeling estimates grounded in wiki event/position data.
const SPECIALTY_FACTORS: Record<string, Record<number, number>> = {
  goalkeeper: {
    0: 1.0,
    1: 1.0,
    2: 1.0,
    3: 1.0,
    4: 1.06,
    5: 1.0,
    6: 1.0,
    8: 1.04,
  },
  centralDefender: {
    0: 1.0,
    1: 1.03,
    2: 1.01,
    3: 1.06,
    4: 1.02,
    5: 1.05,
    6: 1.0,
    8: 1.03,
  },
  wingBack: {
    0: 1.0,
    1: 1.03,
    2: 1.01,
    3: 1.06,
    4: 1.02,
    5: 1.05,
    6: 1.0,
    8: 1.03,
  },
  innerMidfielder: {
    0: 1.0,
    1: 1.03,
    2: 1.02,
    3: 1.04,
    4: 1.03,
    5: 1.04,
    6: 1.0,
    8: 1.03,
  },
  winger: {
    0: 1.0,
    1: 1.05,
    2: 1.08,
    3: 1.01,
    4: 1.04,
    5: 1.06,
    6: 1.0,
    8: 1.03,
  },
  forward: {
    0: 1.0,
    1: 1.05,
    2: 1.08,
    3: 1.05,
    4: 1.06,
    5: 1.06,
    6: 1.0,
    8: 1.03,
  },
};

// Weights from the HT Wiki skill-contribution table for normal (default) orders.
// The score is a weighted AVERAGE of effective skills (divided by Σw), then
// multiplied by staminaFactor and specFactor, so all positions share the same
// ~0–20 scale and are fairly comparable.
const POSITIONS: Record<string, PositionDefinition> = {
  goalkeeper: {
    weights: {
      keeperSkill: 0.74,
      defenderSkill: 0.30,
    },
  },
  centralDefender: {
    weights: {
      defenderSkill: 1.0,
      playmakerSkill: 0.25,
    },
  },
  wingBack: {
    weights: {
      defenderSkill: 1.3,
      playmakerSkill: 0.1,
      wingerSkill: 0.45,
    },
  },
  innerMidfielder: {
    weights: {
      playmakerSkill: 1.0,
      defenderSkill: 0.4,
      passingSkill: 0.33,
      scorerSkill: 0.22,
    },
  },
  winger: {
    weights: {
      defenderSkill: 0.55,
      playmakerSkill: 0.45,
      wingerSkill: 0.86,
      passingSkill: 0.37,
    },
  },
  forward: {
    weights: {
      scorerSkill: 1.0,
      passingSkill: 0.369,
      playmakerSkill: 0.25,
    },
  },
};

export type PositionScores = Record<string, number>;

export function computePositionScores(player: SkillSnapshot): PositionScores {
  const form = player.playerForm ?? 7;
  const stamina = player.staminaSkill ?? 7;
  const experience = player.experience ?? 0;
  const loyalty = player.loyalty ?? 0;
  const mc = player.motherClubBonus ? 0.5 : 0;
  const specialty = player.specialty ?? 0;

  const F = formFactor(form);
  const SF = staminaFactor(stamina);
  const L = loyaltyBonus(loyalty);
  const XP = xpBonus(experience);

  function effSkill(raw: number): number {
    return (raw + L + mc + XP) * F;
  }

  const scores: PositionScores = {};

  for (const [id, { weights }] of Object.entries(POSITIONS)) {
    const entries = Object.entries(weights) as [PositionSkillKey, number][];
    const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

    if (totalWeight === 0) {
      scores[id] = 0;
      continue;
    }

    const specFactor =
      SPECIALTY_FACTORS[id]?.[specialty] ?? 1.0;

    const rawSum = entries.reduce(
      (sum, [skill, weight]) => sum + effSkill(player[skill]) * weight,
      0,
    );

    scores[id] = SF * specFactor * (rawSum / totalWeight);
  }

  return scores;
}
