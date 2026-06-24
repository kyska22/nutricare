import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AnthropometricAssessment } from "@/lib/calculations";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";

export type SupabaseResult<T> =
  | { status: "success"; data: T }
  | { status: "not_configured" }
  | { status: "error"; error: string };

interface AnonymousPatient {
  id: string;
  patient_code: string;
  created_at?: string;
}

interface PackageRecord {
  id: string;
  patient_id: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions?: number;
  status: string;
}

interface EvaluationRecord {
  id: string;
  patient_id: string;
}

export interface EvaluationListItem {
  id: string;
  evaluationDate: string;
  patientCode: string;
  consultationType: string | null;
  age: number | null;
  sex: string | null;
  weightKg: number | null;
  bmi: number | null;
  bmiClassification: string | null;
  riskLevel: string | null;
}

export interface EvaluationDetailRecord extends EvaluationListItem {
  patientId: string;
  heightM: number | null;
  waistCm: number | null;
  hipCm: number | null;
  waistHipIndex: number | null;
  bodyFatPercentage: number | null;
  fatMassKg: number | null;
  fatFreeMassKg: number | null;
  muscleMassKg: number | null;
  restingEnergyKcal: number | null;
  totalEnergyKcal: number | null;
  rawResults: Record<string, unknown> | null;
  nutritionistNotes: string | null;
  recommendations: string | null;
  followUpPlan: string | null;
  createdAt: string;
}

export interface ProfessionalReviewInput {
  nutritionistObservations: string;
  recommendations: string;
  followUpPlan: string;
}

interface SaveEvaluationInput {
  patientId: string;
  idempotencyKey: string;
  formData: NutritionAssessmentFormValues;
  assessment: AnthropometricAssessment;
  evaluationDate?: string;
  automaticObservations: string[];
  professionalReview: ProfessionalReviewInput;
}

interface RegisterSessionUseInput {
  packageId: string;
  evaluationId?: string;
  sessionType?: string;
  notes?: string;
}

interface UpdateEvaluationReviewInput extends ProfessionalReviewInput {
  rawResults: Record<string, unknown> | null;
}

let supabaseClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (supabaseClient === undefined) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseClient;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Supabase error";
}

function getPatientCode(relation: unknown) {
  if (Array.isArray(relation)) {
    const first = relation[0] as { patient_code?: unknown } | undefined;
    return typeof first?.patient_code === "string" ? first.patient_code : "";
  }

  if (relation && typeof relation === "object") {
    const patientCode = (relation as { patient_code?: unknown }).patient_code;
    return typeof patientCode === "string" ? patientCode : "";
  }

  return "";
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapEvaluationListItem(row: Record<string, unknown>): EvaluationListItem {
  return {
    id: String(row.id),
    evaluationDate: String(row.evaluation_date ?? row.created_at ?? ""),
    patientCode: getPatientCode(row.anonymous_patients),
    consultationType:
      typeof row.consultation_type === "string" ? row.consultation_type : null,
    age: nullableNumber(row.age),
    sex: typeof row.sex === "string" ? row.sex : null,
    weightKg: nullableNumber(row.weight_kg),
    bmi: nullableNumber(row.bmi),
    bmiClassification:
      typeof row.bmi_classification === "string"
        ? row.bmi_classification
        : null,
    riskLevel:
      typeof row.risk_level === "string" ? row.risk_level : null,
  };
}

export async function getEvaluations(): Promise<
  SupabaseResult<EvaluationListItem[]>
> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" };
  }

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .select(
        "id, evaluation_date, created_at, consultation_type, age, sex, weight_kg, bmi, bmi_classification, risk_level, anonymous_patients(patient_code)",
      )
      .order("evaluation_date", { ascending: false });

    if (error) {
      return { status: "error", error: error.message };
    }

    return {
      status: "success",
      data: (data ?? []).map((row) =>
        mapEvaluationListItem(row as Record<string, unknown>),
      ),
    };
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) };
  }
}

export async function getEvaluationById(
  evaluationId: string,
): Promise<SupabaseResult<EvaluationDetailRecord>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" };
  }

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*, anonymous_patients(patient_code)")
      .eq("id", evaluationId)
      .single();

    if (error) {
      return { status: "error", error: error.message };
    }

    const row = data as Record<string, unknown>;
    const listItem = mapEvaluationListItem(row);

    return {
      status: "success",
      data: {
        ...listItem,
        patientId: String(row.patient_id),
        heightM: nullableNumber(row.height_m),
        waistCm: nullableNumber(row.waist_cm),
        hipCm: nullableNumber(row.hip_cm),
        waistHipIndex: nullableNumber(row.waist_hip_index),
        bodyFatPercentage: nullableNumber(row.body_fat_percentage),
        fatMassKg: nullableNumber(row.fat_mass_kg),
        fatFreeMassKg: nullableNumber(row.fat_free_mass_kg),
        muscleMassKg: nullableNumber(row.muscle_mass_kg),
        restingEnergyKcal: nullableNumber(row.resting_energy_kcal),
        totalEnergyKcal: nullableNumber(row.total_energy_kcal),
        rawResults:
          row.raw_results && typeof row.raw_results === "object"
            ? (row.raw_results as Record<string, unknown>)
            : null,
        nutritionistNotes:
          typeof row.nutritionist_notes === "string"
            ? row.nutritionist_notes
            : null,
        recommendations:
          typeof row.recommendations === "string" ? row.recommendations : null,
        followUpPlan:
          typeof row.follow_up_plan === "string" ? row.follow_up_plan : null,
        createdAt: String(row.created_at ?? row.evaluation_date ?? ""),
      },
    };
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) };
  }
}

