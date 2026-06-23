"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "./admin-shell";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  EvaluationDetailRecord,
  getEvaluationById,
  updateEvaluationReview,
} from "@/lib/supabase";

type LoadState = "loading" | "success" | "not_configured" | "error";
type DataObject = Record<string, unknown>;
type InfoRow = { label: string; value: string };

interface ReviewDraft {
  nutritionistObservations: string;
  recommendations: string;
  followUpPlan: string;
}

function asObject(value: unknown): DataObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DataObject)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ClinicalCard({ title, rows }: { title: string; rows: InfoRow[] }) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
        {title}
      </h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-emerald-950/10 pb-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-emerald-950">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReviewCard({
  title,
  value,
  editing,
  onChange,
  emptyText,
}: {
  title: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
        {title}
      </h2>
      {editing ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          className="min-h-36 w-full resize-y rounded-2xl border border-emerald-950/15 bg-emerald-50/30 px-4 py-3 leading-6 text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      ) : (
        <p className="whitespace-pre-wrap leading-7 text-emerald-950">
          {value || emptyText}
        </p>
      )}
    </section>
  );
}

export function EvaluationDetail({ evaluationId }: { evaluationId: string }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<LoadState>("loading");
  const [evaluation, setEvaluation] = useState<EvaluationDetailRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>({
    nutritionistObservations: "",
    recommendations: "",
    followUpPlan: "",
  });

  useEffect(() => {
    let active = true;

    void getEvaluationById(evaluationId).then((result) => {
      if (!active) return;

      if (result.status === "success") {
        setEvaluation(result.data);
        setState("success");
        return;
      }

      if (result.status === "error") {
        console.error("Unable to load evaluation details:", result.error);
      }

      setState(result.status);
    });

    return () => {
      active = false;
    };
  }, [evaluationId]);

  const raw = evaluation?.rawResults ?? null;
  const clinicalData = useMemo(
    () => asObject(raw?.clinicalData) ?? asObject(raw?.formData),
    [raw],
  );
  const assessment = useMemo(
    () => asObject(raw?.assessment) ?? raw,
    [raw],
  );
  const storedReview = useMemo(
    () => asObject(raw?.professionalReview) ?? asObject(raw?.review),
    [raw],
  );

  useEffect(() => {
    if (!evaluation) return;

    setDraft({
      nutritionistObservations:
        evaluation.nutritionistNotes ??
        asString(storedReview?.nutritionistObservations) ??
        "",
      recommendations:
        evaluation.recommendations ??
        asString(storedReview?.recommendations) ??
        "",
      followUpPlan:
        evaluation.followUpPlan ?? asString(storedReview?.followUpPlan) ?? "",
    });
  }, [evaluation, storedReview]);

  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";
  const missing = t("adminEvaluations.states.notAvailable");
  const formatNumber = (value: unknown, unit = "") => {
    const parsed = asNumber(value);
    return parsed === null
      ? missing
      : `${new Intl.NumberFormat(localeTag, { maximumFractionDigits: 2 }).format(parsed)}${unit}`;
  };
  const translate = (path: string, value: unknown) => {
    if (typeof value !== "string" || !value) return missing;
    const key = `${path}.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
  };
  const text = (value: unknown) => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return formatNumber(value);
    return missing;
  };
  const joinTranslated = (value: unknown, path: string, other?: unknown) => {
    const values = asStringArray(value).map((item) => translate(path, item));
    const otherText = asString(other);
    if (otherText) values.push(otherText);
    return values.length ? values.join(", ") : missing;
  };

  const personalInformation = asObject(clinicalData?.personalInformation);
  const personalHistory = asObject(clinicalData?.personalHistory);
  const familyHistory = asObject(clinicalData?.familyHistory);
  const psychobiological = asObject(clinicalData?.psychobiological);
  const gastrointestinal = asObject(clinicalData?.gastrointestinal);
  const dietaryHabits = asObject(clinicalData?.dietaryHabits);
  const recall = asObject(clinicalData?.recall24Hours);
  const anthropometrics = asObject(clinicalData?.anthropometrics);
  const weeklyFrequency = asObject(dietaryHabits?.weeklyFrequency);
  const bmi = asObject(assessment?.bmi);
  const waistHip = asObject(assessment?.waistHipRatio);
  const waistHeight = asObject(assessment?.waistHeightRatio);
  const bodyFat = asObject(assessment?.bodyFat);
  const composition = asObject(assessment?.bodyComposition);
  const restingEnergy = asObject(assessment?.restingEnergyExpenditure);
  const totalEnergy = asObject(assessment?.totalEnergyExpenditure);

  const resetDraft = () => {
    setDraft({
      nutritionistObservations:
        evaluation?.nutritionistNotes ??
        asString(storedReview?.nutritionistObservations) ??
        "",
      recommendations:
        evaluation?.recommendations ??
        asString(storedReview?.recommendations) ??
        "",
      followUpPlan:
        evaluation?.followUpPlan ?? asString(storedReview?.followUpPlan) ?? "",
    });
  };

  const handleSave = async () => {
    if (!evaluation) return;
    setSaving(true);
    setFeedback(null);

    const result = await updateEvaluationReview(evaluation.id, {
      ...draft,
      rawResults: evaluation.rawResults,
    });

    if (result.status !== "success") {
      if (result.status === "error") {
        console.error("Unable to update evaluation review:", result.error);
      }
      setFeedback("error");
      setSaving(false);
      return;
    }

    const nextRawResults = {
      ...(evaluation.rawResults ?? {}),
      professionalReview: draft,
    };
    setEvaluation({
      ...evaluation,
      nutritionistNotes: draft.nutritionistObservations || null,
      recommendations: draft.recommendations || null,
      followUpPlan: draft.followUpPlan || null,
      rawResults: nextRawResults,
    });
    setEditing(false);
    setSaving(false);
    setFeedback("saved");
  };

  const generalRows: InfoRow[] = evaluation
    ? [
        {
          label: t("adminEvaluations.fields.patientCode"),
          value: evaluation.patientCode || missing,
        },
        {
          label: t("adminEvaluations.fields.date"),
          value: new Intl.DateTimeFormat(localeTag, {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date(evaluation.evaluationDate)),
        },
        {
          label: t("adminEvaluations.fields.consultationType"),
          value: translate(
            "clinicalHistory.options.consultationType",
            evaluation.consultationType,
          ),
        },
        { label: t("adminEvaluations.fields.age"), value: formatNumber(evaluation.age) },
        {
          label: t("adminEvaluations.fields.sex"),
          value: translate("options.sex", evaluation.sex),
        },
        {
          label: t("adminEvaluations.fields.weight"),
          value: formatNumber(evaluation.weightKg, " kg"),
        },
      ]
    : [];

  const clinicalCards: Array<{ title: string; rows: InfoRow[] }> = [
    {
      title: t("adminEvaluations.sections.consultationReason"),
      rows: [
        {
          label: t("clinicalHistory.fields.consultationReason"),
          value: joinTranslated(
            personalInformation?.consultationReasons,
            "clinicalHistory.options.consultationReason",
            personalInformation?.otherConsultationReason,
          ),
        },
      ],
    },
    {
      title: t("adminEvaluations.sections.personalHistory"),
      rows: [
        ["currentDiseases", "currentOrPreviousDiseases"],
        ["previousDiseases", "previousDiseases"],
        ["surgeriesPerformed", "previousSurgeries"],
        ["currentMedications", "currentMedications"],
        ["currentSupplements", "currentSupplements"],
        ["hasChildren", "hasChildren"],
        ["numberOfChildren", "numberOfChildren"],
        ["birthType", "birthType"],
      ].map(([label, key]) => ({
        label: t(`clinicalHistory.fields.${label}`),
        value:
          key === "hasChildren"
            ? translate("options.yesNo", personalHistory?.[key])
            : key === "birthType"
              ? translate("clinicalHistory.options.birthType", personalHistory?.[key])
              : text(personalHistory?.[key]),
      })),
    },
    {
      title: t("adminEvaluations.sections.familyHistory"),
      rows: [
        {
          label: t("clinicalHistory.fields.fatherAlive"),
          value: translate("options.yesNo", familyHistory?.fatherAlive),
        },
        { label: t("clinicalHistory.fields.fatherAge"), value: text(familyHistory?.fatherAge) },
        { label: t("clinicalHistory.fields.fatherDiseases"), value: text(familyHistory?.fatherDiseases) },
        {
          label: t("clinicalHistory.fields.motherAlive"),
          value: translate("options.yesNo", familyHistory?.motherAlive),
        },
        { label: t("clinicalHistory.fields.motherAge"), value: text(familyHistory?.motherAge) },
        { label: t("clinicalHistory.fields.motherDiseases"), value: text(familyHistory?.motherDiseases) },
        {
          label: t("clinicalHistory.fields.familyConditions"),
          value: joinTranslated(
            familyHistory?.conditions,
            "clinicalHistory.options.familyCondition",
            familyHistory?.otherCondition,
          ),
        },
        { label: t("clinicalHistory.fields.familyObservations"), value: text(familyHistory?.observations) },
      ],
    },
    {
      title: t("adminEvaluations.sections.psychobiological"),
      rows: [
        { label: t("fields.activityLevel"), value: translate("options.activityLevel", psychobiological?.activityLevel) },
        { label: t("fields.exerciseType"), value: translate("options.exerciseType", psychobiological?.exerciseType) },
        { label: t("fields.exerciseFrequency"), value: text(psychobiological?.exerciseFrequency) },
        { label: t("fields.dailyWaterLiters"), value: formatNumber(psychobiological?.dailyWaterLiters, ` ${t("fields.waterUnit")}`) },
        { label: t("clinicalHistory.fields.tobacco"), value: translate("clinicalHistory.options.substanceUse", psychobiological?.tobacco) },
        { label: t("clinicalHistory.fields.alcohol"), value: translate("clinicalHistory.options.substanceUse", psychobiological?.alcohol) },
        { label: t("clinicalHistory.fields.coffee"), value: translate("options.yesNo", psychobiological?.coffee) },
        { label: t("clinicalHistory.fields.averageSleepHours"), value: translate("clinicalHistory.options.sleepHours", psychobiological?.averageSleepHours) },
        { label: t("clinicalHistory.fields.sleepQuality"), value: translate("clinicalHistory.options.sleepQuality", psychobiological?.sleepQuality) },
      ],
    },
    {
      title: t("adminEvaluations.sections.gastrointestinal"),
      rows: [
        { label: t("fields.bowelFrequency"), value: translate("options.bowelFrequency", gastrointestinal?.bowelFrequency) },
        { label: t("fields.stoolConsistency"), value: translate("options.stoolConsistency", gastrointestinal?.stoolConsistency) },
        { label: t("fields.stoolColor"), value: translate("options.stoolColor", gastrointestinal?.stoolColor) },
        { label: t("fields.constipation"), value: translate("options.yesNo", gastrointestinal?.constipation) },
        { label: t("fields.diarrhea"), value: translate("options.yesNo", gastrointestinal?.diarrhea) },
        { label: t("fields.hemorrhoids"), value: translate("options.yesNo", gastrointestinal?.hemorrhoids) },
      ],
    },
    {
      title: t("adminEvaluations.sections.foodPreferences"),
      rows: [
        { label: t("clinicalHistory.fields.foodAllergies"), value: text(dietaryHabits?.foodAllergies) },
        { label: t("clinicalHistory.fields.foodPreferences"), value: text(dietaryHabits?.foodPreferences) },
      ],
    },
    {
      title: t("adminEvaluations.sections.recall"),
      rows: (["breakfast", "lunch", "dinner", "snack"] as const).flatMap((meal) => [
        { label: t(`fields.${meal}`), value: text(recall?.[meal]) },
        {
          label: t(`fields.${meal}Time`),
          value:
            asString(recall?.[`${meal}Time`])
              ? `${recall?.[`${meal}Time`]} ${text(recall?.[`${meal}Period`])}`
              : missing,
        },
      ]),
    },
    {
      title: t("adminEvaluations.sections.foodFrequency"),
      rows: ([
        "dairy", "vegetables", "fruits", "carbohydrates", "beef", "pork",
        "poultry", "fish", "eggs", "processedMeats", "fats", "sweets",
        "softDrinks", "other",
      ] as const).map((group) => ({
        label: t(`clinicalHistory.options.foodGroup.${group}`),
        value: translate("clinicalHistory.options.foodFrequency", weeklyFrequency?.[group]),
      })),
    },
    {
      title: t("adminEvaluations.sections.anthropometrics"),
      rows: [
        { label: t("fields.weightKg"), value: formatNumber(anthropometrics?.weightKg ?? evaluation?.weightKg, " kg") },
        { label: t("fields.heightMeters"), value: formatNumber(anthropometrics?.heightMeters ?? evaluation?.heightM, " m") },
        { label: t("fields.abdominalCircumferenceCm"), value: formatNumber(anthropometrics?.abdominalCircumferenceCm ?? evaluation?.waistCm, " cm") },
        { label: t("fields.hipCircumferenceCm"), value: formatNumber(anthropometrics?.hipCircumferenceCm ?? evaluation?.hipCm, " cm") },
      ],
    },
  ];

  const resultRows: InfoRow[] = [
    { label: t("calculations.bmi"), value: formatNumber(bmi?.value ?? evaluation?.bmi) },
    { label: t("professionalReport.fields.bmiClassification"), value: translate("calculations.classifications.bmi", bmi?.classification ?? evaluation?.bmiClassification) },
    { label: t("calculations.waistHipRatio"), value: formatNumber(waistHip?.value ?? evaluation?.waistHipIndex) },
    { label: t("professionalReport.fields.associatedRisk"), value: translate("calculations.classifications.waistHeight", waistHeight?.classification ?? evaluation?.riskLevel) },
    { label: t("calculations.bodyFat"), value: formatNumber(bodyFat?.percentage ?? evaluation?.bodyFatPercentage, " %") },
    { label: t("calculations.fatMass"), value: formatNumber(composition?.fatMassKg ?? evaluation?.fatMassKg, " kg") },
    { label: t("calculations.fatFreeMass"), value: formatNumber(composition?.fatFreeMassKg ?? evaluation?.fatFreeMassKg, " kg") },
    { label: t("calculations.muscleMass"), value: formatNumber(composition?.muscleMassKg ?? evaluation?.muscleMassKg, " kg") },
    { label: t("calculations.restingEnergy"), value: formatNumber(restingEnergy?.valueKcal ?? evaluation?.restingEnergyKcal, " kcal") },
    { label: t("calculations.totalEnergy"), value: formatNumber(totalEnergy?.valueKcal ?? evaluation?.totalEnergyKcal, " kcal") },
  ];

  const automaticObservations = Array.isArray(raw?.automaticObservations)
    ? raw.automaticObservations.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <AdminShell
      title={t("adminEvaluations.detailTitle")}
      subtitle={t("adminEvaluations.detailSubtitle")}
    >
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/evaluaciones"
          className="inline-flex justify-center rounded-xl border border-emerald-700 bg-white px-4 py-2.5 font-bold text-emerald-800 transition hover:bg-emerald-50"
        >
          {t("adminEvaluations.actions.backToList")}
        </Link>
        {state === "success" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    resetDraft();
                    setEditing(false);
                    setFeedback(null);
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t("adminEvaluations.actions.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving
                    ? t("adminEvaluations.actions.savingChanges")
                    : t("adminEvaluations.actions.saveChanges")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setFeedback(null);
                }}
                className="rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white shadow-lg shadow-orange-900/10 hover:bg-orange-600"
              >
                {t("adminEvaluations.actions.editEvaluation")}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          role="status"
          className={`mt-4 rounded-2xl px-4 py-3 text-center text-sm font-bold ${
            feedback === "saved"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {t(`adminEvaluations.feedback.${feedback}`)}
        </p>
      ) : null}

      {state !== "success" || !evaluation ? (
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg shadow-emerald-950/5">
          <p className="font-semibold text-slate-600">
            {t(`adminEvaluations.states.${
              state === "not_configured" ? "notConfigured" : state
            }`)}
          </p>
        </section>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ClinicalCard
              title={t("adminEvaluations.sections.general")}
              rows={generalRows}
            />
          </div>

          {clinicalCards.map((card) => (
            <ClinicalCard key={card.title} title={card.title} rows={card.rows} />
          ))}

          <div className="lg:col-span-2">
            <ClinicalCard
              title={t("adminEvaluations.sections.anthropometricResults")}
              rows={resultRows}
            />
          </div>

          <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
              {t("adminEvaluations.sections.automaticObservations")}
            </h2>
            {automaticObservations.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {automaticObservations.map((observation) => (
                  <li
                    key={observation}
                    className="rounded-2xl bg-emerald-50 px-4 py-3 leading-6 text-emerald-950"
                  >
                    {observation}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">{missing}</p>
            )}
          </section>

          <ReviewCard
            title={t("adminEvaluations.sections.nutritionistObservations")}
            value={draft.nutritionistObservations}
            editing={editing}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                nutritionistObservations: value,
              }))
            }
            emptyText={missing}
          />
          <ReviewCard
            title={t("adminEvaluations.sections.recommendations")}
            value={draft.recommendations}
            editing={editing}
            onChange={(value) =>
              setDraft((current) => ({ ...current, recommendations: value }))
            }
            emptyText={missing}
          />
          <ReviewCard
            title={t("adminEvaluations.sections.followUpPlan")}
            value={draft.followUpPlan}
            editing={editing}
            onChange={(value) =>
              setDraft((current) => ({ ...current, followUpPlan: value }))
            }
            emptyText={missing}
          />

          <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <summary className="cursor-pointer font-bold text-emerald-800">
              {t("adminEvaluations.actions.showTechnicalData")}
            </summary>
            <pre className="mt-4 max-h-[38rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-emerald-950 p-4 text-xs leading-6 text-emerald-50">
              {JSON.stringify(evaluation.rawResults, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </AdminShell>
  );
}
