import Link from "next/link";
import { MathText } from "@/components/mobile/MathText";
import { StatusPill } from "@/components/status-pill";
import type { Difficulty } from "@/lib/types";

type QuestionListCardProps = {
  href: string;
  title: string;
  summary?: string | null;
  chapter?: string | null;
  difficulty?: Difficulty | string | null;
  questionKind: string;
  createdAt: string;
  selected?: boolean;
  onSelect?: () => void;
};

export function QuestionListCard({
  href,
  title,
  summary,
  chapter,
  difficulty,
  questionKind,
  createdAt,
  selected,
  onSelect,
}: QuestionListCardProps) {
  const badges = [
    { label: chapter?.trim() || "未标章节", tone: "slate" as const },
    { label: difficulty?.trim() || "未标记", tone: "slate" as const },
    { label: questionKind, tone: "blue" as const },
  ];

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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

        <div className="min-w-0 flex-1">
          <Link href={href} className="block">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-words text-base font-bold leading-6 text-slate-950">
                {title}
              </h2>
              <span className="shrink-0 pt-0.5 text-xs text-slate-500">{createdAt}</span>
            </div>
            <MathText
              text={summary}
              fallback="暂无题目摘要，进入详情后补充题干或卡点。"
              compact
              className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600"
            />
          </Link>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <StatusPill key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
          </div>

          <div className="mt-3 flex justify-end">
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
