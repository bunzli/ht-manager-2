// OLS multivariate linear regression for player price prediction.
//
// Works on log(finalPrice) as the target to handle the wide price range
// and guarantee positive predictions after exp().
//
// Feature vector: [bias, 8 skills, fractional age, experience, 8 specialty one-hots]

export interface PlayerFeatureSource {
  keeperSkill: number;
  defenderSkill: number;
  playmakerSkill: number;
  wingerSkill: number;
  passingSkill: number;
  scorerSkill: number;
  setPiecesSkill: number;
  staminaSkill: number;
  age: number;
  ageDays: number;
  experience: number;
  specialty: number;
}

export const FEATURE_NAMES: string[] = [
  "bias",
  "keeperSkill",
  "defenderSkill",
  "playmakerSkill",
  "wingerSkill",
  "passingSkill",
  "scorerSkill",
  "setPiecesSkill",
  "staminaSkill",
  "age",
  "experience",
  "spec_1",
  "spec_2",
  "spec_3",
  "spec_4",
  "spec_5",
  "spec_6",
  "spec_7",
  "spec_8",
];

const SPECIALTY_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

export function extractFeatures(player: PlayerFeatureSource): number[] {
  const fractionalAge = player.age + player.ageDays / 112;
  return [
    1, // bias
    player.keeperSkill,
    player.defenderSkill,
    player.playmakerSkill,
    player.wingerSkill,
    player.passingSkill,
    player.scorerSkill,
    player.setPiecesSkill,
    player.staminaSkill,
    fractionalAge,
    player.experience,
    ...SPECIALTY_IDS.map((id) => (player.specialty === id ? 1 : 0)),
  ];
}

export interface TrainResult {
  coefficients: number[];
  featureNames: string[];
  stats: {
    sampleCount: number;
    r2: number;
    meanAbsError: number;
    medianAbsError: number;
  };
}

export function trainOLS(X: number[][], y: number[]): TrainResult {
  const n = y.length;
  const p = X[0].length;

  if (n < p + 1) {
    throw new Error(
      `Insufficient training data: ${n} samples for ${p} features. Need at least ${p + 1}.`,
    );
  }

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);

  // Ridge regularization: add small λ to diagonal to guarantee invertibility
  // when features have zero variance (e.g. specialty columns with no examples).
  const lambda = 1e-6;
  for (let i = 0; i < p; i++) XtX[i][i] += lambda;

  const XtXinv = invert(XtX);
  const Xty = matVecMul(Xt, y);
  const coefficients = matVecMul2(XtXinv, Xty);

  // Compute R² and error metrics
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  const absErrors: number[] = [];

  for (let i = 0; i < n; i++) {
    const yPred = dot(X[i], coefficients);
    ssRes += (y[i] - yPred) ** 2;
    ssTot += (y[i] - yMean) ** 2;
    absErrors.push(Math.abs(Math.exp(y[i]) - Math.exp(yPred)));
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  absErrors.sort((a, b) => a - b);
  const medianAbsError = absErrors[Math.floor(absErrors.length / 2)];
  const meanAbsError = absErrors.reduce((s, v) => s + v, 0) / n;

  return {
    coefficients,
    featureNames: FEATURE_NAMES,
    stats: {
      sampleCount: n,
      r2: Math.round(r2 * 10000) / 10000,
      meanAbsError: Math.round(meanAbsError),
      medianAbsError: Math.round(medianAbsError),
    },
  };
}

export function predict(coefficients: number[], features: number[]): number {
  const logPrice = dot(features, coefficients);
  return Math.round(Math.exp(logPrice));
}

// --- Matrix helpers (small-matrix routines for ~19×19) ---

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function transpose(M: number[][]): number[][] {
  const rows = M.length;
  const cols = M[0].length;
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = M[i][j];
    }
  }
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = B[0].length;
  const k = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let l = 0; l < k; l++) sum += A[i][l] * B[l][j];
      C[i][j] = sum;
    }
  }
  return C;
}

/** Matrix × vector → vector */
function matVecMul(M: number[][], v: number[]): number[] {
  return M.map((row) => dot(row, v));
}

/** Same as matVecMul but named distinctly for clarity in the normal equation */
function matVecMul2(M: number[][], v: number[]): number[] {
  return matVecMul(M, v);
}

/** Gauss-Jordan elimination to invert a square matrix. */
function invert(M: number[][]): number[][] {
  const n = M.length;
  // Augmented matrix [M | I]
  const aug: number[][] = M.map((row, i) => {
    const extended = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) extended[j] = row[j];
    extended[n + i] = 1;
    return extended;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxVal < 1e-12) {
      throw new Error(
        "Singular matrix — features may be linearly dependent. Try collecting more diverse training data.",
      );
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    // Eliminate column in all other rows
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[r][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}
