import { describe, expect, it } from 'vitest';
import {
  createRng,
  erf,
  normalCdf,
  normalQuantile,
  proportionCI,
  runPeekingTrap,
  sampleBinomial,
  sampleSizePerArm,
  simulateAbTest,
  twoProportionZTest,
} from './stats';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('erf / normalCdf', () => {
  it('erf(0) ≈ 0', () => {
    expect(erf(0)).toBeCloseTo(0, 7);
  });

  it('erf is odd', () => {
    expect(erf(1)).toBeCloseTo(-erf(-1), 7);
  });

  // Known values from Abramowitz & Stegun / scipy
  it('matches known erf values', () => {
    expect(erf(0.5)).toBeCloseTo(0.5204998778, 5);
    expect(erf(1)).toBeCloseTo(0.8427007929, 5);
    expect(erf(2)).toBeCloseTo(0.995322265, 5);
  });

  it('Φ(0) = 0.5', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
  });

  it('matches known normal CDF values', () => {
    // scipy.stats.norm.cdf
    expect(normalCdf(1)).toBeCloseTo(0.841344746, 5);
    expect(normalCdf(-1)).toBeCloseTo(0.158655254, 5);
    expect(normalCdf(1.96)).toBeCloseTo(0.975002104, 4);
    expect(normalCdf(-1.96)).toBeCloseTo(0.024997896, 4);
  });
});

describe('normalQuantile', () => {
  it('returns 0 at 0.5', () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 7);
  });

  it('matches known quantiles', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.9599639845, 4);
    expect(normalQuantile(0.025)).toBeCloseTo(-1.9599639845, 4);
    expect(normalQuantile(0.95)).toBeCloseTo(1.6448536269, 4);
    expect(normalQuantile(0.8)).toBeCloseTo(0.8416212335, 4);
  });

  it('is consistent with normalCdf (round-trip)', () => {
    for (const z of [-2, -1, 0, 0.5, 1, 1.5, 2]) {
      const p = normalCdf(z);
      expect(normalQuantile(p)).toBeCloseTo(z, 4);
    }
  });
});

describe('twoProportionZTest', () => {
  it('returns p≈1 when proportions are equal', () => {
    const r = twoProportionZTest(50, 1000, 50, 1000);
    expect(r.z).toBeCloseTo(0, 7);
    expect(r.pValue).toBeCloseTo(1, 5);
  });

  it('matches a known significant result', () => {
    // A: 100/1000 = 10%, B: 150/1000 = 15%
    // z ≈ (0.15-0.10)/sqrt(0.125*0.875*(0.001+0.001)) ≈ 3.3806
    const r = twoProportionZTest(100, 1000, 150, 1000);
    expect(r.p1).toBeCloseTo(0.1, 7);
    expect(r.p2).toBeCloseTo(0.15, 7);
    expect(r.z).toBeCloseTo(3.380617, 4);
    expect(r.pValue).toBeCloseTo(0.0007225, 4);
  });

  it('is two-sided (sign of difference flips z, same p)', () => {
    const ab = twoProportionZTest(100, 1000, 150, 1000);
    const ba = twoProportionZTest(150, 1000, 100, 1000);
    expect(ab.z).toBeCloseTo(-ba.z, 10);
    expect(ab.pValue).toBeCloseTo(ba.pValue, 10);
  });

  it('handles empty arms safely', () => {
    const r = twoProportionZTest(0, 0, 0, 0);
    expect(r.pValue).toBe(1);
  });

  it('handles all-successes / all-failures (pooled edge)', () => {
    expect(twoProportionZTest(100, 100, 100, 100).pValue).toBe(1);
    expect(twoProportionZTest(0, 100, 0, 100).pValue).toBe(1);
  });
});

describe('proportionCI', () => {
  it('matches a known Wald interval', () => {
    // p=0.1, n=1000, se=sqrt(0.09/1000)=0.0094868, ±1.96*se
    const ci = proportionCI(100, 1000);
    expect(ci.p).toBeCloseTo(0.1, 7);
    expect(ci.lower).toBeCloseTo(0.0814058, 4);
    expect(ci.upper).toBeCloseTo(0.1185942, 4);
  });

  it('clamps to [0, 1]', () => {
    const low = proportionCI(0, 10);
    expect(low.lower).toBe(0);
    const high = proportionCI(10, 10);
    expect(high.upper).toBe(1);
  });
});

