"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserAuthClient, isSupabaseAuthConfigured } from "@/lib/supabase-auth";
import { Locale } from "@/lib/i18n/translations";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { PatientSessionControl } from "@/components/patients/patient-session-control";

type PatientAuthMode = "signIn" | "signUp" | "recovery" | "newPassword";

function getSafeNextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) {
    return "/pacientes/inicio";
  }
  if (!requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) {
    return "/pacientes/inicio";
  }

  try {
    const destination = new URL(requested, window.location.origin);
    return destination.origin === window.location.origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/pacientes/inicio";
  } catch {
    return "/pacientes/inicio";
  }
}

async function claimInvitationHistory(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserAuthClient>>,
  destination: string,
) {
  const invitationToken = new URL(destination, window.location.origin).searchParams.get("invite");
  if (!invitationToken || !/^[a-f0-9]{64}$/i.test(invitationToken)) return null;
  const { error } = await supabase.rpc("claim_patient_history_from_invitation", {
    p_token: invitationToken,
  });
  return error?.message ?? null;
}

const paths: Record<PatientAuthMode, string> = {
  signIn: "/pacientes/acceso",
  signUp: "/pacientes/registro",
  recovery: "/pacientes/recuperar",
  newPassword: "/pacientes/nueva-contrasena",
};

