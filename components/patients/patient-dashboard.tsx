"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";
import { PatientSessionControl } from "@/components/patients/patient-session-control";
import { useI18n } from "@/lib/i18n/i18n-provider";

type Evaluation = {
  id: string;
  evaluation_date: string;
  weight_kg: number | null;
  age: number | null;
  sex: string | null;
  bmi: number | null;
  bmi_classification: string | null;
  waist_cm: number | null;
  risk_level: string | null;
  total_energy_kcal: number | null;
  daily_water_liters: number | null;
  recommendations: string | null;
  follow_up_plan: string | null;
  professional_review: Record<string, unknown>;
};

type DashboardData = {
  patient_code: string;
  packages: Array<{
    id: string;
    total_sessions: number;
    used_sessions: number;
    remaining_sessions: number;
    status: string;
  }>;
  session_logs: Array<{
    id: string;
    session_date: string;
    session_type: string | null;
    notes: string | null;
  }>;
  evaluations: Evaluation[];
};

function asDashboardData(value: unknown): DashboardData | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.patient_code !== "string") return null;
  const evaluations = Array.isArray(row.evaluations) ? row.evaluations : [];
  const packages = Array.isArray(row.packages) ? row.packages : [];
  const sessionLogs = Array.isArray(row.session_logs) ? row.session_logs : [];
  return {
    patient_code: row.patient_code,
    evaluations: evaluations.filter((item): item is Evaluation => Boolean(item && typeof item === "object" && typeof (item as Evaluation).id === "string")),
    packages: packages.filter((item): item is DashboardData["packages"][number] => Boolean(item && typeof item === "object" && typeof (item as DashboardData["packages"][number]).id === "string")),
    session_logs: sessionLogs.filter((item): item is DashboardData["session_logs"][number] => Boolean(item && typeof item === "object" && typeof (item as DashboardData["session_logs"][number]).id === "string")),
  };
}

function ProgressChart({ title, values, color, unit, locale }: {
  title: string;
  values: Array<{ date: string; value: number }>;
  color: string;
  unit: string;
  locale: string;
}) {
  const width = 600;
  const height = 210;
  const pad = { top: 20, right: 20, bottom: 35, left: 48 };
  const min = Math.min(...values.map((item) => item.value));
  const max = Math.max(...values.map((item) => item.value));
  const span = max - min || 1;
  const points = values.map((item, index) => ({
    ...item,
    x: pad.left + (values.length === 1 ? (width - pad.left - pad.right) / 2 : index * (width - pad.left - pad.right) / (values.length - 1)),
    y: pad.top + (max - item.value) * (height - pad.top - pad.bottom) / span,
  }));
  const dateFormat = (date: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(new Date(date));

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-bold text-emerald-950">{title}</h2>
      {values.length < 2 ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">Se necesitan al menos dos evaluaciones para mostrar una evolución.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="min-w-[32rem] w-full">
            {[0, 1, 2, 3].map((line) => {
              const y = pad.top + line * (height - pad.top - pad.bottom) / 3;
              return <line key={line} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />;
            })}
            <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
            {points.map((point) => <g key={point.date}><circle cx={point.x} cy={point.y} r="6" fill="white" stroke={color} strokeWidth="3" /><text x={point.x} y={height - 9} textAnchor="middle" fill="#64748b" fontSize="12">{dateFormat(point.date)}</text></g>)}
            <text x="4" y={pad.top + 4} fill="#475569" fontSize="12">{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(max)} {unit}</text>
            <text x="4" y={height - pad.bottom + 2} fill="#475569" fontSize="12">{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(min)} {unit}</text>
          </svg>
        </div>
      )}
    </section>
  );
}

