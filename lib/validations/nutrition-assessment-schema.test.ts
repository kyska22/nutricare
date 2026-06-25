import { describe, expect, it } from "vitest";
import { createNutritionAssessmentSchema } from "./nutrition-assessment-schema";

const t = (key: string) => key;

const existingAssessment = {
  psychobiological: {
    activityLevel: "moderate",
    exerciseType: "fitness",
    exerciseFrequency: "3",
    dailyWaterLiters: 2,
  },
  gastrointestinal: {
    bowelFrequency: "daily",
    stoolConsistency: "soft",
    stoolColor: "brown",
    constipation: "no",
    diarrhea: "no",
    hemorrhoids: "no",
  },
  recall24Hours: {
    breakfast: "Breakfast",
    breakfastTime: "08:00",
    breakfastPeriod: "AM",
    lunch: "Lunch",
    lunchTime: "01:00",
    lunchPeriod: "PM",
    dinner: "Dinner",
    dinnerTime: "08:00",
    dinnerPeriod: "PM",
    snack: "Snack",
    snackTime: "04:00",
    snackPeriod: "PM",
  },
  anthropometrics: {
    sex: "female",
    age: 35,
    weightKg: 65,
    heightMeters: 1.65,
    abdominalCircumferenceCm: 80,
  },
};

describe("nutrition assessment schema compatibility", () => {
  it("continues accepting assessments without the expanded clinical history", () => {
    expect(
      createNutritionAssessmentSchema(t).safeParse(existingAssessment).success,
    ).toBe(true);
  });

  it("retains expanded clinical history fields in the parsed object", () => {
    const result = createNutritionAssessmentSchema(t).parse({
      ...existingAssessment,
      personalInformation: {
        consultationType: "firstTime",
        firstName: "Ana",
        consultationReasons: ["improveEatingHabits", "other"],
        otherConsultationReason: "Sports performance",
      },
      familyHistory: {
        fatherAlive: "yes",
        conditions: ["hypertension"],
      },
      dietaryHabits: {
        mealsAtHomeDays: 6,
        weeklyFrequency: {
          vegetables: "daily",
          fish: "oneToTwo",
        },
      },
    });

    expect(result.personalInformation?.firstName).toBe("Ana");
    expect(result.familyHistory?.conditions).toContain("hypertension");
    expect(result.dietaryHabits?.weeklyFrequency.vegetables).toBe("daily");
  });

  it("normalizes flexible 24-hour recall times to HH:mm", () => {
    const result = createNutritionAssessmentSchema(t).parse({
      ...existingAssessment,
      recall24Hours: {
        breakfast: "Breakfast",
        breakfastTime: "830",
        breakfastPeriod: "AM",
        lunch: "Lunch",
        lunchTime: "0830",
        lunchPeriod: "AM",
        dinner: "Dinner",
        dinnerTime: "8:30",
        dinnerPeriod: "PM",
        snack: "Snack",
        snackTime: "14",
        snackPeriod: "PM",
      },
    });

    expect(result.recall24Hours.breakfastTime).toBe("08:30");
    expect(result.recall24Hours.lunchTime).toBe("08:30");
    expect(result.recall24Hours.dinnerTime).toBe("08:30");
    expect(result.recall24Hours.snackTime).toBe("14:00");
  });

  it("rejects invalid 24-hour recall times", () => {
    const result = createNutritionAssessmentSchema(t).safeParse({
      ...existingAssessment,
      recall24Hours: {
        ...existingAssessment.recall24Hours,
        breakfastTime: "2460",
      },
    });

    expect(result.success).toBe(false);
  });
});
