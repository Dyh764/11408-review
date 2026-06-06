import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import type { Difficulty, MasteryStatus, Subject } from "@/lib/types";

type QuestionListCardProps = {
  href: string;
  title: string;
  summary?: string | null;
  subject: Subject | string;
  difficulty?: Difficulty | string | null;
  masteryStatus?: MasteryStatus | string | null;
  hasAnswer: boolean;
  createdAt: string;
  imageUrl?: string | null;
  hasImagePath?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

export function QuestionListCard({
  href,
  title,
  summary,
  subject,
  difficulty,
  masteryStatus,
  hasAnswer,
  createdAt,
  imageUrl,
  hasImagePath,
  selected,
  onSelect,
}: QuestionListCardProps) {
  const badges = [
    { label: subject, tone: "blue" as const },
    difficulty ? { label: difficulty, tone: "slate" as const } : null,
    masteryStatus ? { label: masteryStatus, tone: "amber" as const } : null,
    { label: hasAnswer ? "有答案" : "无答案", tone: hasAnswer ? "green" as const : "amber" as const },
  ].filter(Boolean) as Array<{ label: string; tone: "blue" | "green" | "amber" | "red" | "slate" }>;

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex gap-3">
        {onSelect ? (
          <label className="flex shrink-0 items-start pt-1">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={onSelect}
              className="h-5 w-5 rounded border-slate-300"
              aria-label={`选择 ${title}`}
            />
          </label>
        ) : null}

        <Link
          href={href}
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-blue-50 text-center text-xs font-bold leading-5 text-blue-700 ring-1 ring-blue-100"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="原题缩略图"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2">{hasImagePath ? "有图" : "文字卡"}</span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={href} className="block">
            <h2 className="break-words text-sm font-bold leading-5 text-slate-950">
              {title}
            </h2>
            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500">
              {summary?.trim() || "暂无题目摘要，进入详情后补充题干或卡点。"}
            </p>
          </Link>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.slice(0, 4).map((badge) => (
              <StatusPill key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{createdAt}</p>
            <Link
              href={href}
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700"
            >
              查看详情
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
