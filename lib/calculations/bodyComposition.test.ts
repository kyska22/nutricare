import { describe, expect, it } from "vitest";
import { calculateFatMass } from "./bodyComposition";

describe("calculateFatMass", () => {
  const result = calculateFatMass(80, 25);

  it("calculates fat mass", () => {
    expect(result.fatMassKg).toBe(20);
  });

  it("calculates fat-free mass", () => {
    expect(result.fatFreeMassKg).toBe(60);
  });
});
