"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  createSupabaseBrowserAuthClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase-auth";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Locale } from "@/lib/i18n/translations";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const supabase = createSupabaseBrowserAuthClient();

    if (!supabase) {
      setError(t("adminAuth.notConfigured"));
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Admin login failed:", signInError.message);
      setError(t("adminAuth.invalidCredentials"));
      setIsSubmitting(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") || "/admin/evaluaciones";
    router.replace(redirectTo.startsWith("/admin") ? redirectTo : "/admin/evaluaciones");
    router.refresh();
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-3xl bg-emerald-900 text-white shadow-2xl shadow-emerald-950/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5">
                <Image
                  src="/brand/nutrijenhfit-logo.png"
                  alt=""
                  width={40}
                  height={40}
                  priority
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="text-lg font-bold">{t("app.name")}</span>
            </Link>

            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
              <span className="hidden sm:inline">{t("app.language")}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                aria-label={t("app.language")}
                className="rounded-xl border border-white/20 bg-emerald-950/40 px-3 py-2 text-white outline-none focus:ring-4 focus:ring-white/15"
              >
                <option value="es">ES</option>
                <option value="pt">PT</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>

          <div className="px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
              {t("adminAuth.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("adminAuth.title")}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-emerald-50/85">
              {t("adminAuth.subtitle")}
            </p>
          </div>
        </header>

        <section className="mx-auto mt-6 max-w-xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-emerald-950">
                {t("adminAuth.email")}
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-[15px] text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-emerald-950">
                {t("adminAuth.password")}
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-[15px] text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {!isSupabaseAuthConfigured() ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {t("adminAuth.notConfigured")}
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseAuthConfigured()}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-900/10 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t("adminAuth.signingIn")
                : t("adminAuth.signIn")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
