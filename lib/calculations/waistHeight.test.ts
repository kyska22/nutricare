import { describe, expect, it } from "vitest";
import { calculateWaistHeightRatio } from "./waistHeight";

describe("calculateWaistHeightRatio", () => {
  it("calculates and classifies the ratio", () => {
    expect(calculateWaistHeightRatio(90, 175)).toEqual({
      value: 0.51,
      classification: "moderate",
    });
  });
});
