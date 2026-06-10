"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { AssessmentSummary } from "./assessment-summary";
import {
  AnthropometricsSection,
  GastrointestinalSection,
  PsychobiologicalSection,
  RecallSection,
} from "./form-sections";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Locale } from "@/lib/i18n/translations";
import { createNutritionAssessmentSchema } from "@/lib/validations/nutrition-assessment-schema";
import {
  AnthropometricAssessment,
  calculateAnthropometricAssessment,
} from "@/lib/calculations";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";

const emptyValues = {
  psychobiological: {
    activityLevel: "",
    exerciseType: "",
    exerciseFrequency: "",
    dailyWaterLiters: "",
  },
  gastrointestinal: {
    bowelFrequency: "",
    stoolConsistency: "",
    stoolColor: "",
    constipation: "",
    diarrhea: "",
    hemorrhoids: "",
  },
  recall24Hours: {
    breakfast: "",
    breakfastTime: "",
    breakfastPeriod: "",
    lunch: "",
    lunchTime: "",
    lunchPeriod: "",
    dinner: "",
    dinnerTime: "",
    dinnerPeriod: "",
    snack: "",
    snackTime: "",
    snackPeriod: "",
  },
  anthropometrics: {
    sex: "",
    age: "",
    weightKg: "",
    heightMeters: "",
    abdominalCircumferenceCm: "",
    hipCircumferenceCm: "",
  },
};

export function NutritionAssessmentForm() {
  const { locale, setLocale, t } = useI18n();
  const [submission, setSubmission] = useState<{
    data: NutritionAssessmentFormValues;
    assessment: AnthropometricAssessment;
    createdAt: string;
  } | null>(null);
  const schema = useMemo(() => createNutritionAssessmentSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NutritionAssessmentFormValues>({
    // Empty strings are UI-only sentinel values; Zod accepts only AM or PM on submit.
    resolver: zodResolver(schema) as Resolver<NutritionAssessmentFormValues>,
    defaultValues: emptyValues as unknown as NutritionAssessmentFormValues,
    mode: "onBlur",
  });

  const onSubmit = (data: NutritionAssessmentFormValues) => {
    // Future integration point: persist the assessment in the database.
    // Future integration point: generate meal plans after professional review.
    const assessment = calculateAnthropometricAssessment({
      sex: data.anthropometrics.sex,
      age: data.anthropometrics.age,
      weightKg: data.anthropometrics.weightKg,
      heightM: data.anthropometrics.heightMeters,
      heightCm: data.anthropometrics.heightMeters * 100,
      waistCm: data.anthropometrics.abdominalCircumferenceCm,
      hipCm: data.anthropometrics.hipCircumferenceCm,
      activityLevel: data.psychobiological.activityLevel,
    });

    console.log("Nutrition assessment:", { data, assessment });
    setSubmission({ data, assessment, createdAt: new Date().toISOString() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submission) {
    return (
      <AssessmentSummary
        data={submission.data}
        assessment={submission.assessment}
        createdAt={submission.createdAt}
        onEdit={() => setSubmission(null)}
        onReset={() => {
          reset(emptyValues as unknown as NutritionAssessmentFormValues);
          setSubmission(null);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 overflow-hidden rounded-3xl bg-emerald-800 text-white shadow-2xl shadow-emerald-950/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl font-black text-emerald-800"
              >
                N
              </div>
              <span className="text-lg font-bold">{t("app.name")}</span>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
              <span className="hidden sm:inline">{t("app.language")}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                aria-label={t("app.language")}
                className="rounded-xl border border-white/20 bg-emerald-900/50 px-3 py-2 text-white outline-none focus:ring-4 focus:ring-white/15"
              >
                <option value="es">ES</option>
                <option value="pt">PT</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
          <div className="grid gap-6 px-5 py-9 sm:px-8 sm:py-12 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                {t("app.eyebrow")}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
                {t("app.title")}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg">
                {t("app.description")}
              </p>
            </div>
            <span className="w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-emerald-50">
              {t("app.progress")}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <PsychobiologicalSection register={register} errors={errors} />
          <GastrointestinalSection register={register} errors={errors} />
          <RecallSection register={register} errors={errors} />
          <AnthropometricsSection register={register} errors={errors} />

          <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-emerald-900/10 bg-white/90 p-3 shadow-xl shadow-emerald-950/10 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-700 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? t("actions.submitting") : t("actions.submit")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