describe('sampleBinomial', () => {
  it('returns 0 when p=0 and n when p=1', () => {
    const rng = createRng(1);
    expect(sampleBinomial(50, 0, rng)).toBe(0);
    expect(sampleBinomial(50, 1, rng)).toBe(50);
  });

  it('has mean near n*p for many draws', () => {
    const rng = createRng(99);
    const n = 40;
    const p = 0.3;
    let sum = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      sum += sampleBinomial(n, p, rng);
    }
    const mean = sum / trials;
    expect(mean).toBeGreaterThan(n * p - 0.5);
    expect(mean).toBeLessThan(n * p + 0.5);
  });

  it('is reproducible with the same seed', () => {
    const draw = (seed: number) => {
      const rng = createRng(seed);
      return Array.from({ length: 10 }, () => sampleBinomial(100, 0.2, rng));
    };
    expect(draw(7)).toEqual(draw(7));
  });
});

describe('simulateAbTest', () => {
  it('produces one snapshot per day', () => {
    const result = simulateAbTest({
      baselineRate: 0.1,
      trueUplift: 0,
      dailyTrafficPerArm: 500,
      days: 14,
      alpha: 0.05,
      seed: 1,
    });
    expect(result.days).toHaveLength(14);
    expect(result.days[0].day).toBe(1);
    expect(result.days[13].day).toBe(14);
    expect(result.days[13].visitorsA).toBe(500 * 14);
  });

  it('marks peekDay as the first day p < alpha', () => {
    const result = simulateAbTest({
      baselineRate: 0.1,
      trueUplift: 0.5,
      dailyTrafficPerArm: 2000,
      days: 30,
      alpha: 0.05,
      seed: 42,
    });
    if (result.peekDay !== null) {
      const peek = result.days[result.peekDay - 1];
      expect(peek.pValue).toBeLessThan(0.05);
      if (result.peekDay > 1) {
        expect(result.days[result.peekDay - 2].pValue).toBeGreaterThanOrEqual(0.05);
      }
    }
  });

  it('applies true uplift to rate B', () => {
    const result = simulateAbTest({
      baselineRate: 0.2,
      trueUplift: 0.25,
      dailyTrafficPerArm: 100,
      days: 5,
      alpha: 0.05,
      seed: 3,
    });
    expect(result.trueRateA).toBeCloseTo(0.2, 7);
    expect(result.trueRateB).toBeCloseTo(0.25, 7);
  });
});

describe('runPeekingTrap', () => {
  it('peeking false-positive rate exceeds end-only rate', () => {
    const result = runPeekingTrap({
      simulations: 400,
      baselineRate: 0.1,
      dailyTrafficPerArm: 500,
      days: 20,
      alpha: 0.05,
      seed: 2024,
    });
    expect(result.endOnlyRate).toBeLessThan(0.12);
    expect(result.peekingRate).toBeGreaterThan(result.endOnlyRate);
    expect(result.peekingRate).toBeGreaterThan(0.1);
  });
});

describe('sampleSizePerArm', () => {
  it('matches a known power calculation for 10% → 12%', () => {
    // Rough check against standard sample-size tables (~3.8k–4.0k per arm)
    const n = sampleSizePerArm(0.1, 0.2, 0.05, 0.8);
    expect(n).toBeGreaterThan(3500);
    expect(n).toBeLessThan(4500);
  });

  it('returns Infinity when uplift is 0', () => {
    expect(sampleSizePerArm(0.1, 0)).toBe(Infinity);
  });

  it('needs fewer visitors for a larger uplift', () => {
    const small = sampleSizePerArm(0.1, 0.05, 0.05, 0.8);
    const big = sampleSizePerArm(0.1, 0.5, 0.05, 0.8);
    expect(big).toBeLessThan(small);
  });
});