export function PatientAuthForm({ mode }: { mode: PatientAuthMode }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const destination = getSafeNextPath();
    setNextPath(destination);
    if (query.get("notice") === "professional") {
      setError(t("patientAuth.professionalAccess"));
    }

    if (query.has("next") && (mode === "signIn" || mode === "signUp")) {
      const supabase = createSupabaseBrowserAuthClient();
      if (supabase) {
        void supabase.auth.getUser().then(async ({ data }) => {
          if (!data.user) return;
          const claimError = await claimInvitationHistory(supabase, destination);
          if (claimError) {
            setError(t("patientAuth.linkError"));
            return;
          }
          router.replace(destination);
        });
      }
    }
  }, [mode, router, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode !== "newPassword" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("patientAuth.invalidEmail"));
      return;
    }
    if (mode === "signIn" && !password) {
      setError(t("patientAuth.passwordRequired"));
      return;
    }
    if ((mode === "signUp" || mode === "newPassword") && password.length < 8) {
      setError(t("patientAuth.passwordTooShort"));
      return;
    }
    if ((mode === "signUp" || mode === "newPassword") && password !== confirmPassword) {
      setError(t("patientAuth.passwordMismatch"));
      return;
    }

    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      setError(t("patientAuth.notConfigured"));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signIn") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(t("patientAuth.invalidCredentials"));
        } else {
          const destination = getSafeNextPath();
          const claimError = await claimInvitationHistory(supabase, destination);
          if (claimError) setError(t("patientAuth.linkError"));
          else {
            router.replace(destination);
            router.refresh();
          }
        }
      } else if (mode === "signUp") {
        const nextPath = getSafeNextPath();
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { account_type: "patient" },
            emailRedirectTo: `${window.location.origin}${paths.signIn}?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (authError) setError(t("patientAuth.signUpError"));
        else if (data.session) {
          const claimError = await claimInvitationHistory(supabase, nextPath);
          if (claimError) setError(t("patientAuth.linkError"));
          else {
            router.replace(nextPath);
            router.refresh();
          }
        } else setSuccess(t("patientAuth.signUpSuccess"));
      } else if (mode === "recovery") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}${paths.newPassword}` },
        );
        if (authError) setError(t("patientAuth.recoveryError"));
        else setSuccess(t("patientAuth.recoverySuccess"));
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) setError(t("patientAuth.recoveryError"));
        else {
          setSuccess(t("patientAuth.signedIn"));
          router.replace(paths.signIn);
        }
      }
    } catch (authError) {
      // A fetch TypeError means the browser could not reach the Supabase Auth
      // endpoint at all; show a configuration/connectivity hint instead of
      // making it look like the patient's credentials were rejected.
      if (authError instanceof TypeError && /fetch/i.test(authError.message)) {
        setError(t("patientAuth.connectionError"));
      } else {
        setError(mode === "recovery" || mode === "newPassword"
          ? t("patientAuth.recoveryError")
          : mode === "signUp" ? t("patientAuth.signUpError") : t("patientAuth.invalidCredentials"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titleKey = mode === "signIn" ? "signInTitle"
    : mode === "signUp" ? "signUpTitle"
      : mode === "recovery" ? "recoveryTitle" : "newPasswordTitle";
  const descriptionKey = mode === "signIn" ? "signInDescription"
    : mode === "signUp" ? "signUpDescription"
      : mode === "recovery" ? "recoveryDescription" : "newPasswordDescription";
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-200">
            <Image src="/brand/nutrijenhfit-logo.png" alt="" width={44} height={44} priority className="h-11 w-11 rounded-xl bg-white object-contain p-1 shadow-sm" />
            <span className="text-lg font-extrabold text-emerald-950">NutriJenhFit</span>
          </Link>
          <PatientSessionControl variant="light" />
          <label className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <span className="sr-only">{t("app.language")}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("app.language")} className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 outline-none focus:ring-4 focus:ring-emerald-100">
              <option value="es">ES</option><option value="pt">PT</option><option value="en">EN</option>
            </select>
          </label>
        </header>

        <section className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-3xl border border-emerald-950/5 bg-white shadow-xl shadow-emerald-950/10 md:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-emerald-900 px-6 py-8 text-white sm:px-9 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">{t("patientAuth.eyebrow")}</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{t(`patientAuth.${titleKey}`)}</h1>
            <p className="mt-3 leading-7 text-emerald-50/85">{t(`patientAuth.${descriptionKey}`)}</p>
            <p className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-emerald-50/90">{t("patientAuth.linkageNotice")}</p>
          </div>

          <div className="px-6 py-8 sm:px-9 sm:py-10">
            {mode !== "newPassword" ? (
              <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
                <label className="grid gap-2 text-sm font-semibold text-emerald-950">
                  {t("patientAuth.email")}
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={254} disabled={submitting} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50" />
                </label>
                {mode !== "recovery" ? <label className="grid gap-2 text-sm font-semibold text-emerald-950">
                  {t("patientAuth.password")}
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} required minLength={mode === "signIn" ? 1 : 8} disabled={submitting} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50" />
                </label> : null}
                {mode === "signUp" ? <label className="grid gap-2 text-sm font-semibold text-emerald-950">
                  {t("patientAuth.confirmPassword")}
                  <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} disabled={submitting} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50" />
                </label> : null}
                {!isSupabaseAuthConfigured() ? <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("patientAuth.notConfigured")}</p> : null}
                {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
                {success ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">{success}</p> : null}
                <button type="submit" disabled={submitting || !isSupabaseAuthConfigured()} className="min-h-12 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-md transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? t(mode === "signIn" ? "patientAuth.signingIn" : mode === "signUp" ? "patientAuth.signingUp" : "patientAuth.sendingRecovery") : t(mode === "signIn" ? "patientAuth.signIn" : mode === "signUp" ? "patientAuth.signUp" : "patientAuth.sendRecovery")}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
                <label className="grid gap-2 text-sm font-semibold text-emerald-950">{t("patientAuth.password")}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} disabled={submitting} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label>
                <label className="grid gap-2 text-sm font-semibold text-emerald-950">{t("patientAuth.confirmPassword")}<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} disabled={submitting} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label>
                {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
                {success ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">{success}</p> : null}
                <button type="submit" disabled={submitting || !isSupabaseAuthConfigured()} className="min-h-12 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-60">{submitting ? t("patientAuth.savingPassword") : t("patientAuth.savePassword")}</button>
              </form>
            )}

            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-emerald-800">
              {mode === "signIn" ? <><Link className="hover:underline" href={`${paths.recovery}?next=${encodeURIComponent(nextPath)}`}>{t("patientAuth.forgotPassword")}</Link><Link className="hover:underline" href={`${paths.signUp}?next=${encodeURIComponent(nextPath)}`}>{t("patientAuth.createAccount")}</Link></> : mode === "signUp" ? <span>{t("patientAuth.haveAccount")} <Link className="underline" href={`${paths.signIn}?next=${encodeURIComponent(nextPath)}`}>{t("patientAuth.backToSignIn")}</Link></span> : <Link className="hover:underline" href={`${paths.signIn}?next=${encodeURIComponent(nextPath)}`}>{t("patientAuth.backToSignIn")}</Link>}
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
