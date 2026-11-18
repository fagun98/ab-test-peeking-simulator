export interface AbParams {
  baselineRate: number;
  trueUplift: number;
  dailyTrafficPerArm: number;
  days: number;
  alpha: number;
  seed: number;
}

export interface Preset {
  id: string;
  label: string;
  params: Partial<AbParams>;
}

export const DEFAULT_PARAMS: AbParams = {
  baselineRate: 0.1,
  trueUplift: 0,
  dailyTrafficPerArm: 1000,
  days: 30,
  alpha: 0.05,
  seed: 42,
};

export const PRESETS: Preset[] = [
  {
    id: 'aa',
    label: 'No real difference (A/A)',
    params: { trueUplift: 0, baselineRate: 0.1, dailyTrafficPerArm: 1000, days: 30, seed: 42 },
  },
  {
    id: 'small',
    label: 'Small real win',
    params: { trueUplift: 0.05, baselineRate: 0.1, dailyTrafficPerArm: 2000, days: 45, seed: 7 },
  },
  {
    id: 'big',
    label: 'Big real win',
    params: { trueUplift: 0.3, baselineRate: 0.1, dailyTrafficPerArm: 800, days: 21, seed: 99 },
  },
];
