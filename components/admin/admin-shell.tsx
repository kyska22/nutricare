"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Locale } from "@/lib/i18n/translations";

interface AdminShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserAuthClient();

    if (supabase) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Admin sign out failed:", error.message);
      }
    }

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
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

            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                {t("adminAuth.signOut")}
              </button>
            </div>
          </div>

          <div className="px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
              {t("adminEvaluations.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-emerald-50/85">
              {subtitle}
            </p>
          </div>
        </header>

        <nav className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/evaluaciones"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            {t("adminNavigation.evaluations")}
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            {t("adminNavigation.settings")}
          </Link>
        </nav>

        {children}
      </div>
    </main>
  );
}
