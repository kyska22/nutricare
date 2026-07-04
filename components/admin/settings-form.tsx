"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "./admin-shell";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  getNutritionistSettings,
  NutritionistSettingsInput,
  updateNutritionistSettings,
} from "@/lib/supabase";

type LoadState = "loading" | "success" | "not_configured" | "error";
type Feedback = "saved" | "error" | null;

const emptySettings: NutritionistSettingsInput = {
  clinicName: "",
  professionalName: "",
  professionalRegistration: "",
  email: "",
  phone: "",
  whatsapp: "",
  country: "",
  city: "",
  logoUrl: "",
  firstConsultationPrice: "",
  followupPrice: "",
  firstConsultationDuration: "",
  followupDuration: "",
  currency: "",
  firstConsultationCalLink: "",
  followupCalLink: "",
  emailSignature: "",
  reportFooter: "",
  patientFinalText: "",
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-emerald-950">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-[15px] text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-emerald-950">
        {label}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full resize-y rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-[15px] leading-6 text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-emerald-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function SettingsForm() {
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>("loading");
  const [settings, setSettings] =
    useState<NutritionistSettingsInput>(emptySettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const updateField = (key: keyof NutritionistSettingsInput, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const loadSettings = useCallback(async () => {
    setState("loading");
    const result = await getNutritionistSettings();

    if (result.status === "success") {
      const { id: _id, nutritionistId: _nutritionistId, ...editable } =
        result.data;
      setSettings(editable);
      setState("success");
      return;
    }

    if (result.status === "error") {
      console.error("Unable to load nutritionist settings:", result.error);
    }

    setState(result.status);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    const result = await updateNutritionistSettings(settings);

    if (result.status !== "success") {
      if (result.status === "error") {
        console.error("Unable to save nutritionist settings:", result.error);
      }
      setFeedback("error");
      setIsSaving(false);
      return;
    }

    const { id: _id, nutritionistId: _nutritionistId, ...editable } =
      result.data;
    setSettings(editable);
    setFeedback("saved");
    setIsSaving(false);
  };

  return (
    <AdminShell
      title={t("adminSettings.title")}
      subtitle={t("adminSettings.subtitle")}
    >
      {state !== "success" ? (
        <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg shadow-emerald-950/5">
          <p className="font-semibold text-slate-600">
            {t(`adminSettings.states.${state === "not_configured" ? "notConfigured" : state}`)}
          </p>
        </section>
      ) : (
        <form
          className="mt-6 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          {feedback ? (
            <p
              role="status"
              className={`rounded-2xl px-4 py-3 text-center text-sm font-bold ${
                feedback === "saved"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {t(`adminSettings.feedback.${feedback}`)}
            </p>
          ) : null}

          <SettingsCard
            title={t("adminSettings.sections.profile.title")}
            description={t("adminSettings.sections.profile.description")}
          >
            <TextField
              label={t("adminSettings.fields.professionalName")}
              value={settings.professionalName}
              onChange={(value) => updateField("professionalName", value)}
            />
            <TextField
              label={t("adminSettings.fields.professionalRegistration")}
              value={settings.professionalRegistration}
              onChange={(value) =>
                updateField("professionalRegistration", value)
              }
            />
            <TextField
              label={t("adminSettings.fields.email")}
              value={settings.email}
              type="email"
              onChange={(value) => updateField("email", value)}
            />
            <TextField
              label={t("adminSettings.fields.whatsapp")}
              value={settings.whatsapp}
              type="tel"
              onChange={(value) => updateField("whatsapp", value)}
            />
            <TextField
              label={t("adminSettings.fields.phone")}
              value={settings.phone}
              type="tel"
              onChange={(value) => updateField("phone", value)}
            />
            <TextField
              label={t("adminSettings.fields.country")}
              value={settings.country}
              onChange={(value) => updateField("country", value)}
            />
            <TextField
              label={t("adminSettings.fields.city")}
              value={settings.city}
              onChange={(value) => updateField("city", value)}
            />
          </SettingsCard>

          <SettingsCard
            title={t("adminSettings.sections.agenda.title")}
            description={t("adminSettings.sections.agenda.description")}
          >
            <TextField
              label={t("adminSettings.fields.currency")}
              value={settings.currency}
              placeholder="EUR"
              onChange={(value) => updateField("currency", value)}
            />
            <TextField
              label={t("adminSettings.fields.firstConsultationPrice")}
              value={settings.firstConsultationPrice}
              placeholder="€40"
              onChange={(value) => updateField("firstConsultationPrice", value)}
            />
            <TextField
              label={t("adminSettings.fields.firstConsultationDuration")}
              value={settings.firstConsultationDuration}
              placeholder="45 minutos"
              onChange={(value) =>
                updateField("firstConsultationDuration", value)
              }
            />
            <TextField
              label={t("adminSettings.fields.firstConsultationCalLink")}
              value={settings.firstConsultationCalLink}
              type="url"
              placeholder="https://cal.com/..."
              onChange={(value) =>
                updateField("firstConsultationCalLink", value)
              }
            />
            <TextField
              label={t("adminSettings.fields.followupPrice")}
              value={settings.followupPrice}
              placeholder="€30"
              onChange={(value) => updateField("followupPrice", value)}
            />
            <TextField
              label={t("adminSettings.fields.followupDuration")}
              value={settings.followupDuration}
              placeholder="30 minutos"
              onChange={(value) => updateField("followupDuration", value)}
            />
            <TextField
              label={t("adminSettings.fields.followupCalLink")}
              value={settings.followupCalLink}
              type="url"
              placeholder="https://cal.com/..."
              onChange={(value) => updateField("followupCalLink", value)}
            />
          </SettingsCard>

          <SettingsCard
            title={t("adminSettings.sections.clinic.title")}
            description={t("adminSettings.sections.clinic.description")}
          >
            <TextField
              label={t("adminSettings.fields.clinicName")}
              value={settings.clinicName}
              onChange={(value) => updateField("clinicName", value)}
            />
            <TextField
              label={t("adminSettings.fields.logoUrl")}
              value={settings.logoUrl}
              type="url"
              placeholder={t("adminSettings.placeholders.logo")}
              onChange={(value) => updateField("logoUrl", value)}
            />
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900 sm:col-span-2">
              {t("adminSettings.logoNotice")}
            </p>
          </SettingsCard>

          <SettingsCard
            title={t("adminSettings.sections.reports.title")}
            description={t("adminSettings.sections.reports.description")}
          >
            <div className="sm:col-span-2">
              <TextAreaField
                label={t("adminSettings.fields.emailSignature")}
                value={settings.emailSignature}
                onChange={(value) => updateField("emailSignature", value)}
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label={t("adminSettings.fields.reportFooter")}
                value={settings.reportFooter}
                onChange={(value) => updateField("reportFooter", value)}
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label={t("adminSettings.fields.patientFinalText")}
                value={settings.patientFinalText}
                onChange={(value) => updateField("patientFinalText", value)}
              />
            </div>
          </SettingsCard>

          <div className="sticky bottom-4 z-10 flex justify-end rounded-3xl border border-emerald-100 bg-white/90 p-3 shadow-xl shadow-emerald-950/10 backdrop-blur">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-900/10 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving
                ? t("adminSettings.actions.saving")
                : t("adminSettings.actions.save")}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
