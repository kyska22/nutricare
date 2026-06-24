import { AgendaPage } from "@/components/agenda/agenda-page";

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

export default function AgendaRoute() {
  const calLinks = getCalLinks(process.env.NEXT_PUBLIC_CAL_LINK);
  const sessionPrice = process.env.NEXT_PUBLIC_SESSION_PRICE?.trim() || null;
  const sessionDuration =
    process.env.NEXT_PUBLIC_SESSION_DURATION?.trim() || null;

  return (
    <AgendaPage
      calLinks={calLinks}
      sessionPrice={sessionPrice}
      sessionDuration={sessionDuration}
    />
  );
}
