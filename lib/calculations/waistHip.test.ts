import { describe, expect, it } from "vitest";
import { calculateWaistHipRatio } from "./waistHip";

describe("calculateWaistHipRatio", () => {
  it("calculates and classifies the ratio using sex-specific ranges", () => {
    const result = calculateWaistHipRatio(80, 100, "male");

    expect(result.value).toBe(0.8);
    expect(result.classification).toBe("suggested");
    expect(result.suggestedRange).toEqual({ minimum: 0.71, maximum: 0.84 });
  });
});
