"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "./admin-shell";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { associatePatientWithCurrentNutritionist } from "@/lib/supabase";

export function PatientAssociationForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [patientCode, setPatientCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const code = patientCode.trim().toUpperCase();
    try {
      const result = await associatePatientWithCurrentNutritionist(code);
      if (result.status !== "success") {
        setError(result.status === "error" ? result.error : t("patientAssociation.error"));
        return;
      }
      router.push(`/admin/pacientes/${encodeURIComponent(result.data.patient_code)}`);
    } catch {
      setError(t("patientAssociation.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title={t("patientAssociation.title")} subtitle={t("patientAssociation.subtitle")}>
      <section className="mt-6 max-w-2xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-emerald-950">
            {t("patientAssociation.codeLabel")}
            <input value={patientCode} onChange={(event) => setPatientCode(event.target.value)} required maxLength={40} autoCapitalize="characters" autoComplete="off" className="min-h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" placeholder="NJF-..." />
          </label>
          {error ? <p role="alert" className="break-words rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
          <button type="submit" disabled={saving || !patientCode.trim()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white hover:bg-orange-600 disabled:opacity-60">
            {saving ? t("patientAssociation.associating") : t("patientAssociation.submit")}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