export function PatientDashboard() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      setError(t("patientPortal.notConfigured"));
      setLoading(false);
      return;
    }

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.replace(`/pacientes/acceso?next=${encodeURIComponent("/pacientes/inicio")}`);
        return;
      }
      setEmail(user.email ?? "");
      if (user.app_metadata?.role === "nutritionist") {
        router.replace("/admin/evaluaciones");
        return;
      }
      const { data: nutritionist } = await supabase.from("nutritionists").select("id").eq("user_id", user.id).maybeSingle();
      if (nutritionist) {
        router.replace("/admin/evaluaciones");
        return;
      }
      const { data, error: dashboardError } = await supabase.rpc("get_patient_portal_dashboard");
      if (!active) return;
      if (dashboardError) setError(t("patientPortal.loadError"));
      else {
        const parsed = asDashboardData(data);
        if (parsed) setDashboard(parsed);
        else setError(t("patientPortal.loadError"));
      }
      setLoading(false);
    })().catch(() => {
      if (active) {
        setError(t("patientPortal.loadError"));
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [router, t]);

  const latest = dashboard?.evaluations.at(-1) ?? null;
  const sessions = useMemo(() => ({
    total: dashboard?.packages.reduce((sum, item) => sum + Number(item.total_sessions || 0), 0) ?? 0,
    used: dashboard?.packages.reduce((sum, item) => sum + Number(item.used_sessions || 0), 0) ?? 0,
    remaining: dashboard?.packages.reduce((sum, item) => sum + Number(item.remaining_sessions || 0), 0) ?? 0,
  }), [dashboard]);
  const formatNumber = (value: number | null | undefined, unit = "") => value == null
    ? t("patientPortal.notAvailable")
    : `${new Intl.NumberFormat(localeTag, { maximumFractionDigits: 1 }).format(value)}${unit}`;
  const formatDate = (value: string) => new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" }).format(new Date(value));
  const review = latest?.professional_review ?? {};
  const mealPlan = typeof review.mealPlan === "string" ? review.mealPlan.trim() : "";
  const recommendations = latest?.recommendations || (typeof review.recommendations === "string" ? review.recommendations.trim() : "");
  const weightPoints = (dashboard?.evaluations ?? []).filter((item) => item.weight_kg != null).map((item) => ({ date: item.evaluation_date, value: item.weight_kg as number }));
  const bmiPoints = (dashboard?.evaluations ?? []).filter((item) => item.bmi != null).map((item) => ({ date: item.evaluation_date, value: item.bmi as number }));
  const adultEnergy = latest && (latest.age ?? 0) >= 18 && latest.total_energy_kcal != null
    ? latest.total_energy_kcal
    : null;
  const carbohydrateRange = adultEnergy == null ? null : {
    min: Math.round(adultEnergy * 0.45 / 4),
    max: Math.round(adultEnergy * 0.6 / 4),
  };
  const fatRange = adultEnergy == null ? null : {
    min: Math.round(adultEnergy * 0.2 / 9),
    max: Math.round(adultEnergy * 0.35 / 9),
  };
  const waterAi = latest && (latest.age ?? 0) >= 18
    ? latest.sex === "male" ? "2.5 L" : latest.sex === "female" ? "2.0 L" : null
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-emerald-900 px-5 py-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">{t("patientPortal.eyebrow")}</p>
            <h1 className="mt-2 text-2xl font-bold">{t("patientPortal.title")}</h1>
            {email ? <p className="mt-1 text-sm text-emerald-50/80">{email}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/" className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl bg-orange-400 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-200/40">
              {t("patientPortal.newEvaluation")}
            </Link>
            <PatientSessionControl hideHomeLink />
          </div>
        </header>

        {loading ? <p className="mt-6 rounded-2xl bg-white p-5 text-emerald-900">{t("patientPortal.loading")}</p> : null}
        {error ? <section role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><p>{error}</p><p className="mt-2 text-sm">{t("patientPortal.migrationHint")}</p><Link className="mt-3 inline-block font-bold underline" href="/">{t("patientPortal.backToForm")}</Link></section> : null}

        {dashboard && !loading ? <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{t("patientPortal.patientCode")}</p><p className="mt-2 break-all text-xl font-bold text-emerald-900">{dashboard.patient_code}</p></article>
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{t("patientPortal.sessionsUsed")}</p><p className="mt-2 text-3xl font-bold text-emerald-900">{sessions.used}<span className="text-base font-semibold text-slate-500"> / {sessions.total}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${sessions.total ? Math.min(sessions.used / sessions.total * 100, 100) : 0}%` }} /></div></article>
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{t("patientPortal.remainingSessions")}</p><p className="mt-2 text-3xl font-bold text-emerald-900">{sessions.remaining}</p></article>
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{t("patientPortal.latestCalories")}</p><p className="mt-2 text-3xl font-bold text-emerald-900">{formatNumber(latest?.total_energy_kcal, " kcal")}</p><p className="mt-1 text-xs text-slate-500">{latest ? formatDate(latest.evaluation_date) : ""}</p></article>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <ProgressChart title={t("patientPortal.weightProgress")} values={weightPoints} color="#047857" unit="kg" locale={localeTag} />
            <ProgressChart title={t("patientPortal.bmiProgress")} values={bmiPoints} color="#f97316" unit="" locale={localeTag} />
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold text-emerald-950">{t("patientPortal.menuTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("patientPortal.menuCalories", { calories: formatNumber(latest?.total_energy_kcal, " kcal") })}</p>
              {mealPlan ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{mealPlan}</p> : <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{t("patientPortal.menuPending")}</p>}
            </article>
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold text-emerald-950">{t("patientPortal.suggestionsTitle")}</h2>
              {recommendations ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{recommendations}</p> : <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700"><li>{t("patientPortal.europeanSuggestion1")}</li><li>{t("patientPortal.europeanSuggestion2")}</li><li>{t("patientPortal.europeanSuggestion3")}</li></ul>}
              {carbohydrateRange && fatRange ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="font-bold">{t("patientPortal.europeanReferenceTitle")}</p><p className="mt-1">{t("patientPortal.macroBase", { carbohydrates: `${carbohydrateRange.min}-${carbohydrateRange.max}`, fats: `${fatRange.min}-${fatRange.max}` })}</p>{waterAi ? <p className="mt-1">{t("patientPortal.waterBase", { water: waterAi })}</p> : null}</div> : null}
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">{t("patientPortal.professionalReviewNotice")}</p>
            </article>
          </section>

          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-emerald-950">{t("patientPortal.historyTitle")}</h2>
            {dashboard.evaluations.length ? <ol className="mt-4 divide-y divide-slate-100">{[...dashboard.evaluations].reverse().map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-emerald-950">{formatDate(item.evaluation_date)}</p><p className="text-sm text-slate-600">{t("patientPortal.weightLabel")}: {formatNumber(item.weight_kg, " kg")} · IMC: {formatNumber(item.bmi)}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{item.bmi_classification || t("patientPortal.evaluationSaved")}</span></li>)}</ol> : <p className="mt-3 text-sm text-slate-600">{t("patientPortal.noHistory")}</p>}
          </section>
        </> : null}
      </div>
    </main>
  );
}
