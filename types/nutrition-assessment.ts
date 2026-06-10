export const activityLevels = ["sedentary", "moderate", "active"] as const;
export type ActivityLevel = (typeof activityLevels)[number];

export const exerciseTypes = [
  "sports",
  "gym",
  "fitness",
  "dance",
  "crossfit",
  "other",
] as const;
export type ExerciseType = (typeof exerciseTypes)[number];

export const exerciseFrequencies = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "moreThan8",
] as const;
export type ExerciseFrequency = (typeof exerciseFrequencies)[number];

export const bowelFrequencies = ["daily", "everyOtherDay", "everyTwoDays"] as const;
export type BowelFrequency = (typeof bowelFrequencies)[number];

export const stoolConsistencies = ["soft", "pasty", "liquid", "hard"] as const;
export type StoolConsistency = (typeof stoolConsistencies)[number];

export const stoolColors = ["brown", "green", "yellow", "black", "white", "bloodyRed"] as const;
export type StoolColor = (typeof stoolColors)[number];

export type YesNoValue = "yes" | "no";
export type Sex = "male" | "female";
export type TimePeriod = "AM" | "PM";

export interface NutritionAssessmentFormValues {
  psychobiological: {
    activityLevel: ActivityLevel;
    exerciseType: ExerciseType;
    exerciseFrequency: ExerciseFrequency;
    dailyWaterLiters: number;
  };
  gastrointestinal: {
    bowelFrequency: BowelFrequency;
    stoolConsistency: StoolConsistency;
    stoolColor: StoolColor;
    constipation: YesNoValue;
    diarrhea: YesNoValue;
    hemorrhoids: YesNoValue;
  };
  recall24Hours: {
    breakfast: string;
    breakfastTime: string;
    breakfastPeriod: TimePeriod;
    lunch: string;
    lunchTime: string;
    lunchPeriod: TimePeriod;
    dinner: string;
    dinnerTime: string;
    dinnerPeriod: TimePeriod;
    snack: string;
    snackTime: string;
    snackPeriod: TimePeriod;
  };
  anthropometrics: {
    sex: Sex;
    age: number;
    weightKg: number;
    heightMeters: number;
    abdominalCircumferenceCm: number;
    hipCircumferenceCm?: number;
  };
}
