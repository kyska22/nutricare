import { calculateBmi, BmiResult } from "./bmi";
import {
  calculateFiveComponentModel,
  calculateFatMass,
  FiveComponentModel,
} from "./bodyComposition";
import { calculateLeanBodyFatPercentage, BodyFatResult } from "./bodyFat";
import {
  calculateRestingEnergyExpenditure,
  calculateTotalEnergyExpenditure,
  EnergyResult,
  TotalEnergyResult,
} from "./energy";
import {
  ActivityLevel,
  DEFAULT_ENERGY_METHOD,
  EnergyMethod,
  Sex,
} from "./referenceTables";
import { calculateWaistHeightRatio, WaistHeightResult } from "./waistHeight";
import { calculateWaistHipRatio, WaistHipResult } from "./waistHip";

export * from "./bmi";
export * from "./bodyComposition";
export * from "./bodyFat";
export * from "./energy";
export * from "./referenceTables";
export * from "./waistHeight";
export * from "./waistHip";

export interface Skinfolds {
  biceps?: number;
  triceps?: number;
  subscapular?: number;
  suprailiac?: number;
  abdominal?: number;
  thigh?: number;
  calf?: number;
}

export interface AnthropometricAssessmentInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightM: number;
  heightCm: number;
  waistCm?: number;
  hipCm?: number;
  wristCm?: number;
  activityLevel?: ActivityLevel;
  skinfolds?: Skinfolds;
}

export type AssessmentWarning =
  | "missingWaist"
  | "missingHip"
  | "missingActivityLevel";

export interface AnthropometricAssessment {
  bmi: BmiResult;
  waistHipRatio?: WaistHipResult;
  waistHeightRatio?: WaistHeightResult;
  restingEnergyExpenditure: EnergyResult;
  totalEnergyExpenditure?: TotalEnergyResult;
  bodyFat?: BodyFatResult;
  bodyComposition?: FiveComponentModel;
  warnings: AssessmentWarning[];
}

/**
 * Runs the available anthropometric calculations without producing a diagnosis.
 * Optional-data calculations are omitted and represented by warning keys.
 */
export function calculateAnthropometricAssessment(
  input: AnthropometricAssessmentInput,
  energyMethod: EnergyMethod = DEFAULT_ENERGY_METHOD,
): AnthropometricAssessment {
  const warnings: AssessmentWarning[] = [];
  const bmi = calculateBmi(input.weightKg, input.heightM);
  const restingEnergyExpenditure = calculateRestingEnergyExpenditure(
    input,
    energyMethod,
  );

  let waistHipRatio: WaistHipResult | undefined;
  let waistHeightRatio: WaistHeightResult | undefined;
  let bodyFat: BodyFatResult | undefined;
  let bodyComposition: FiveComponentModel | undefined;

  if (input.waistCm === undefined) {
    warnings.push("missingWaist");
  } else {
    waistHeightRatio = calculateWaistHeightRatio(
      input.waistCm,
      input.heightCm,
    );
    bodyFat = calculateLeanBodyFatPercentage(
      input.sex,
      input.waistCm,
      input.age,
    );
    const masses = calculateFatMass(input.weightKg, bodyFat.percentage);
    bodyComposition = calculateFiveComponentModel(
      input.weightKg,
      masses.fatMassKg,
      masses.fatFreeMassKg,
    );

    if (input.hipCm === undefined) {
      warnings.push("missingHip");
    } else {
      waistHipRatio = calculateWaistHipRatio(
        input.waistCm,
        input.hipCm,
        input.sex,
      );
    }
  }

  let totalEnergyExpenditure: TotalEnergyResult | undefined;
  if (input.activityLevel === undefined) {
    warnings.push("missingActivityLevel");
  } else {
    totalEnergyExpenditure = calculateTotalEnergyExpenditure(
      restingEnergyExpenditure.valueKcal,
      input.activityLevel,
      energyMethod,
    );
  }

  return {
    bmi,
    waistHipRatio,
    waistHeightRatio,
    restingEnergyExpenditure,
    totalEnergyExpenditure,
    bodyFat,
    bodyComposition,
    warnings,
  };
}
