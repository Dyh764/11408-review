export const defaultTimeZone = "Asia/Shanghai";

export function normalizeTimeZone(value: string | null | undefined) {
  const timezone = value?.trim() || defaultTimeZone;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return defaultTimeZone;
  }
}

export function dateKeyInTimeZone(date: Date, timezone: string | null | undefined) {
  const normalized = normalizeTimeZone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalized,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function todayIsoDate(timezone?: string | null) {
  return dateKeyInTimeZone(new Date(), timezone);
}

export function formatDateTimeInTimeZone(value: string, timezone: string | null | undefined) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: normalizeTimeZone(timezone),
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
