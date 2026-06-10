import { round, WAIST_HEIGHT_THRESHOLDS } from "./referenceTables";

export type WaistHeightClassification = "low" | "moderate" | "high";

export interface WaistHeightResult {
  value: number;
  classification: WaistHeightClassification;
}

/**
 * Calculates waist circumference divided by height, both expressed in cm.
 */
export function calculateWaistHeightRatio(
  waistCm: number,
  heightCm: number,
): WaistHeightResult {
  const value = waistCm / heightCm;
  const classification =
    value < WAIST_HEIGHT_THRESHOLDS.moderate
      ? "low"
      : value < WAIST_HEIGHT_THRESHOLDS.high
        ? "moderate"
        : "high";

  return { value: round(value), classification };
}
