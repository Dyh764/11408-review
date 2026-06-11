import { todayIsoDate } from "@/lib/dates";

const motivationMessages = [
  "慢一点也没关系，今天走过的路，都会在下一次做题时回应你。",
  "不是突然变强，是每一次复盘都没有白费。",
  "把不会的题留下来，不是失败，是下一次翻盘的起点。",
  "今天先赢下一道题，剩下的路就会更清楚一点。",
  "稳住节奏，把薄弱处照亮，下一次考场上会感谢现在的你。",
];

export function getDailyMotivation(dateKey = todayIsoDate()) {
  const day = Number(dateKey.replaceAll("-", ""));
  const index = Number.isFinite(day) ? day % motivationMessages.length : 0;

  return motivationMessages[index];
}
