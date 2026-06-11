import { describe, expect, it } from "vitest";
import { calculateAge } from "./calculate-age";

describe("calculateAge", () => {
  it("accounts for whether the birthday has occurred this year", () => {
    const today = new Date(2026, 5, 10);

    expect(calculateAge("1990-06-10", today)).toBe(36);
    expect(calculateAge("1990-06-11", today)).toBe(35);
  });

  it("rejects invalid or future dates", () => {
    const today = new Date(2026, 5, 10);

    expect(calculateAge("2027-01-01", today)).toBeNull();
    expect(calculateAge("2020-02-31", today)).toBeNull();
  });
});
