import { describe, expect, it } from "vitest";
import { normalizeFlexibleTimeInput } from "./time";

describe("normalizeFlexibleTimeInput", () => {
  it.each([
    ["830", "08:30"],
    ["0830", "08:30"],
    ["8:30", "08:30"],
    ["14", "14:00"],
    ["1430", "14:30"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeFlexibleTimeInput(input)).toBe(expected);
  });

  it.each(["24", "2460", "12:75", "abcd"])(
    "returns null for invalid time %s",
    (input) => {
      expect(normalizeFlexibleTimeInput(input)).toBeNull();
    },
  );
});
