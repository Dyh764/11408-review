const motivationMessages = [
  "慢一点也没关系，今天走过的路，都会在下一次做题时回应你。",
  "不是突然变强，是每一次复盘都没有白费。",
  "把不会的题留下来，不是失败，是下一次翻盘的起点。",
  "今天先赢下一道题，剩下的路就会更清楚一点。",
  "稳住节奏，把薄弱处照亮，下一次考场上会感谢现在的你。",
];

function fallbackTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyMotivation(dateKey = fallbackTodayIsoDate()) {
  const day = Number(dateKey.replaceAll("-", ""));
  const index = Number.isFinite(day) ? day % motivationMessages.length : 0;

  return motivationMessages[index];
}

export function buildMotivationCacheKey(userId: string | null | undefined, dateKey = fallbackTodayIsoDate()) {
  return `11408-review:motivation:${userId?.trim() || "anonymous"}:${dateKey}`;
}

export function isValidGeneratedMotivation(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const text = value.trim();

  return (
    text.length >= 8 &&
    text.length <= 42 &&
    /[\u4e00-\u9fff]/.test(text) &&
    !/[A-Za-z]{4,}/.test(text) &&
    !/歌词|歌手|周杰伦|林俊杰|五月天|Taylor|Swift/i.test(text)
  );
}

export function normalizeMotivationResponse(value: unknown, dateKey = fallbackTodayIsoDate()) {
  return isValidGeneratedMotivation(value) ? String(value).trim() : getDailyMotivation(dateKey);
}
