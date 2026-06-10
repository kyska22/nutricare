import {
  BMI_THRESHOLDS,
  HEALTHY_BMI_RANGE,
  round,
} from "./referenceTables";

export type BmiClassification =
  | "underweight"
  | "normal"
  | "overweight"
  | "obesityI"
  | "obesityII"
  | "obesityIII";

export interface BmiResult {
  value: number;
  classification: BmiClassification;
  healthyWeightRange: {
    minimumKg: number;
    maximumKg: number;
  };
}

export function classifyBmi(bmi: number): BmiClassification {
  if (bmi < BMI_THRESHOLDS.underweight) return "underweight";
  if (bmi < BMI_THRESHOLDS.normalUpper) return "normal";
  if (bmi < BMI_THRESHOLDS.overweightUpper) return "overweight";
  if (bmi < BMI_THRESHOLDS.obesityIUpper) return "obesityI";
  if (bmi < BMI_THRESHOLDS.obesityIIUpper) return "obesityII";
  return "obesityIII";
}

/**
 * Calculates BMI and the healthy weight interval associated with BMI 18.5-24.9.
 */
export function calculateBmi(weightKg: number, heightM: number): BmiResult {
  const value = weightKg / heightM ** 2;

  return {
    value: round(value),
    classification: classifyBmi(value),
    healthyWeightRange: {
      minimumKg: round(HEALTHY_BMI_RANGE.minimum * heightM ** 2, 1),
      maximumKg: round(HEALTHY_BMI_RANGE.maximum * heightM ** 2, 1),
    },
  };
}
