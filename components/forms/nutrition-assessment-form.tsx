"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { AssessmentSummary } from "./assessment-summary";
import {
  AnthropometricsSection,
  GastrointestinalSection,
  PsychobiologicalSection,
  RecallSection,
} from "./form-sections";
import {
  ConsultationReasonSection,
  FamilyHistorySection,
  FoodFrequencySection,
  FoodPreferencesSection,
  PersonalHistorySection,
  PersonalInformationSection,
} from "./clinical-history-sections";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Locale } from "@/lib/i18n/translations";
import { createNutritionAssessmentSchema } from "@/lib/validations/nutrition-assessment-schema";
import {
  AnthropometricAssessment,
  calculateAnthropometricAssessment,
} from "@/lib/calculations";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";
import { calculateAge } from "@/lib/utils/calculate-age";

const emptyValues = {
  psychobiological: {
    activityLevel: "",
    exerciseType: "",
    exerciseFrequency: "",
    dailyWaterLiters: "",
    tobacco: undefined,
    tobaccoQuitTime: undefined,
    alcohol: undefined,
    alcoholQuitTime: undefined,
    coffee: undefined,
    averageSleepHours: undefined,
    sleepQuality: undefined,
  },
  personalInformation: {
    consultationType: undefined,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    occupation: "",
    identificationNumber: "",
    birthDate: "",
    sex: undefined,
    consultationReasons: [],
    otherConsultationReason: "",
  },
  personalHistory: {
    currentOrPreviousDiseases: "",
    previousDiseases: "",
    previousSurgeries: "",
    currentMedications: "",
    currentSupplements: "",
    hasChildren: undefined,
    numberOfChildren: undefined,
    birthType: undefined,
  },
  familyHistory: {
    fatherAlive: undefined,
    fatherAge: undefined,
    motherAlive: undefined,
    motherAge: undefined,
    conditions: [],
    otherCondition: "",
    fatherDiseases: "",
    motherDiseases: "",
    observations: "",
  },
  dietaryHabits: {
    foodAllergies: "",
    foodPreferences: "",
    mealsAtHomeDays: undefined,
    mealsAwayDays: undefined,
    otherFood: "",
    weeklyFrequency: {},
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NutritionAssessmentFormValues>({
    // Empty strings are UI-only sentinel values; Zod accepts only AM or PM on submit.
    resolver: zodResolver(schema) as Resolver<NutritionAssessmentFormValues>,
    defaultValues: emptyValues as unknown as NutritionAssessmentFormValues,
    mode: "onBlur",
  });

  const birthDate = watch("personalInformation.birthDate");
  const personalSex = watch("personalInformation.sex");
  const consultationType = watch("personalInformation.consultationType");

  useEffect(() => {
    if (!birthDate) {
      return;
    }

    const age = calculateAge(birthDate);
    if (age !== null && age > 0) {
      setValue("anthropometrics.age", age, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [birthDate, setValue]);

  useEffect(() => {
    if (personalSex) {
      setValue("anthropometrics.sex", personalSex, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [personalSex, setValue]);

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
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5"
              >
                <Image
                  src="/brand/nutrijenhfit-logo.png"
                  alt=""
                  width={40}
                  height={40}
                  priority
                  className="h-full w-full object-contain"
                />
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
          <div className="px-5 py-9 sm:px-8 sm:py-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-4xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                  {t("app.eyebrow")}
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                  {t("app.title")}
                </h1>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                <span className="w-fit shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-emerald-50">
                  {t("clinicalHistory.progress")}
                </span>
                <div className="flex flex-col gap-1">
                  <Link
                    href={
                      consultationType
                        ? `/agenda?consultationType=${consultationType}`
                        : "/agenda"
                    }
                    className="w-fit shrink-0 rounded-full bg-orange-400 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-200/40"
                  >
                    {t("agenda.sessionButton")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-inner shadow-white/5 backdrop-blur-sm sm:p-7">
              <div className="grid gap-5 md:grid-cols-[3rem_1fr]">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-lg shadow-emerald-950/10"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
                    <path d="M9 12h6M12 9v6" />
                  </svg>
                </div>
                <div className="space-y-4 text-sm leading-6 text-emerald-50/90 sm:text-base sm:leading-7">
                  <p className="font-semibold text-white">
                    {t("app.description")}
                  </p>
                  <p>{t("app.descriptionSecondary")}</p>
                  <p className="border-l-2 border-emerald-300/70 pl-4 text-emerald-100">
                    {t("app.privacyNotice")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    key: "personalized",
                    path: "M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z",
                  },
                  {
                    key: "confidential",
                    path: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5V10Zm7 4v2",
                  },
                  {
                    key: "professional",
                    path: "m5 12 4 4L19 6",
                  },
                ] as const
              ).map((benefit) => (
                <div
                  key={benefit.key}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-emerald-900/35 px-4 py-3.5 text-sm font-bold text-white"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-900"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d={benefit.path} />
                    </svg>
                  </span>
                  {t(`app.benefits.${benefit.key}`)}
                </div>
              ))}
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <PersonalInformationSection
            register={register}
            errors={errors}
            watch={watch}
          />
          <ConsultationReasonSection
            register={register}
            errors={errors}
            watch={watch}
          />
          <PersonalHistorySection
            register={register}
            errors={errors}
            watch={watch}
          />
          <FamilyHistorySection
            register={register}
            errors={errors}
            watch={watch}
          />
          <PsychobiologicalSection
            register={register}
            errors={errors}
            watch={watch}
          />
          <GastrointestinalSection register={register} errors={errors} />
          <FoodPreferencesSection
            register={register}
            errors={errors}
            watch={watch}
          />
          <RecallSection register={register} errors={errors} />
          <FoodFrequencySection
            register={register}
            errors={errors}
            watch={watch}
          />
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
