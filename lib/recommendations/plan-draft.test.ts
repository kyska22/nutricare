import { describe, expect, it } from "vitest";
import { generatePlanDraft } from "./plan-draft";

const translate = (key: string) => key;

describe("generatePlanDraft", () => {
  it("creates a gradual class III activity draft for a weight and muscle goal", () => {
    const draft = generatePlanDraft({
      goals: ["weightLoss", "muscleGain"],
      bmiClass: "obesityIII",
      age: 42,
      allergies: "peanuts",
      preferences: "vegetarian",
      translate,
    });

    expect(draft.goalsAndPrescription).toBe("planDraft.goals.weightAndMuscle");
    expect(draft.mealPlan).toContain("planDraft.mealGoals.weightAndMuscle");
    expect(draft.mealPlan).toContain("planDraft.preferences");
    expect(draft.mealPlan).toContain("planDraft.allergies");
    expect(draft.activityPlan).toBe("planDraft.activityClassIII");
    expect(draft.recommendations).toContain("planDraft.classIIIReview");
  });

  it("does not create an adult diet or activity draft for a minor", () => {
    const draft = generatePlanDraft({
      goals: ["weightLoss"], bmiClass: "obesityIII", age: 16,
      allergies: null, preferences: null, translate,
    });

    expect(draft.mealPlan).toBe("planDraft.pediatricPlan");
    expect(draft.activityPlan).toBe("planDraft.pediatricActivity");
  });

  it("does not assume age when it is missing", () => {
    const draft = generatePlanDraft({
      goals: ["muscleGain"], bmiClass: "obesityIII", age: null,
      allergies: null, preferences: null, translate,
    });

    expect(draft.mealPlan).toBe("planDraft.ageUnknownPlan");
    expect(draft.activityPlan).toBe("planDraft.ageUnknownActivity");
  });
});
