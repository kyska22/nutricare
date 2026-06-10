"use client";

import { useMemo, useState } from "react";
import { AnthropometricAssessment } from "@/lib/calculations";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";

interface AssessmentSummaryProps {
  data: NutritionAssessmentFormValues;
  assessment: AnthropometricAssessment;
  createdAt: string;
  onEdit: () => void;
  onReset: () => void;
}

interface ReportSectionProps {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

interface ReviewFields {
  nutritionistObservations: string;
  recommendations: string;
  followUpPlan: string;
}

function ReportSection({ title, rows }: ReportSectionProps) {
  return (
    <section className="report-section rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
        {title}
      </h2>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-emerald-950/10 pb-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-base font-semibold text-emerald-950">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReviewTextarea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="report-section block rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
      <span className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-800">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-4 min-h-32 w-full resize-y rounded-xl border border-emerald-950/15 bg-emerald-50/30 px-4 py-3 text-[15px] leading-6 text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
      <div className="print-only mt-3 hidden whitespace-pre-wrap text-sm leading-6 text-emerald-950">
        {value || placeholder}
      </div>
    </label>
  );
}

export function AssessmentSummary({
  data,
  assessment,
  createdAt,
  onEdit,
  onReset,
}: AssessmentSummaryProps) {
  const { locale, t } = useI18n();
  const [review, setReview] = useState<ReviewFields>({
    nutritionistObservations: "",
    recommendations: "",
    followUpPlan: "",
  });
  const [feedback, setFeedback] = useState<"copied" | "saved" | "pdf" | null>(
    null,
  );

  const date = useMemo(() => new Date(createdAt), [createdAt]);
  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";
  const number = (value: number) =>
    new Intl.NumberFormat(localeTag, { maximumFractionDigits: 2 }).format(value);
  const withUnit = (value: number, unit: string) => `${number(value)} ${unit}`;
  const option = (group: string, value: string) => t(`options.${group}.${value}`);
  const classification = (group: string, value: string) =>
    t(`calculations.classifications.${group}.${value}`);
  const notProvided = t("summary.notProvided");

  const riskLevel = assessment.waistHeightRatio
    ? classification("waistHeight", assessment.waistHeightRatio.classification)
    : notProvided;

  const automaticObservations = useMemo(() => {
    const observations = [
      t(`professionalReport.automaticObservations.bmi.${assessment.bmi.classification}`),
    ];

    if (assessment.waistHeightRatio) {
      observations.push(
        t(
          `professionalReport.automaticObservations.waistHeight.${assessment.waistHeightRatio.classification}`,
        ),
      );
    }

    if (assessment.bodyFat && assessment.bodyComposition) {
      observations.push(
        t("professionalReport.automaticObservations.bodyComposition", {
          percentage: number(assessment.bodyFat.percentage),
          fatFreeMass: number(assessment.bodyComposition.fatFreeMassKg),
        }),
      );
    }

    return observations;
  }, [assessment, t, localeTag]);

  const generalRows = [
    {
      label: t("professionalReport.fields.date"),
      value: new Intl.DateTimeFormat(localeTag, { dateStyle: "long" }).format(date),
    },
    {
      label: t("professionalReport.fields.time"),
      value: new Intl.DateTimeFormat(localeTag, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date),
    },
    {
      label: t("fields.sex"),
      value: option("sex", data.anthropometrics.sex),
    },
    {
      label: t("fields.age"),
      value: withUnit(data.anthropometrics.age, t("units.years")),
    },
    {
      label: t("fields.weightKg"),
      value: withUnit(data.anthropometrics.weightKg, t("units.kilograms")),
    },
    {
      label: t("fields.heightMeters"),
      value: withUnit(data.anthropometrics.heightMeters, t("units.meters")),
    },
  ];

  const anthropometricRows = [
    { label: t("calculations.bmi"), value: number(assessment.bmi.value) },
    {
      label: t("professionalReport.fields.bmiClassification"),
      value: classification("bmi", assessment.bmi.classification),
    },
    {
      label: t("fields.abdominalCircumferenceCm"),
      value: withUnit(
        data.anthropometrics.abdominalCircumferenceCm,
        t("units.centimeters"),
      ),
    },
    {
      label: t("fields.hipCircumferenceCm"),
      value:
        data.anthropometrics.hipCircumferenceCm === undefined
          ? notProvided
          : withUnit(
              data.anthropometrics.hipCircumferenceCm,
              t("units.centimeters"),
            ),
    },
    {
      label: t("calculations.waistHipRatio"),
      value: assessment.waistHipRatio
        ? number(assessment.waistHipRatio.value)
        : notProvided,
    },
    {
      label: t("professionalReport.fields.associatedRisk"),
      value: riskLevel,
    },
  ];

  const compositionRows = [
    {
      label: t("calculations.bodyFat"),
      value: assessment.bodyFat
        ? withUnit(assessment.bodyFat.percentage, t("units.percentage"))
        : notProvided,
    },
    {
      label: t("calculations.fatMass"),
      value: assessment.bodyComposition
        ? withUnit(
            assessment.bodyComposition.fatMassKg,
            t("units.kilograms"),
          )
        : notProvided,
    },
    {
      label: t("calculations.fatFreeMass"),
      value: assessment.bodyComposition
        ? withUnit(
            assessment.bodyComposition.fatFreeMassKg,
            t("units.kilograms"),
          )
        : notProvided,
    },
    {
      label: t("calculations.muscleMass"),
      value: assessment.bodyComposition
        ? withUnit(
            assessment.bodyComposition.muscleMassKg,
            t("units.kilograms"),
          )
        : notProvided,
    },
  ];

  const buildReportText = () => {
    const sectionText = (title: string, rows: ReportSectionProps["rows"]) =>
      `${title}\n${rows.map((row) => `${row.label}: ${row.value}`).join("\n")}`;

    return [
      t("professionalReport.title"),
      t("professionalReport.status"),
      t("professionalReport.preliminaryNotice"),
      sectionText(t("professionalReport.sections.general"), generalRows),
      sectionText(
        t("professionalReport.sections.anthropometrics"),
        anthropometricRows,
      ),
      sectionText(
        t("professionalReport.sections.bodyComposition"),
        compositionRows,
      ),
      `${t("professionalReport.sections.automaticObservations")}\n${automaticObservations
        .map((item) => `- ${item}`)
        .join("\n")}`,
      `${t("professionalReport.sections.nutritionistObservations")}\n${
        review.nutritionistObservations || notProvided
      }`,
      `${t("professionalReport.sections.recommendations")}\n${
        review.recommendations || notProvided
      }`,
      `${t("professionalReport.sections.followUpPlan")}\n${
        review.followUpPlan || notProvided
      }`,
    ].join("\n\n");
  };

  const showFeedback = (nextFeedback: typeof feedback) => {
    setFeedback(nextFeedback);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildReportText());
    showFeedback("copied");
  };

