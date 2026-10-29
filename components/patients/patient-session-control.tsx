"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";
import { useI18n } from "@/lib/i18n/i18n-provider";

type SessionRole = "patient" | "nutritionist";

export function PatientSessionControl({
  variant = "dark",
  onRoleChange,
  hideHomeLink = false,
}: {
  variant?: "dark" | "light";
  onRoleChange?: (role: SessionRole | null) => void;
  hideHomeLink?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<SessionRole>("patient");
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalHref, setPortalHref] = useState("/pacientes/acceso");

  useEffect(() => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    setPortalHref(`/pacientes/acceso?next=${encodeURIComponent(currentPath)}`);
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!active) return;
      setEmail(user?.email ?? null);
      if (!user) {
        onRoleChange?.(null);
        return;
      }

      let nextRole: SessionRole = user.app_metadata?.role === "nutritionist" ? "nutritionist" : "patient";
      if (nextRole !== "nutritionist") {
        const { data: nutritionist } = await supabase
          .from("nutritionists")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (nutritionist) nextRole = "nutritionist";
      }
      if (active) {
        setRole(nextRole);
        onRoleChange?.(nextRole);
      }
      const invitationToken = new URLSearchParams(window.location.search).get("invite");
      if (active && nextRole === "patient" && invitationToken && /^[a-f0-9]{64}$/i.test(invitationToken)) {
        const { error: claimError } = await supabase.rpc("claim_patient_history_from_invitation", {
          p_token: invitationToken,
        });
        if (active && claimError) setError(t("patientAuth.linkError"));
      }
    }).catch(() => {
      if (active) setEmail(null);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) return;

    setError(null);
    setSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;

      setEmail(null);
      onRoleChange?.(null);
      router.replace("/pacientes/acceso");
      router.refresh();
    } catch {
      setError(t("patientAuth.signOutError"));
      setSigningOut(false);
    }
  };

  if (loading) return <span className="sr-only" aria-live="polite">{t("patientAuth.checkingSession")}</span>;

  if (!email) {
    return (
      <Link href={portalHref} className={`rounded-xl px-2 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 ${variant === "dark" ? "text-emerald-50 hover:bg-white/10 focus:ring-white/15" : "text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-100"}`}>
        {t("patientAuth.portalLink")}
      </Link>
    );
  }

  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      {role === "patient" && !hideHomeLink ? (
        <Link href="/pacientes/inicio" className={`rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 ${variant === "dark" ? "text-emerald-50 hover:bg-white/10 focus:ring-white/15" : "text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-100"}`}>
          {t("patientPortal.homeLink")}
        </Link>
      ) : null}
      <span className={`max-w-[15rem] truncate rounded-full border px-3 py-2 text-xs font-semibold sm:max-w-[20rem] ${variant === "dark" ? "border-white/20 bg-white/10 text-emerald-50" : "border-emerald-900/15 bg-emerald-50 text-emerald-950"}`}>
        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${variant === "dark" ? "bg-emerald-300" : "bg-emerald-600"}`} aria-hidden="true" />
        {t(role === "nutritionist" ? "adminAuth.sessionActive" : "patientAuth.sessionActive")}: {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-wait disabled:opacity-60 ${variant === "dark" ? "border-white/25 text-white hover:bg-white/10 focus:ring-white/15" : "border-emerald-800/25 text-emerald-900 hover:bg-emerald-50 focus:ring-emerald-100"}`}
      >
        {signingOut ? t("patientAuth.signingOut") : t("patientAuth.signOut")}
      </button>
      {error ? <span role="alert" className={`w-full text-right text-xs ${variant === "dark" ? "text-rose-100" : "text-rose-700"}`}>{error}</span> : null}
    </div>
  );
}
