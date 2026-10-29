"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "./admin-shell";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { deleteEvaluation, EvaluationListItem, getEvaluations } from "@/lib/supabase";

type LoadState = "loading" | "success" | "not_configured" | "error";

export function EvaluationsList() {
  const { locale, t } = useI18n();
  const [state, setState] = useState<LoadState>("loading");
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"copied" | "error" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState(false);

  const createInvitation = async () => {
    if (creatingInvitation) return;
    setInviteError("");
    setCreatingInvitation(true);
    try {
      const response = await fetch("/api/evaluation-invitations", { method: "POST" });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") {
        setInviteError(result.error ?? t("adminEvaluations.feedback.invitationError"));
        return;
      }
      setInviteUrl(result.url);
    } catch {
      setInviteError(t("adminEvaluations.feedback.invitationError"));
    } finally {
      setCreatingInvitation(false);
    }
  };

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyFeedback("copied");
    } catch {
      setCopyFeedback("error");
    }
  };

  const handleDeleteEvaluation = async (evaluation: EvaluationListItem) => {
    if (deletingId || !window.confirm(t("adminEvaluations.actions.confirmDelete"))) return;
    setDeletingId(evaluation.id);
    setDeleteError("");
    setDeleteFeedback(false);
    try {
      const result = await deleteEvaluation(evaluation.id);
      if (result.status === "success") {
        setEvaluations((current) => current.filter((item) => item.id !== evaluation.id));
        setDeleteFeedback(true);
      } else {
        setDeleteError(result.status === "error" ? result.error : t("adminEvaluations.feedback.deleteError"));
      }
    } catch {
      setDeleteError(t("adminEvaluations.feedback.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

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
        <button type="button" onClick={() => void createInvitation()} className="rounded-xl bg-emerald-800 px-4 py-2.5 font-bold text-white hover:bg-emerald-900">
          Generar enlace público
        </button>
      </div>
      {inviteUrl ? <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4">
        <label className="block text-sm font-bold text-emerald-900">{t("adminEvaluations.actions.invitationLink")}</label>
        <input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm" />
        <button type="button" onClick={() => void copyInvitation()} className="mt-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800">{t("adminEvaluations.actions.copyLink")}</button>
        {copyFeedback ? <span role="status" className="ml-3 text-sm text-emerald-800">{t(`adminEvaluations.feedback.${copyFeedback === "copied" ? "linkCopied" : "copyError"}`)}</span> : null}
      </div> : null}
      {inviteError ? <p role="alert" className="mt-2 text-sm text-red-700">{inviteError}</p> : null}
      {deleteFeedback ? <p role="status" className="mt-2 text-sm text-emerald-800">{t("adminEvaluations.feedback.deleted")}</p> : null}
      {deleteError ? <p role="alert" className="mt-2 text-sm text-red-700">{t("adminEvaluations.feedback.deleteError")}: {deleteError}</p> : null}
      <div className="mt-3 flex justify-end">
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
                        {field === "patientCode" && evaluation.patientCode ? (
                          <Link href={`/admin/pacientes/${encodeURIComponent(evaluation.patientCode)}`} className="underline decoration-emerald-300 underline-offset-4 hover:text-emerald-700">
                            {value}
                          </Link>
                        ) : value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                  <Link href={`/admin/evaluaciones/${evaluation.id}`} className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200">
                    {t("adminEvaluations.actions.viewDetail")}
                  </Link>
                  <button type="button" onClick={() => void handleDeleteEvaluation(evaluation)} disabled={deletingId !== null} className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-red-300 bg-white px-5 py-2.5 font-bold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-wait disabled:opacity-60">
                    {deletingId === evaluation.id ? t("adminEvaluations.actions.deleting") : t("adminEvaluations.actions.deleteEvaluation")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </AdminShell>
  );
}
