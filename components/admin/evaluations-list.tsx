"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "./admin-shell";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { EvaluationListItem, getEvaluations } from "@/lib/supabase";

type LoadState = "loading" | "success" | "not_configured" | "error";

export function EvaluationsList() {
  const { locale, t } = useI18n();
  const [state, setState] = useState<LoadState>("loading");
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);

  const loadEvaluations = useCallback(async () => {
    setState("loading");
    const result = await getEvaluations();

    if (result.status === "success") {
      setEvaluations(result.data);
      setState("success");
      return;
    }

    if (result.status === "error") {
      console.error("Unable to load evaluations:", result.error);
    }

    setEvaluations([]);
    setState(result.status);
  }, []);

  useEffect(() => {
    void loadEvaluations();
  }, [loadEvaluations]);

  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";
  const missing = t("adminEvaluations.states.notAvailable");
  const formatNumber = (value: number | null, suffix = "") =>
    value === null
      ? missing
      : `${new Intl.NumberFormat(localeTag, { maximumFractionDigits: 2 }).format(value)}${suffix}`;
  const formatDate = (value: string) =>
    value
      ? new Intl.DateTimeFormat(localeTag, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : missing;
  const translateOption = (path: string, value: string | null) =>
    value ? t(`${path}.${value}`) : missing;

  return (
    <AdminShell
      title={t("adminEvaluations.title")}
      subtitle={t("adminEvaluations.subtitle")}
    >
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void loadEvaluations()}
          disabled={state === "loading"}
          className="rounded-xl border border-emerald-700 bg-white px-4 py-2.5 font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
        >
          {t("adminEvaluations.actions.refresh")}
        </button>
      </div>

      {state !== "success" ? (
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg shadow-emerald-950/5">
          <p className="font-semibold text-slate-600">
            {t(`adminEvaluations.states.${
              state === "not_configured" ? "notConfigured" : state
            }`)}
          </p>
        </section>
      ) : evaluations.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg shadow-emerald-950/5">
          <p className="font-semibold text-slate-600">
            {t("adminEvaluations.states.empty")}
          </p>
        </section>
      ) : (
        <section className="mt-5 grid gap-4">
          {evaluations.map((evaluation) => (
            <article
              key={evaluation.id}
              className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <dl className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {[
                    ["date", formatDate(evaluation.evaluationDate)],
                    ["patientCode", evaluation.patientCode || missing],
                    [
                      "consultationType",
                      translateOption(
                        "clinicalHistory.options.consultationType",
                        evaluation.consultationType,
                      ),
                    ],
                    ["age", formatNumber(evaluation.age)],
                    ["sex", translateOption("options.sex", evaluation.sex)],
                    ["weight", formatNumber(evaluation.weightKg, " kg")],
                    ["bmi", formatNumber(evaluation.bmi)],
                    [
                      "bmiClassification",
                      translateOption(
                        "calculations.classifications.bmi",
                        evaluation.bmiClassification,
                      ),
                    ],
                    [
                      "risk",
                      translateOption(
                        "calculations.classifications.waistHeight",
                        evaluation.riskLevel,
                      ),
                    ],
                  ].map(([field, value]) => (
                    <div key={field}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(`adminEvaluations.fields.${field}`)}
                      </dt>
                      <dd className="mt-1 font-semibold text-emerald-950">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <Link
                  href={`/admin/evaluaciones/${evaluation.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"
                >
                  {t("adminEvaluations.actions.viewDetail")}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </AdminShell>
  );
}
