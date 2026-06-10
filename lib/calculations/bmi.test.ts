import { describe, expect, it } from "vitest";
import { calculateBmi } from "./bmi";

describe("calculateBmi", () => {
  it("calculates BMI, classification, and healthy weight range", () => {
    const result = calculateBmi(70, 1.75);

    expect(result.value).toBeCloseTo(22.86, 2);
    expect(result.classification).toBe("normal");
    expect(result.healthyWeightRange).toEqual({
      minimumKg: 56.7,
      maximumKg: 76.3,
    });
  });
});
