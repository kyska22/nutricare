import {
  ACTIVITY_FACTORS,
  ActivityLevel,
  EnergyMethod,
  round,
  Sex,
} from "./referenceTables";

export interface EnergyInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
}

export interface EnergyResult {
  valueKcal: number;
  method: EnergyMethod;
}

export interface TotalEnergyResult extends EnergyResult {
  activityLevel: ActivityLevel;
  activityFactor: number;
}

export function calculateHarrisBenedict(input: EnergyInput): number {
  const { sex, age, weightKg, heightCm } = input;
  const value =
    sex === "male"
      ? 66.5 + 13.75 * weightKg + 5 * heightCm - 6.78 * age
      : 665 + 9.56 * weightKg + 1.85 * heightCm - 4.68 * age;
  return round(value);
}

export function calculateMifflinStJeor(input: EnergyInput): number {
  const { sex, age, weightKg, heightCm } = input;
  const sexConstant = sex === "male" ? 5 : -161;
  return round(10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant);
}

export function calculateRoza(input: EnergyInput): number {
  const { sex, age, weightKg, heightCm } = input;
  const value =
    sex === "male"
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  return round(value);
}

export function calculateRestingEnergyExpenditure(
  input: EnergyInput,
  method: EnergyMethod,
): EnergyResult {
  const calculators: Record<EnergyMethod, (data: EnergyInput) => number> = {
    mifflin: calculateMifflinStJeor,
    harrisBenedict: calculateHarrisBenedict,
    roza: calculateRoza,
  };

  return { valueKcal: calculators[method](input), method };
}

export function calculateTotalEnergyExpenditure(
  restingEnergyKcal: number,
  activityLevel: ActivityLevel,
  method: EnergyMethod,
): TotalEnergyResult {
  const activityFactor = ACTIVITY_FACTORS[activityLevel];

  return {
    valueKcal: round(restingEnergyKcal * activityFactor),
    method,
    activityLevel,
    activityFactor,
  };
}