export async function updateEvaluationReview(
  evaluationId: string,
  review: UpdateEvaluationReviewInput,
): Promise<SupabaseResult<{ id: string }>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" };
  }

  const rawResults = {
    ...(review.rawResults ?? {}),
    professionalReview: {
      nutritionistObservations: review.nutritionistObservations,
      recommendations: review.recommendations,
      followUpPlan: review.followUpPlan,
    },
  };

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .update({
        nutritionist_notes: review.nutritionistObservations.trim() || null,
        recommendations: review.recommendations.trim() || null,
        follow_up_plan: review.followUpPlan.trim() || null,
        raw_results: rawResults,
      })
      .eq("id", evaluationId)
      .select("id")
      .single();

    if (error) {
      return { status: "error", error: error.message };
    }

    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) };
  }
}

function generatePatientCode() {
  const randomValues = new Uint32Array(2);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    randomValues[0] = Math.floor(Math.random() * 0xffffffff);
    randomValues[1] = Math.floor(Math.random() * 0xffffffff);
  }

  return `NJF-${Array.from(randomValues)
    .map((value) => value.toString(36).toUpperCase().padStart(7, "0"))
    .join("-")}`;
}

export function buildAnonymizedRawResults(
  formData: NutritionAssessmentFormValues,
  assessment: AnthropometricAssessment,
  automaticObservations: string[],
  professionalReview: ProfessionalReviewInput,
) {
  const personalInformation = formData.personalInformation;

  return {
    schemaVersion: "2.1",
    clinicalData: {
      personalInformation: {
        consultationType: personalInformation?.consultationType ?? null,
        sex: personalInformation?.sex ?? formData.anthropometrics.sex,
        consultationReasons: personalInformation?.consultationReasons ?? [],
        otherConsultationReason:
          personalInformation?.otherConsultationReason?.trim() || null,
      },
      personalHistory: formData.personalHistory ?? null,
      familyHistory: formData.familyHistory ?? null,
      psychobiological: formData.psychobiological,
      gastrointestinal: formData.gastrointestinal,
      dietaryHabits: formData.dietaryHabits ?? null,
      recall24Hours: formData.recall24Hours,
      anthropometrics: formData.anthropometrics,
    },
    assessment,
    automaticObservations,
    professionalReview,
  };
}

export async function createAnonymousPatient(patientCode = generatePatientCode()) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" } satisfies SupabaseResult<AnonymousPatient>;
  }

  try {
    const { data: existingPatient, error: lookupError } = await supabase
      .from("anonymous_patients")
      .select("id, patient_code, created_at")
      .eq("patient_code", patientCode)
      .maybeSingle();

    if (lookupError) {
      return { status: "error", error: lookupError.message } satisfies SupabaseResult<AnonymousPatient>;
    }

    if (existingPatient) {
      return {
        status: "success",
        data: existingPatient,
      } satisfies SupabaseResult<AnonymousPatient>;
    }

    const { data, error } = await supabase
      .from("anonymous_patients")
      .insert({ patient_code: patientCode })
      .select("id, patient_code, created_at")
      .single();

    if (error) {
      return { status: "error", error: error.message } satisfies SupabaseResult<AnonymousPatient>;
    }

    return { status: "success", data } satisfies SupabaseResult<AnonymousPatient>;
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) } satisfies SupabaseResult<AnonymousPatient>;
  }
}

