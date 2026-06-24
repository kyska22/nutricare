"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Locale } from "@/lib/i18n/translations";

interface AgendaPageProps {
  calLinks: {
    external: string;
    embed: string;
  } | null;
  sessionPrice: string | null;
  sessionDuration: string | null;
}

export function AgendaPage({
  calLinks,
  sessionPrice,
  sessionDuration,
}: AgendaPageProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-3xl bg-emerald-800 text-white shadow-2xl shadow-emerald-950/10">
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
                className="rounded-xl border border-white/20 bg-emerald-900/50 px-3 py-2 text-white outline-none focus:ring-4 focus:ring-white/15"
              >
                <option value="es">ES</option>
                <option value="pt">PT</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>

          <div className="px-5 py-9 sm:px-8 sm:py-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
                  {t("agenda.eyebrow")}
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                  {t("agenda.title")}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90 sm:text-lg">
                  {t("agenda.subtitle")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6">
          <h2 className="text-xl font-bold text-emerald-950">
            {t("agenda.serviceTitle")}
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                {t("agenda.priceLabel")}
              </dt>
              <dd className="mt-1 text-lg font-bold text-emerald-950">
                {sessionPrice ?? t("agenda.priceFallback")}
              </dd>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-orange-800">
                {t("agenda.durationLabel")}
              </dt>
              <dd className="mt-1 text-lg font-bold text-emerald-950">
                {sessionDuration ?? t("agenda.durationFallback")}
              </dd>
            </div>
          </dl>
          <div className="mt-5 space-y-2 border-t border-emerald-950/10 pt-5 text-sm leading-6 text-emerald-900/80">
            <p>{t("agenda.confirmationNotice")}</p>
            <p>{t("agenda.paymentNotice")}</p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
          {calLinks ? (
            <iframe
              src={calLinks.embed}
              title={t("agenda.calendarTitle")}
              loading="lazy"
              className="h-[720px] w-full border-0 sm:h-[800px]"
              allow="camera; microphone; fullscreen; payment"
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center p-6 text-center sm:p-10">
              <div className="max-w-xl">
                <span
                  aria-hidden="true"
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-7 w-7"
                  >
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </span>
                <h2 className="mt-5 text-xl font-bold text-emerald-950">
                  {t("agenda.notConfiguredTitle")}
                </h2>
                <p className="mt-2 leading-7 text-slate-600">
                  {t("agenda.notConfigured")}
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 font-bold text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            {t("agenda.back")}
          </Link>
          {calLinks ? (
            <a
              href={calLinks.external}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-900/10 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"
            >
              {t("agenda.openExternal")}
              <span aria-hidden="true">-&gt;</span>
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-200 px-5 py-3 font-bold text-slate-500"
            >
              {t("agenda.openExternal")}
              <span aria-hidden="true">-&gt;</span>
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
