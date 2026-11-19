/**
 * Statistics primitives for A/B test simulation.
 * Implemented from scratch: seeded PRNG, normal CDF, two-proportion z-test,
 * Wald confidence intervals, binomial sampling, sample-size calculator.
 */

/** Mulberry32 — fast 32-bit seeded PRNG. Returns values in [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Error function via Abramowitz & Stegun 7.1.26 approximation.
 * Max absolute error ≈ 1.5e-7.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal CDF Φ(x). */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Inverse standard normal CDF via rational approximation (Acklam). */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580577e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/**
 * Sample from Binomial(n, p) using the seeded RNG.
 * Uses a Bernoulli loop for n ≤ 100, otherwise a normal approximation with continuity correction.
 */
export function sampleBinomial(n: number, p: number, rng: () => number): number {
  if (n <= 0) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;

  if (n <= 100) {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (rng() < p) successes++;
    }
    return successes;
  }

  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  // Box-Muller
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const approx = Math.round(mean + sd * z);
  return Math.min(n, Math.max(0, approx));
}

export interface TwoProportionResult {
  z: number;
  pValue: number;
  p1: number;
  p2: number;
  pooled: number;
}

/**
 * Two-sided two-proportion z-test (pooled SE under H0: p1 = p2).
 * Returns p-value = 1 when either arm has zero visitors.
 */
export function twoProportionZTest(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number,
): TwoProportionResult {
  if (nA <= 0 || nB <= 0) {
    return { z: 0, pValue: 1, p1: 0, p2: 0, pooled: 0 };
  }

  const p1 = successesA / nA;
  const p2 = successesB / nB;
  const pooled = (successesA + successesB) / (nA + nB);

  if (pooled <= 0 || pooled >= 1) {
    return { z: 0, pValue: 1, p1, p2, pooled };
  }

  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) {
    return { z: 0, pValue: 1, p1, p2, pooled };
  }

  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, pValue, p1, p2, pooled };
}

export interface ProportionCI {
  p: number;
  lower: number;
  upper: number;
}

/** Wald (normal) confidence interval for a binomial proportion. */
export function proportionCI(successes: number, n: number, zCrit = 1.96): ProportionCI {
  if (n <= 0) return { p: 0, lower: 0, upper: 0 };
  const p = successes / n;
  const se = Math.sqrt((p * (1 - p)) / n);
  return {
    p,
    lower: Math.max(0, p - zCrit * se),
    upper: Math.min(1, p + zCrit * se),
  };
}

export interface SimulationParams {
  baselineRate: number;
  /** Relative uplift, e.g. 0.1 = +10%. Use 0 for A/A. */
  trueUplift: number;
  dailyTrafficPerArm: number;
  days: number;
  alpha: number;
  seed: number;
}

export interface DaySnapshot {
  day: number;
  visitorsA: number;
  visitorsB: number;
  conversionsA: number;
  conversionsB: number;
  rateA: number;
  rateB: number;
  ciA: ProportionCI;
  ciB: ProportionCI;
  pValue: number;
  z: number;
}

export interface SimulationResult {
  days: DaySnapshot[];
  /** First day (1-indexed) where cumulative p < alpha, or null if never. */
  peekDay: number | null;
  finalPValue: number;
  trueRateA: number;
  trueRateB: number;
}

/** Simulate an A/B test day-by-day with cumulative stats. */
export function simulateAbTest(params: SimulationParams): SimulationResult {
  const { baselineRate, trueUplift, dailyTrafficPerArm, days, alpha, seed } = params;

  const rateA = clamp01(baselineRate);
  const rateB = clamp01(baselineRate * (1 + trueUplift));
  const rng = createRng(seed);

  let conversionsA = 0;
  let conversionsB = 0;
  let visitorsA = 0;
  let visitorsB = 0;
  let peekDay: number | null = null;
  const snapshots: DaySnapshot[] = [];

  for (let day = 1; day <= days; day++) {
    const dayA = sampleBinomial(dailyTrafficPerArm, rateA, rng);
    const dayB = sampleBinomial(dailyTrafficPerArm, rateB, rng);
    conversionsA += dayA;
    conversionsB += dayB;
    visitorsA += dailyTrafficPerArm;
    visitorsB += dailyTrafficPerArm;

    const test = twoProportionZTest(conversionsA, visitorsA, conversionsB, visitorsB);
    const ciA = proportionCI(conversionsA, visitorsA);
    const ciB = proportionCI(conversionsB, visitorsB);

    if (peekDay === null && test.pValue < alpha) {
      peekDay = day;
    }

    snapshots.push({
      day,
      visitorsA,
      visitorsB,
      conversionsA,
      conversionsB,
      rateA: test.p1,
      rateB: test.p2,
      ciA,
      ciB,
      pValue: test.pValue,
      z: test.z,
    });
  }

  return {
    days: snapshots,
    peekDay,
    finalPValue: snapshots[snapshots.length - 1]?.pValue ?? 1,
    trueRateA: rateA,
    trueRateB: rateB,
  };
}

export interface PeekingTrapResult {
  simulations: number;
  endOnlyFalsePositives: number;
  peekingFalsePositives: number;
  endOnlyRate: number;
  peekingRate: number;
  alpha: number;
  days: number;
}

/**
 * Run N A/A simulations (true uplift = 0) and compare:
 * - end-only: declare significance only if final p < alpha
 * - peeking: declare significance if ANY day's cumulative p < alpha
 */
export function runPeekingTrap(options: {
  simulations: number;
  baselineRate: number;
  dailyTrafficPerArm: number;
  days: number;
  alpha: number;
  seed: number;
  onProgress?: (done: number, total: number) => void;
}): PeekingTrapResult {
  const { simulations, baselineRate, dailyTrafficPerArm, days, alpha, seed, onProgress } = options;

  let endOnly = 0;
  let peeking = 0;
  const master = createRng(seed);

  for (let i = 0; i < simulations; i++) {
    const simSeed = Math.floor(master() * 0xffffffff);
    const result = simulateAbTest({
      baselineRate,
      trueUplift: 0,
      dailyTrafficPerArm,
      days,
      alpha,
      seed: simSeed,
    });

    if (result.finalPValue < alpha) endOnly++;
    if (result.peekDay !== null) peeking++;

    if (onProgress && (i + 1) % 50 === 0) {
      onProgress(i + 1, simulations);
    }
  }

  onProgress?.(simulations, simulations);

  return {
    simulations,
    endOnlyFalsePositives: endOnly,
    peekingFalsePositives: peeking,
    endOnlyRate: endOnly / simulations,
    peekingRate: peeking / simulations,
    alpha,
    days,
  };
}

/**
 * Per-arm sample size for a two-sided two-proportion z-test at given power.
 * Uses the unpooled variance formula.
 */
export function sampleSizePerArm(
  baselineRate: number,
  uplift: number,
  alpha = 0.05,
  power = 0.8,
): number {
  const p1 = clamp01(baselineRate);
  const p2 = clamp01(baselineRate * (1 + uplift));
  const delta = Math.abs(p2 - p1);

  if (delta < 1e-12) return Infinity;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(power);
  const variance = p1 * (1 - p1) + p2 * (1 - p2);
  const n = ((zAlpha + zBeta) ** 2 * variance) / (delta * delta);
  return Math.ceil(n);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