export async function saveEvaluation({
  patientId,
  idempotencyKey,
  formData,
  assessment,
  evaluationDate,
  automaticObservations,
  professionalReview,
}: SaveEvaluationInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" } satisfies SupabaseResult<EvaluationRecord>;
  }

  const anthropometrics = formData.anthropometrics;
  const rawResults = buildAnonymizedRawResults(
    formData,
    assessment,
    automaticObservations,
    professionalReview,
  );

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .insert({
        patient_id: patientId,
        idempotency_key: idempotencyKey,
        evaluation_date: evaluationDate ?? new Date().toISOString(),
        consultation_type: formData.personalInformation?.consultationType ?? null,
        sex: anthropometrics.sex,
        age: anthropometrics.age,
        weight_kg: anthropometrics.weightKg,
        height_m: anthropometrics.heightMeters,
        waist_cm: anthropometrics.abdominalCircumferenceCm,
        hip_cm: anthropometrics.hipCircumferenceCm ?? null,
        daily_water_liters: formData.psychobiological.dailyWaterLiters,
        bmi: assessment.bmi.value,
        bmi_classification: assessment.bmi.classification,
        waist_hip_index: assessment.waistHipRatio?.value ?? null,
        risk_level: assessment.waistHeightRatio?.classification ?? null,
        body_fat_percentage: assessment.bodyFat?.percentage ?? null,
        fat_mass_kg: assessment.bodyComposition?.fatMassKg ?? null,
        fat_free_mass_kg: assessment.bodyComposition?.fatFreeMassKg ?? null,
        muscle_mass_kg: assessment.bodyComposition?.muscleMassKg ?? null,
        resting_energy_kcal: assessment.restingEnergyExpenditure.valueKcal,
        total_energy_kcal: assessment.totalEnergyExpenditure?.valueKcal ?? null,
        raw_results: rawResults,
        nutritionist_notes:
          professionalReview.nutritionistObservations.trim() || null,
        recommendations: professionalReview.recommendations.trim() || null,
        follow_up_plan: professionalReview.followUpPlan.trim() || null,
      })
      .select("id, patient_id")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        const { data: existingEvaluation, error: existingError } = await supabase
          .from("evaluations")
          .select("id, patient_id")
          .eq("idempotency_key", idempotencyKey)
          .single();

        if (!existingError && existingEvaluation) {
          return {
            status: "success",
            data: existingEvaluation,
          } satisfies SupabaseResult<EvaluationRecord>;
        }
      }

      return { status: "error", error: error.message } satisfies SupabaseResult<EvaluationRecord>;
    }

    return { status: "success", data } satisfies SupabaseResult<EvaluationRecord>;
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) } satisfies SupabaseResult<EvaluationRecord>;
  }
}

export async function createPackage(patientId: string, totalSessions = 10) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" } satisfies SupabaseResult<PackageRecord>;
  }

  try {
    const { data, error } = await supabase
      .from("packages")
      .insert({
        patient_id: patientId,
        total_sessions: totalSessions,
        used_sessions: 0,
        status: "active",
      })
      .select("id, patient_id, total_sessions, used_sessions, remaining_sessions, status")
      .single();

    if (error) {
      return { status: "error", error: error.message } satisfies SupabaseResult<PackageRecord>;
    }

    return { status: "success", data } satisfies SupabaseResult<PackageRecord>;
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) } satisfies SupabaseResult<PackageRecord>;
  }
}

export async function registerSessionUse({
  packageId,
  evaluationId,
  sessionType,
  notes,
}: RegisterSessionUseInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" } satisfies SupabaseResult<{ id: string }>;
  }

  try {
    const { data: currentPackage, error: packageError } = await supabase
      .from("packages")
      .select("used_sessions")
      .eq("id", packageId)
      .single();

    if (packageError) {
      return { status: "error", error: packageError.message } satisfies SupabaseResult<{ id: string }>;
    }

    const { data, error } = await supabase
      .from("session_logs")
      .insert({
        package_id: packageId,
        evaluation_id: evaluationId ?? null,
        session_type: sessionType ?? null,
        notes: notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return { status: "error", error: error.message } satisfies SupabaseResult<{ id: string }>;
    }

    const { error: updateError } = await supabase
      .from("packages")
      .update({ used_sessions: Number(currentPackage.used_sessions ?? 0) + 1 })
      .eq("id", packageId);

    if (updateError) {
      return { status: "error", error: updateError.message } satisfies SupabaseResult<{ id: string }>;
    }

    return { status: "success", data } satisfies SupabaseResult<{ id: string }>;
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) } satisfies SupabaseResult<{ id: string }>;
  }
}

export async function getPatientHistory(patientCode: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { status: "not_configured" } satisfies SupabaseResult<unknown>;
  }

  try {
    const { data: patient, error: patientError } = await supabase
      .from("anonymous_patients")
      .select("id, patient_code, created_at")
      .eq("patient_code", patientCode)
      .single();

    if (patientError) {
      return { status: "error", error: patientError.message } satisfies SupabaseResult<unknown>;
    }

    const [evaluations, packages] = await Promise.all([
      supabase
        .from("evaluations")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("packages")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false }),
    ]);

    if (evaluations.error || packages.error) {
      return {
        status: "error",
        error:
          evaluations.error?.message ??
          packages.error?.message ??
          "Unable to load patient history",
      } satisfies SupabaseResult<unknown>;
    }

    const packageIds = (packages.data ?? []).map((item) => item.id);
    const sessionLogs =
      packageIds.length > 0
        ? await supabase
            .from("session_logs")
            .select("*")
            .in("package_id", packageIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };

    if (sessionLogs.error) {
      return {
        status: "error",
        error: sessionLogs.error.message,
      } satisfies SupabaseResult<unknown>;
    }

    return {
      status: "success",
      data: {
        patient,
        evaluations: evaluations.data ?? [],
        packages: packages.data ?? [],
        sessionLogs: sessionLogs.data ?? [],
      },
    } satisfies SupabaseResult<unknown>;
  } catch (error) {
    return { status: "error", error: toErrorMessage(error) } satisfies SupabaseResult<unknown>;
  }
}
