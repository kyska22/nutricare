import { round, Sex } from "./referenceTables";

export interface BodyFatResult {
  percentage: number;
  method: "lean";
}

/**
 * Estimates body fat percentage with the sex-specific Lean formula.
 */
export function calculateLeanBodyFatPercentage(
  sex: Sex,
  waistCm: number,
  age: number,
): BodyFatResult {
  const percentage =
    sex === "male"
      ? 0.567 * waistCm + 0.101 * age - 31.8
      : 0.439 * waistCm + 0.221 * age - 9.4;

  return {
    percentage: round(percentage),
    method: "lean",
  };
}
