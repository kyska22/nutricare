export function normalizeFlexibleTimeInput(value: string): string | null {
  const rawValue = value.trim().replace(/\s+/g, "");

  if (!rawValue) return "";

  const colonMatch = rawValue.match(/^(\d{1,2}):(\d{1,2})$/);

  if (colonMatch) {
    return formatTimeParts(colonMatch[1], colonMatch[2]);
  }

  if (!/^\d{1,4}$/.test(rawValue)) return null;

  if (rawValue.length <= 2) {
    return formatTimeParts(rawValue, "00");
  }

  const hour = rawValue.slice(0, rawValue.length - 2);
  const minutes = rawValue.slice(-2);

  return formatTimeParts(hour, minutes);
}

function formatTimeParts(hourValue: string, minuteValue: string): string | null {
  const hour = Number(hourValue);
  const minutes = Number(minuteValue);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minutes) ||
    hour < 0 ||
    hour > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${hour.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}
