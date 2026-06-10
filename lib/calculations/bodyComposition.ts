import { round } from "./referenceTables";

export interface FatMassResult {
  fatMassKg: number;
  fatFreeMassKg: number;
}

export interface FiveComponentModel extends FatMassResult {
  adiposeMassKg: number;
  muscleMassKg: number;
  boneMassKg: number;
  residualMassKg: number;
  skinMassKg: number;
}

export function calculateFatMass(
  weightKg: number,
  bodyFatPercentage: number,
): FatMassResult {
  const fatMassKg = weightKg * (bodyFatPercentage / 100);

  return {
    fatMassKg: round(fatMassKg),
    fatFreeMassKg: round(weightKg - fatMassKg),
  };
}

/**
 * Produces an initial estimated five-component model.
 */
export function calculateFiveComponentModel(
  weightKg: number,
  fatMassKg: number,
  fatFreeMassKg: number,
): FiveComponentModel {
  // TODO: These estimated percentages must be validated by a nutritionist.
  return {
    fatMassKg: round(fatMassKg),
    fatFreeMassKg: round(fatFreeMassKg),
    adiposeMassKg: round(fatMassKg),
    muscleMassKg: round(fatFreeMassKg * 0.6),
    boneMassKg: round(weightKg * 0.119),
    residualMassKg: round(weightKg * 0.14),
    skinMassKg: round(weightKg * 0.02),
  };
}
