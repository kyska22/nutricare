import { AgendaPage } from "@/components/agenda/agenda-page";
import { getPublicAgendaSettings } from "@/lib/supabase";

type ConsultationType = "firstTime" | "followUp";

interface AgendaRouteProps {
  searchParams: Promise<{ consultationType?: string }>;
}

function getCalLinks(configuredLink: string | undefined) {
  const value = configuredLink?.trim();

  if (!value) {
    return null;
  }

  try {
    const externalUrl = new URL(value);
    if (!["http:", "https:"].includes(externalUrl.protocol)) {
      return null;
    }

    externalUrl.search = "";
    externalUrl.hash = "";

    return {
      external: externalUrl.toString(),
      embed: externalUrl.toString(),
    };
  } catch {
    return null;
  }
}

function getConsultationType(value: string | undefined): ConsultationType | null {
  return value === "firstTime" || value === "followUp" ? value : null;
}

export default async function AgendaRoute({ searchParams }: AgendaRouteProps) {
  const { consultationType } = await searchParams;
  const initialConsultationType = getConsultationType(consultationType);
  const settingsResult = await getPublicAgendaSettings();
  const settings =
    settingsResult.status === "success" ? settingsResult.data : null;
  const firstTimeLink =
    settings?.firstConsultationCalLink ??
    process.env.NEXT_PUBLIC_CAL_FIRST_TIME_LINK ??
    process.env.NEXT_PUBLIC_CAL_LINK;
  const followUpLink =
    settings?.followupCalLink ?? process.env.NEXT_PUBLIC_CAL_FOLLOW_UP_LINK;

  return (
    <AgendaPage
      initialConsultationType={initialConsultationType}
      consultationConfigurations={{
        firstTime: {
          calLinks: getCalLinks(firstTimeLink),
          sessionPrice:
            settings?.firstConsultationPrice ||
            process.env.NEXT_PUBLIC_FIRST_TIME_PRICE?.trim() ||
            process.env.NEXT_PUBLIC_SESSION_PRICE?.trim() ||
            null,
          sessionDuration:
            settings?.firstConsultationDuration ||
            process.env.NEXT_PUBLIC_SESSION_DURATION?.trim() || null,
        },
        followUp: {
          calLinks: getCalLinks(followUpLink),
          sessionPrice:
            settings?.followupPrice ||
            process.env.NEXT_PUBLIC_FOLLOW_UP_PRICE?.trim() ||
            null,
          sessionDuration: settings?.followupDuration || null,
        },
      }}
    />
  );
}
