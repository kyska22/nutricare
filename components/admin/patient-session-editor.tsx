"use client";

import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  associatePatientWithCurrentNutritionist,
  getPatientSessionPackage,
  PatientSessionPackage,
  setPatientRemainingSessions,
} from "@/lib/supabase";

export function PatientSessionEditor({ patientCode }: { patientCode: string }) {
  const { t } = useI18n();
  const [currentPackage, setCurrentPackage] = useState<PatientSessionPackage | null>(null);
  const [available, setAvailable] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [associating, setAssociating] = useState(false);
  const [associated, setAssociated] = useState(false);

  useEffect(() => {
    let active = true;
    void getPatientSessionPackage(patientCode).then((result) => {
      if (!active) return;
      if (result.status === "success") {
        setCurrentPackage(result.data);
        if (result.data) setAvailable(String(result.data.remaining_sessions));
      } else {
        setError(result.status === "error" ? result.error : t("adminPatientSessions.loadError"));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [patientCode, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(available);
    if (!Number.isInteger(value) || value < 0 || value > 500 || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await setPatientRemainingSessions(patientCode, value);
      if (result.status === "success") {
        setCurrentPackage(result.data);
        setAvailable(String(result.data.remaining_sessions));
        setSaved(true);
      } else {
        setError(result.status === "error" ? result.error : t("adminPatientSessions.saveError"));
      }
    } catch {
      setError(t("adminPatientSessions.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleAssociate = async () => {
    if (associating) return;
    setAssociating(true);
    setError("");
    setAssociated(false);
    try {
      const association = await associatePatientWithCurrentNutritionist(patientCode);
      if (association.status !== "success") {
        setError(association.status === "error" ? association.error : t("adminPatientSessions.associationError"));
        return;
      }
      const packageResult = await getPatientSessionPackage(patientCode);
      if (packageResult.status === "success") {
        setCurrentPackage(packageResult.data);
        if (packageResult.data) setAvailable(String(packageResult.data.remaining_sessions));
        setError("");
        setAssociated(true);
      } else {
        setError(packageResult.status === "error" ? packageResult.error : t("adminPatientSessions.associationError"));
      }
    } catch {
      setError(t("adminPatientSessions.associationError"));
    } finally {
      setAssociating(false);
    }
  };

  return (
    <section className="rounded-3xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm sm:p-6 lg:col-span-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-emerald-950">{t("adminPatientSessions.title")}</h2>
        <p className="text-sm leading-6 text-slate-600">{t("adminPatientSessions.description")}</p>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-600">{t("adminPatientSessions.loading")}</p> : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="grid gap-2 text-sm font-semibold text-emerald-950">
            {t("adminPatientSessions.availableLabel")}
            <input type="number" min="0" max="500" step="1" required value={available} onChange={(event) => setAvailable(event.target.value)} className="min-h-11 w-full rounded-xl border border-emerald-900/20 bg-white px-3 text-base outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 sm:w-40" />
          </label>
          {currentPackage ? <p className="text-sm text-slate-600">{t("adminPatientSessions.usedLabel", { count: currentPackage.used_sessions })}</p> : <p className="text-sm text-slate-600">{t("adminPatientSessions.packageMissing")}</p>}
          <button type="submit" disabled={saving || loading} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60">
            {saving ? t("adminPatientSessions.saving") : t("adminPatientSessions.save")}
          </button>
        </form>
      )}
      {saved ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{t("adminPatientSessions.saved")}</p> : null}
      {associated ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{t("adminPatientSessions.associated")}</p> : null}
      {error.toLowerCase().includes("not assigned") ? <button type="button" onClick={() => void handleAssociate()} disabled={associating} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-700 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60">{associating ? t("adminPatientSessions.associating") : t("adminPatientSessions.associateButton")}</button> : null}
      {error ? <p role="alert" className="mt-3 break-words text-sm font-semibold text-red-700">{t("adminPatientSessions.errorPrefix")}: {error}</p> : null}
    </section>
  );
}
