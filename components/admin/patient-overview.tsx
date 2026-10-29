"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "./admin-shell";
import { PatientSessionEditor } from "./patient-session-editor";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";
import { getNutritionistPatientOverview, PatientAppointment, schedulePatientAppointment } from "@/lib/supabase";

type PatientRecord = { id: string; patient_code: string; created_at: string };
type PatientEvaluation = Record<string, unknown> & {
  id: string;
  evaluation_date: string;
  weight_kg: number | null;
  bmi: number | null;
  raw_results: Record<string, unknown> | null;
};
type Overview = {
  patient: PatientRecord;
  evaluations: PatientEvaluation[];
  packages: Array<Record<string, unknown>>;
  session_logs: Array<Record<string, unknown>>;
  appointments: PatientAppointment[];
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseOverview(value: unknown): Overview | null {
  const row = objectValue(value);
  const patient = objectValue(row?.patient);
  if (!patient || typeof patient.patient_code !== "string") return null;
  return {
    patient: patient as unknown as PatientRecord,
    evaluations: (Array.isArray(row?.evaluations) ? row.evaluations : []).filter((item): item is PatientEvaluation => {
      const evaluation = objectValue(item);
      return typeof evaluation?.id === "string" && typeof evaluation.evaluation_date === "string";
    }),
    packages: Array.isArray(row?.packages) ? row.packages as Array<Record<string, unknown>> : [],
    session_logs: Array.isArray(row?.session_logs) ? row.session_logs as Array<Record<string, unknown>> : [],
    appointments: Array.isArray(row?.appointments) ? row.appointments as PatientAppointment[] : [],
  };
}

function dataEntries(value: unknown): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  const visit = (record: Record<string, unknown>, prefix = "") => {
    for (const [key, item] of Object.entries(record)) {
      if (item === null || item === undefined || item === "") continue;
      const label = `${prefix}${key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())}`;
      if (Array.isArray(item)) {
        const text = item.filter((entry) => entry !== null && entry !== undefined && entry !== "").map(String).join(", ");
        if (text) result.push([label, text]);
      } else if (typeof item === "object") {
        visit(item as Record<string, unknown>, `${label} / `);
      } else {
        result.push([label, String(item)]);
      }
    }
  };
  const source = objectValue(value);
  if (source) visit(source);
  return result;
}