  const handleSave = () => {
    // Future integration point: persist the professional review in a database.
    console.log("Professional review draft:", review);
    showFeedback("saved");
  };

  return (
    <main className="professional-report min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-5xl">
        <header className="report-header overflow-hidden rounded-3xl bg-emerald-900 text-white shadow-xl shadow-emerald-950/10">
          <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-start sm:justify-between sm:px-9 sm:py-9">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                {t("professionalReport.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {t("professionalReport.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base">
                {t("professionalReport.preliminaryNotice")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-amber-200/50 bg-amber-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-950">
              {t("professionalReport.status")}
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5">
          <ReportSection
            title={t("professionalReport.sections.general")}
            rows={generalRows}
          />
          <ReportSection
            title={t("professionalReport.sections.anthropometrics")}
            rows={anthropometricRows}
          />
          <ReportSection
            title={t("professionalReport.sections.bodyComposition")}
            rows={compositionRows}
          />

          <section className="report-section rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
              {t("professionalReport.sections.automaticObservations")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("professionalReport.automaticNotice")}
            </p>
            <ul className="mt-4 space-y-3">
              {automaticObservations.map((observation) => (
                <li
                  key={observation}
                  className="flex gap-3 rounded-xl bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-emerald-950"
                >
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                  {observation}
                </li>
              ))}
            </ul>
          </section>

          <ReviewTextarea
            label={t("professionalReport.sections.nutritionistObservations")}
            placeholder={t("professionalReport.placeholders.nutritionistObservations")}
            value={review.nutritionistObservations}
            onChange={(value) =>
              setReview((current) => ({
                ...current,
                nutritionistObservations: value,
              }))
            }
          />
          <ReviewTextarea
            label={t("professionalReport.sections.recommendations")}
            placeholder={t("professionalReport.placeholders.recommendations")}
            value={review.recommendations}
            onChange={(value) =>
              setReview((current) => ({ ...current, recommendations: value }))
            }
          />
          <ReviewTextarea
            label={t("professionalReport.sections.followUpPlan")}
            placeholder={t("professionalReport.placeholders.followUpPlan")}
            value={review.followUpPlan}
            onChange={(value) =>
              setReview((current) => ({ ...current, followUpPlan: value }))
            }
          />
        </div>

        {assessment.warnings.length > 0 ? (
          <section className="report-section mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">
              {t("calculations.warningsTitle")}
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {assessment.warnings.map((warning) => (
                <li key={warning}>{t(`calculations.warnings.${warning}`)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="report-actions sticky bottom-3 z-10 mt-6 rounded-2xl border border-emerald-950/10 bg-white/95 p-3 shadow-xl backdrop-blur sm:static sm:p-4">
          {feedback ? (
            <p role="status" className="mb-3 text-center text-sm font-semibold text-emerald-800">
              {t(`professionalReport.feedback.${feedback}`)}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-emerald-800 px-4 py-3 font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              {t("professionalReport.actions.copy")}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-emerald-800 px-4 py-3 font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              {t("professionalReport.actions.print")}
            </button>
            <button
              type="button"
              onClick={() => showFeedback("pdf")}
              aria-describedby="pdf-placeholder"
              className="rounded-xl border border-dashed border-slate-400 px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {t("professionalReport.actions.exportPdf")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
            >
              {t("professionalReport.actions.save")}
            </button>
          </div>
          <p id="pdf-placeholder" className="mt-2 text-center text-xs text-slate-500">
            {t("professionalReport.pdfPlaceholder")}
          </p>
        </div>

        <div className="report-secondary-actions mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            {t("actions.edit")}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl px-4 py-2.5 font-semibold text-slate-600 hover:bg-white"
          >
            {t("actions.newAssessment")}
          </button>
        </div>
      </article>
    </main>
  );
}
