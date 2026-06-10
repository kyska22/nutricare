export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "moderate" | "active";
export type EnergyMethod = "mifflin" | "harrisBenedict" | "roza";

export const BMI_THRESHOLDS = {
  underweight: 18.5,
  normalUpper: 25,
  overweightUpper: 30,
  obesityIUpper: 35,
  obesityIIUpper: 40,
} as const;

export const HEALTHY_BMI_RANGE = {
  minimum: 18.5,
  maximum: 24.9,
} as const;

export const WAIST_HIP_SUGGESTED_RANGES: Record<
  Sex,
  { minimum: number; maximum: number }
> = {
  male: { minimum: 0.71, maximum: 0.84 },
  female: { minimum: 0.78, maximum: 0.93 },
};

export const WAIST_HEIGHT_THRESHOLDS = {
  moderate: 0.5,
  high: 0.6,
} as const;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  moderate: 1.375,
  active: 1.55,
};

export const DEFAULT_ENERGY_METHOD: EnergyMethod = "mifflin";

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
