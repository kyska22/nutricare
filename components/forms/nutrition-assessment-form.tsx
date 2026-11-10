"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { AssessmentSummary } from "./assessment-summary";
import { PatientSessionControl } from "@/components/patients/patient-session-control";
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
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";

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
    consultationModality: "online",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    occupation: "",
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
    // These measurements are optional; undefined matches the schema even when
    // the user never focuses their inputs (setValueAs only handles edits).
    hipCircumferenceCm: undefined,
    skinfolds: {
      bicepsMm: undefined,
      tricepsMm: undefined,
      subscapularMm: undefined,
      abdominalMm: undefined,
      supraespinalMm: undefined,
      suprailiacMm: undefined,
      thighMm: undefined,
      calfMm: undefined,
    },
  },
};

export function NutritionAssessmentForm() {
  const { locale, setLocale, t } = useI18n();
  const [submission, setSubmission] = useState<{
    data: NutritionAssessmentFormValues;
    assessment: AnthropometricAssessment;
    createdAt: string;
  } | null>(null);
  const [sessionRole, setSessionRole] = useState<"patient" | "nutritionist" | null>(null);
  const [isFollowup, setIsFollowup] = useState(false);
  const [hasSavedPersonalProfile, setHasSavedPersonalProfile] = useState(false);
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
    if (sessionRole !== "patient") return;
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) return;
    let active = true;
    void supabase.rpc("get_patient_followup_profile").then(({ data, error }) => {
      if (!active || error || !data || typeof data !== "object") return;
      const profileData = data as {
        has_previous_evaluation?: boolean;
        has_personal_profile?: boolean;
        profile?: Record<string, unknown>;
        age?: number | null;
        sex?: string | null;
        consultation_type?: string | null;
      };
      if (!profileData.has_previous_evaluation) return;
      setIsFollowup(true);
      setHasSavedPersonalProfile(Boolean(profileData.has_personal_profile));
      const profile = profileData.profile ?? {};
      const personalFields = ["firstName", "lastName", "email", "phone", "country", "occupation", "birthDate", "sex", "consultationModality"] as const;
      for (const field of personalFields) {
        const value = profile[field];
        if (typeof value === "string" && value) {
          setValue(`personalInformation.${field}`, value as never, { shouldDirty: false });
        }
      }
      const profileSex = typeof profile.sex === "string" ? profile.sex : null;
      const personalSex = profileSex ?? profileData.sex;
      if (personalSex === "male" || personalSex === "female" || personalSex === "prefer_not_to_answer") {
        setValue("personalInformation.sex", personalSex as never, { shouldDirty: false });
      }
      const anthropometricSex = profileSex === "male" || profileSex === "female"
        ? profileSex
        : profileData.sex === "male" || profileData.sex === "female" ? profileData.sex : null;
      if (anthropometricSex) setValue("anthropometrics.sex", anthropometricSex, { shouldDirty: false });
      const birthDate = typeof profile.birthDate === "string" ? profile.birthDate : "";
      const age = birthDate ? calculateAge(birthDate) : profileData.age;
      if (typeof age === "number" && age > 0) setValue("anthropometrics.age", age, { shouldDirty: false });
      if (typeof profileData.consultation_type === "string") {
        setValue("personalInformation.consultationType", profileData.consultation_type as never, { shouldDirty: false });
      }
    });
    return () => { active = false; };
  }, [sessionRole, setValue]);

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
    if (data.personalInformation?.consultationModality !== "inPerson") {
      data.anthropometrics.skinfolds = undefined;
    }
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
          if (isFollowup) window.location.reload();
          else reset(emptyValues as unknown as NutritionAssessmentFormValues);
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
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <PatientSessionControl onRoleChange={setSessionRole} />
              {sessionRole === "nutritionist" ? (
                <Link
                  href="/admin/evaluaciones"
                  className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl bg-orange-400 px-3 py-2 text-sm font-bold text-emerald-950 transition hover:bg-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-200/40"
                >
                  {t("adminNavigation.evaluations")}
                </Link>
              ) : null}
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
          </div>
          {sessionRole === "nutritionist" ? null : <div className="px-5 py-9 sm:px-8 sm:py-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-4xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                  {t("app.eyebrow")}
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                  {t(isFollowup ? "app.followupTitle" : "app.title")}
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

          </div>}
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {!(isFollowup && hasSavedPersonalProfile) ? <PersonalInformationSection
            register={register}
            errors={errors}
            watch={watch}
          /> : null}
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
          <AnthropometricsSection
            register={register}
            errors={errors}
            watch={watch}
            isNutritionist={sessionRole === "nutritionist"}
          />

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
