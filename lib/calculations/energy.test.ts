import { describe, expect, it } from "vitest";
import {
  calculateHarrisBenedict,
  calculateMifflinStJeor,
  calculateRoza,
} from "./energy";

const maleInput = {
  sex: "male" as const,
  age: 30,
  weightKg: 70,
  heightCm: 175,
};

describe("resting energy formulas", () => {
  it("calculates Harris-Benedict", () => {
    expect(calculateHarrisBenedict(maleInput)).toBeCloseTo(1700.6, 2);
  });

  it("calculates Mifflin-St Jeor", () => {
    expect(calculateMifflinStJeor(maleInput)).toBeCloseTo(1648.75, 2);
  });

  it("calculates Roza", () => {
    expect(calculateRoza(maleInput)).toBeCloseTo(1695.67, 2);
  });
});
