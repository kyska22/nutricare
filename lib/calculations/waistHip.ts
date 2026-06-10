import {
  round,
  Sex,
  WAIST_HIP_SUGGESTED_RANGES,
} from "./referenceTables";

export type WaistHipClassification =
  | "belowSuggested"
  | "suggested"
  | "aboveSuggested";

export interface WaistHipResult {
  value: number;
  classification: WaistHipClassification;
  suggestedRange: {
    minimum: number;
    maximum: number;
  };
}

/**
 * Calculates the waist-to-hip ratio and compares it with the configured range.
 */
export function calculateWaistHipRatio(
  waistCm: number,
  hipCm: number,
  sex: Sex,
): WaistHipResult {
  const value = waistCm / hipCm;
  const range = WAIST_HIP_SUGGESTED_RANGES[sex];
  const classification =
    value < range.minimum
      ? "belowSuggested"
      : value > range.maximum
        ? "aboveSuggested"
        : "suggested";

  return {
    value: round(value),
    classification,
    suggestedRange: range,
  };
}