function localDateTimeMinimum() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function PatientOverview({ patientCode }: { patientCode: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [appointmentLink, setAppointmentLink] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [appointmentFeedback, setAppointmentFeedback] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = createSupabaseBrowserAuthClient();
      if (!supabase) {
        if (active) {
          setError(t("adminPatientOverview.loadError"));
          setState("error");
        }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.replace(`/admin/login?redirectTo=${encodeURIComponent(`/admin/pacientes/${patientCode}`)}`);
        return;
      }
      const { data: nutritionist } = await supabase.from("nutritionists").select("id").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (!nutritionist && user.app_metadata?.role !== "nutritionist") {
        router.replace("/pacientes/inicio");
        return;
      }
      const result = await getNutritionistPatientOverview(patientCode);
      if (!active) return;
      if (result.status === "success") {
        const parsed = parseOverview(result.data);
        if (parsed) {
          setOverview(parsed);
          setState("success");
          return;
        }
      }
      setError(result.status === "error" ? result.error : t("adminPatientOverview.loadError"));
      setState("error");
    };
    void load().catch(() => {
      if (active) {
        setError(t("adminPatientOverview.loadError"));
        setState("error");
      }
    });
    return () => { active = false; };
  }, [patientCode, router, t]);

  const latest = overview?.evaluations[0] ?? null;
  const raw = objectValue(latest?.raw_results);
  const clinicalData = objectValue(raw?.clinicalData) ?? objectValue(raw?.formData);
  const personal = objectValue(clinicalData?.personalInformation);
  const fullName = [personal?.firstName, personal?.lastName].filter((value) => typeof value === "string" && value.trim()).join(" ");
  const profileSections = useMemo(() => ([
    [t("adminPatientOverview.sections.personalInformation"), clinicalData?.personalInformation],
    [t("adminPatientOverview.sections.personalHistory"), clinicalData?.personalHistory],
    [t("adminPatientOverview.sections.familyHistory"), clinicalData?.familyHistory],
    [t("adminPatientOverview.sections.lifestyle"), clinicalData?.psychobiological],
    [t("adminPatientOverview.sections.gastrointestinal"), clinicalData?.gastrointestinal],
    [t("adminPatientOverview.sections.dietaryHabits"), clinicalData?.dietaryHabits],
    [t("adminPatientOverview.sections.recall"), clinicalData?.recall24Hours],
  ] as const).map(([title, value]) => ({ title, entries: dataEntries(value) })).filter((section) => section.entries.length), [clinicalData, t]);
  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";
  const formatDate = (value: string, withTime = false) => new Intl.DateTimeFormat(localeTag, withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));

  const handleSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduledAt || savingAppointment) return;
    setSavingAppointment(true);
    setError("");
    setAppointmentFeedback("");
    try {
      const result = await schedulePatientAppointment({
        patientCode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        appointmentLink,
        notes: appointmentNotes,
      });
      if (result.status !== "success") {
        setError(result.status === "error" ? result.error : t("adminPatientOverview.scheduleError"));
        return;
      }
      setOverview((current) => current ? {
        ...current,
        appointments: [result.data, ...current.appointments].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()),
      } : current);
      setScheduledAt("");
      setAppointmentLink("");
      setAppointmentNotes("");
      setAppointmentFeedback(t("adminPatientOverview.scheduled"));
    } catch {
      setError(t("adminPatientOverview.scheduleError"));
    } finally {
      setSavingAppointment(false);
    }
  };

  return (
    <AdminShell title={t("adminPatientOverview.title")} subtitle={t("adminPatientOverview.subtitle")}>
      {state === "loading" ? <section className="mt-6 rounded-3xl bg-white p-8 text-center text-slate-600">{t("adminPatientOverview.loading")}</section> : null}
      {error ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p> : null}
      {overview ? <>
        <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{t("adminPatientOverview.patientCode")}</p>
              <h2 className="mt-1 text-2xl font-bold text-emerald-950">{fullName || overview.patient.patient_code}</h2>
              {fullName ? <p className="mt-1 text-sm text-slate-600">{overview.patient.patient_code}</p> : null}
              {typeof personal?.email === "string" ? <p className="mt-1 text-sm text-slate-600">{personal.email}</p> : null}
              {typeof personal?.phone === "string" ? <p className="mt-1 text-sm text-slate-600">{personal.phone}</p> : null}
            </div>
            <Link href="/admin/evaluaciones" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-700 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">{t("adminPatientOverview.backToEvaluations")}</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">{t("adminPatientOverview.evaluationCount")}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{overview.evaluations.length}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">{t("adminPatientOverview.sessionsUsed")}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{overview.packages.reduce((sum, item) => sum + Number(item.used_sessions ?? 0), 0)}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">{t("adminPatientOverview.nextAppointment")}</p><p className="mt-1 text-base font-bold text-emerald-950">{overview.appointments.filter((item) => item.status === "scheduled" && new Date(item.scheduled_at) >= new Date()).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ? formatDate(overview.appointments.filter((item) => item.status === "scheduled" && new Date(item.scheduled_at) >= new Date()).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0].scheduled_at, true) : t("adminPatientOverview.noAppointment")}</p></div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PatientSessionEditor patientCode={patientCode} />
          <section className="rounded-3xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-emerald-950">{t("adminPatientOverview.scheduleTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("adminPatientOverview.scheduleDescription")}</p>
            <form onSubmit={(event) => void handleSchedule(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-emerald-950">{t("adminPatientOverview.dateTime")}<input required type="datetime-local" min={localDateTimeMinimum()} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="min-h-11 rounded-xl border border-emerald-900/20 bg-white px-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" /></label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950">{t("adminPatientOverview.meetingLink")}<input type="url" value={appointmentLink} onChange={(event) => setAppointmentLink(event.target.value)} placeholder="https://" className="min-h-11 rounded-xl border border-emerald-900/20 bg-white px-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" /></label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 sm:col-span-2">{t("adminPatientOverview.appointmentNotes")}<textarea rows={2} maxLength={2000} value={appointmentNotes} onChange={(event) => setAppointmentNotes(event.target.value)} className="rounded-xl border border-emerald-900/20 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" /></label>
              <button type="submit" disabled={savingAppointment} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white hover:bg-orange-600 disabled:opacity-60 sm:col-span-2">{savingAppointment ? t("adminPatientOverview.scheduling") : t("adminPatientOverview.scheduleButton")}</button>
            </form>
            {appointmentFeedback ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{appointmentFeedback}</p> : null}
            {overview.appointments.length ? <ul className="mt-5 grid gap-2">{[...overview.appointments].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).map((appointment) => <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4"><div><p className="font-bold text-emerald-950">{formatDate(appointment.scheduled_at, true)}</p>{appointment.notes ? <p className="mt-1 text-sm text-slate-600">{appointment.notes}</p> : null}</div><div className="flex items-center gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{t(`adminPatientOverview.status.${appointment.status ?? "scheduled"}`)}</span>{appointment.appointment_link ? <a href={appointment.appointment_link} target="_blank" rel="noreferrer" className="text-sm font-bold text-orange-700 underline">{t("adminPatientOverview.openLink")}</a> : null}</div></li>)}</ul> : null}
          </section>
        </div>

        {profileSections.length ? <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold text-emerald-950">{t("adminPatientOverview.generalInformation")}</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{profileSections.map((section) => <article key={section.title} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-bold text-emerald-900">{section.title}</h3><dl className="mt-3 grid gap-2">{section.entries.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(7rem,0.8fr)_1.2fr] gap-2 text-sm"><dt className="font-semibold text-slate-500">{label}</dt><dd className="break-words text-slate-800">{value}</dd></div>)}</dl></article>)}</div></section> : null}

        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-emerald-950">{t("adminPatientOverview.evaluationHistory")}</h2>
          {overview.evaluations.length ? <ol className="mt-4 grid gap-3">{overview.evaluations.map((evaluation) => <li key={evaluation.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-emerald-950">{formatDate(evaluation.evaluation_date)}</p><p className="mt-1 text-sm text-slate-600">{t("adminPatientOverview.weight")}: {evaluation.weight_kg == null ? "-" : `${evaluation.weight_kg} kg`} · IMC: {evaluation.bmi == null ? "-" : evaluation.bmi}</p></div><Link href={`/admin/evaluaciones/${evaluation.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">{t("adminPatientOverview.viewEvaluation")}</Link></li>)}</ol> : <p className="mt-3 text-sm text-slate-600">{t("adminPatientOverview.noEvaluations")}</p>}
        </section>
      </> : null}
    </AdminShell>
  );
}
