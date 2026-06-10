import { z } from "zod";
import {
  activityLevels,
  bowelFrequencies,
  exerciseFrequencies,
  exerciseTypes,
  stoolColors,
  stoolConsistencies,
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
    }),
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
