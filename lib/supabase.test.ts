import { describe, expect, it } from "vitest";
import { calculateAnthropometricAssessment } from "./calculations";
import { buildAnonymizedRawResults } from "./supabase";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";

describe("Supabase evaluation payload", () => {
  it("keeps clinical data while excluding direct patient identifiers", () => {
    const formData: NutritionAssessmentFormValues = {
      personalInformation: {
        consultationType: "firstTime",
        firstName: "Ana",
        lastName: "Paciente",
        email: "ana@example.com",
        phone: "+000000000",
        identificationNumber: "ID-SECRET",
        birthDate: "1990-01-01",
        country: "Private country",
        occupation: "Private occupation",
        sex: "female",
        consultationReasons: ["improveEatingHabits"],
      },
      personalHistory: {
        currentOrPreviousDiseases: "Clinical history",
      },
      familyHistory: {
        conditions: ["hypertension"],
      },
      psychobiological: {
        activityLevel: "moderate",
        exerciseType: "fitness",
        exerciseFrequency: "3",
        dailyWaterLiters: 2.5,
      },
      dietaryHabits: {
        foodAllergies: "None",
        weeklyFrequency: { vegetables: "daily" },
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
        age: 36,
        weightKg: 65,
        heightMeters: 1.65,
        abdominalCircumferenceCm: 80,
      },
    };
    const assessment = calculateAnthropometricAssessment({
      sex: "female",
      age: 36,
      weightKg: 65,
      heightM: 1.65,
      heightCm: 165,
      waistCm: 80,
      activityLevel: "moderate",
    });
    const payload = buildAnonymizedRawResults(
      formData,
      assessment,
      ["Automatic observation"],
      {
        nutritionistObservations: "Professional observation",
        recommendations: "Recommendation",
        followUpPlan: "Follow-up",
      },
    );
    const serialized = JSON.stringify(payload);

    expect(payload.clinicalData.psychobiological.dailyWaterLiters).toBe(2.5);
    expect(payload.clinicalData.personalHistory).toEqual(
      formData.personalHistory,
    );
    expect(serialized).not.toContain("Ana");
    expect(serialized).not.toContain("ana@example.com");
    expect(serialized).not.toContain("+000000000");
    expect(serialized).not.toContain("ID-SECRET");
    expect(serialized).not.toContain("1990-01-01");
  });
});
