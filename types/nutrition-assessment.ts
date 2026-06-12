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
export const substanceUseStatuses = ["yes", "no", "former"] as const;
export type SubstanceUseStatus = (typeof substanceUseStatuses)[number];
export const abandonmentTimes = [
  "lessThanSixMonths",
  "moreThanSixMonths",
  "moreThanOneYear",
] as const;
export type AbandonmentTime = (typeof abandonmentTimes)[number];
export type Sex = "male" | "female";
export type TimePeriod = "AM" | "PM";

export const consultationTypes = ["firstTime", "followUp"] as const;
export type ConsultationType = (typeof consultationTypes)[number];

export const consultationReasons = [
  "weightLoss",
  "bodyComposition",
  "improveEatingHabits",
  "muscleGain",
  "reduceBodyFat",
  "adequateNutrition",
  "gastritis",
  "diabetes",
  "metabolicSyndrome",
  "constipation",
  "inflamedColon",
  "dyslipidemia",
  "insulinResistance",
  "other",
] as const;
export type ConsultationReason = (typeof consultationReasons)[number];

export const birthTypes = ["vaginal", "cesarean", "both", "other"] as const;
export type BirthType = (typeof birthTypes)[number];

export const familyHistoryConditions = [
  "cancer",
  "obesity",
  "asthma",
  "hypertension",
  "diabetes",
  "cardiovascularDisease",
  "other",
] as const;
export type FamilyHistoryCondition = (typeof familyHistoryConditions)[number];

export const waterIntakeRanges = [
  "lessThan4",
  "fourToSix",
  "sixToEight",
  "moreThan8",
] as const;
export type WaterIntakeRange = (typeof waterIntakeRanges)[number];

export const sleepHourRanges = [
  "lessThan4",
  "fourToFive",
  "sixHours",
  "sevenHours",
  "eightHours",
  // Legacy values remain valid for previously captured evaluations.
  "fiveToSix",
  "sixToSeven",
  "sevenToEight",
  "moreThan8",
] as const;
export type SleepHourRange = (typeof sleepHourRanges)[number];

export const sleepQualities = [
  "veryPoor",
  "poor",
  "fair",
  "good",
  "excellent",
] as const;
export type SleepQuality = (typeof sleepQualities)[number];

export const foodFrequencyValues = [
  "never",
  "oneToTwo",
  "threeToFour",
  "fiveToSix",
  "daily",
] as const;
export type FoodFrequencyValue = (typeof foodFrequencyValues)[number];

export const foodGroups = [
  "dairy",
  "vegetables",
  "fruits",
  "carbohydrates",
  "beef",
  "pork",
  "poultry",
  "fish",
  "eggs",
  "processedMeats",
  "fats",
  "sweets",
  "softDrinks",
  "other",
] as const;
export type FoodGroup = (typeof foodGroups)[number];

export interface NutritionAssessmentFormValues {
  psychobiological: {
    activityLevel: ActivityLevel;
    exerciseType: ExerciseType;
    exerciseFrequency: ExerciseFrequency;
    dailyWaterLiters: number;
    dailyWaterGlasses?: number;
    tobacco?: SubstanceUseStatus;
    tobaccoQuitTime?: AbandonmentTime;
    alcohol?: SubstanceUseStatus;
    alcoholQuitTime?: AbandonmentTime;
    coffee?: YesNoValue;
    waterIntakeRange?: WaterIntakeRange;
    averageSleepHours?: SleepHourRange;
    sleepQuality?: SleepQuality;
  };
  personalInformation?: {
    consultationType?: ConsultationType;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    occupation?: string;
    identificationNumber?: string;
    birthDate?: string;
    sex?: Sex;
    consultationReasons: ConsultationReason[];
    otherConsultationReason?: string;
  };
  personalHistory?: {
    currentOrPreviousDiseases?: string;
    previousDiseases?: string;
    previousSurgeries?: string;
    currentMedications?: string;
    currentSupplements?: string;
    hasChildren?: YesNoValue;
    numberOfChildren?: number;
    birthType?: BirthType;
  };
  familyHistory?: {
    fatherAlive?: YesNoValue;
    fatherAge?: number;
    motherAlive?: YesNoValue;
    motherAge?: number;
    conditions: FamilyHistoryCondition[];
    otherCondition?: string;
    fatherDiseases?: string;
    motherDiseases?: string;
    observations?: string;
  };
  dietaryHabits?: {
    foodAllergies?: string;
    foodPreferences?: string;
    mealsAtHomeDays?: number;
    mealsAwayDays?: number;
    otherFood?: string;
    weeklyFrequency: Partial<Record<FoodGroup, FoodFrequencyValue>>;
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
