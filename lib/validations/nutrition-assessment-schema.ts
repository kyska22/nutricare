import { z } from "zod";
import {
  activityLevels,
  abandonmentTimes,
  birthTypes,
  bowelFrequencies,
  consultationReasons,
  consultationTypes,
  exerciseFrequencies,
  exerciseTypes,
  familyHistoryConditions,
  foodFrequencyValues,
  foodGroups,
  sleepHourRanges,
  sleepQualities,
  substanceUseStatuses,
  stoolColors,
  stoolConsistencies,
  waterIntakeRanges,
} from "@/types/nutrition-assessment";

type Translate = (key: string) => string;

const valid12HourTime = /^(0?[1-9]|1[0-2]):[0-5]\d$/;

export function createNutritionAssessmentSchema(t: Translate) {
  const requiredText = z.string().trim().min(1, t("validation.required"));
  const timeValue = z.string();
  const timePeriod = z.union([z.literal("AM"), z.literal("PM"), z.literal("")]);
  const positiveNumber = z
    .number({ error: t("validation.invalidNumber") })
    .positive(t("validation.positiveNumber"));
  const optionalText = z.string().trim().optional();
  const optionalYesNo = z.enum(["yes", "no"]).optional();
  const optionalNonnegativeNumber = z
    .number({ error: t("validation.invalidNumber") })
    .nonnegative(t("clinicalHistory.validation.nonnegativeNumber"))
    .optional();
  const optionalDays = z
    .number({ error: t("validation.invalidNumber") })
    .int(t("validation.invalidNumber"))
    .min(0, t("clinicalHistory.validation.daysRange"))
    .max(7, t("clinicalHistory.validation.daysRange"))
    .optional();
  const optionalFoodFrequency = z.enum(foodFrequencyValues).optional();

  return z.object({
    psychobiological: z.object({
      activityLevel: z.enum(activityLevels, {
        error: t("validation.selectRequired"),
      }),
      exerciseType: z.enum(exerciseTypes, {
        error: t("validation.selectRequired"),
      }),
      exerciseFrequency: z.enum(exerciseFrequencies, {
        error: t("validation.selectRequired"),
      }),
      dailyWaterLiters: positiveNumber,
      dailyWaterGlasses: optionalNonnegativeNumber,
      tobacco: z.enum(substanceUseStatuses).optional(),
      tobaccoQuitTime: z.enum(abandonmentTimes).optional(),
      alcohol: z.enum(substanceUseStatuses).optional(),
      alcoholQuitTime: z.enum(abandonmentTimes).optional(),
      coffee: optionalYesNo,
      waterIntakeRange: z.enum(waterIntakeRanges).optional(),
      averageSleepHours: z.enum(sleepHourRanges).optional(),
      sleepQuality: z.enum(sleepQualities).optional(),
    }),
    personalInformation: z
      .object({
        consultationType: z.enum(consultationTypes).optional(),
        firstName: optionalText,
        lastName: optionalText,
        email: z
          .union([
            z.literal(""),
            z.string().email(t("clinicalHistory.validation.invalidEmail")),
          ])
          .optional(),
        phone: optionalText,
        country: optionalText,
        occupation: optionalText,
        identificationNumber: optionalText,
        birthDate: optionalText,
        sex: z.enum(["male", "female"]).optional(),
        consultationReasons: z.array(z.enum(consultationReasons)).default([]),
        otherConsultationReason: optionalText,
      })
      .optional(),
    personalHistory: z
      .object({
        currentOrPreviousDiseases: optionalText,
        previousDiseases: optionalText,
        previousSurgeries: optionalText,
        currentMedications: optionalText,
        currentSupplements: optionalText,
        hasChildren: optionalYesNo,
        numberOfChildren: z
          .number({ error: t("validation.invalidNumber") })
          .int(t("validation.invalidNumber"))
          .nonnegative(t("clinicalHistory.validation.nonnegativeNumber"))
          .optional(),
        birthType: z.enum(birthTypes).optional(),
      })
      .optional(),
    familyHistory: z
      .object({
        fatherAlive: optionalYesNo,
        fatherAge: optionalNonnegativeNumber,
        motherAlive: optionalYesNo,
        motherAge: optionalNonnegativeNumber,
        conditions: z.array(z.enum(familyHistoryConditions)).default([]),
        otherCondition: optionalText,
        fatherDiseases: optionalText,
        motherDiseases: optionalText,
        observations: optionalText,
      })
      .optional(),
    dietaryHabits: z
      .object({
        foodAllergies: optionalText,
        foodPreferences: optionalText,
        mealsAtHomeDays: optionalDays,
        mealsAwayDays: optionalDays,
        otherFood: optionalText,
        weeklyFrequency: z.object({
          dairy: optionalFoodFrequency,
          vegetables: optionalFoodFrequency,
          fruits: optionalFoodFrequency,
          carbohydrates: optionalFoodFrequency,
          beef: optionalFoodFrequency,
          pork: optionalFoodFrequency,
          poultry: optionalFoodFrequency,
          fish: optionalFoodFrequency,
          eggs: optionalFoodFrequency,
          processedMeats: optionalFoodFrequency,
          fats: optionalFoodFrequency,
          sweets: optionalFoodFrequency,
          softDrinks: optionalFoodFrequency,
          other: optionalFoodFrequency,
        }),
      })
      .optional(),
    gastrointestinal: z.object({
      bowelFrequency: z.enum(bowelFrequencies, {
        error: t("validation.selectRequired"),
      }),
      stoolConsistency: z.enum(stoolConsistencies, {
        error: t("validation.selectRequired"),
      }),
      stoolColor: z.enum(stoolColors, {
        error: t("validation.selectRequired"),
      }),
      constipation: z.enum(["yes", "no"], {
        error: t("validation.selectRequired"),
      }),
      diarrhea: z.enum(["yes", "no"], {
        error: t("validation.selectRequired"),
      }),
      hemorrhoids: z.enum(["yes", "no"], {
        error: t("validation.selectRequired"),
      }),
    }),
    recall24Hours: z
      .object({
        breakfast: requiredText,
        breakfastTime: timeValue,
        breakfastPeriod: timePeriod,
        lunch: requiredText,
        lunchTime: timeValue,
        lunchPeriod: timePeriod,
        dinner: requiredText,
        dinnerTime: timeValue,
        dinnerPeriod: timePeriod,
        snack: requiredText,
        snackTime: timeValue,
        snackPeriod: timePeriod,
      })
      .superRefine((recall, context) => {
        const meals = ["breakfast", "lunch", "dinner", "snack"] as const;

        meals.forEach((meal) => {
          const timeKey = `${meal}Time` as const;
          const periodKey = `${meal}Period` as const;
          const time = recall[timeKey].trim();
          const period = recall[periodKey];

          if (!time) {
            context.addIssue({
              code: "custom",
              path: [timeKey],
              message: period
                ? t("validation.timeRequiredWithPeriod")
                : t("validation.required"),
            });
          } else if (!valid12HourTime.test(time)) {
            context.addIssue({
              code: "custom",
              path: [timeKey],
              message: t("validation.invalid12HourTime"),
            });
          }

          if (!period) {
            context.addIssue({
              code: "custom",
              path: [periodKey],
              message: time
                ? t("validation.periodRequiredWithTime")
                : t("validation.required"),
            });
          }
        });
      }),
    anthropometrics: z.object({
      sex: z.enum(["male", "female"], {
        error: t("validation.selectRequired"),
      }),
      age: positiveNumber,
      weightKg: positiveNumber,
      heightMeters: positiveNumber,
      abdominalCircumferenceCm: positiveNumber,
      hipCircumferenceCm: z
        .number({ error: t("validation.invalidNumber") })
        .positive(t("validation.positiveNumber"))
        .optional(),
    }),
  });
}

export type NutritionAssessmentSchema = z.infer<
  ReturnType<typeof createNutritionAssessmentSchema>
>;
