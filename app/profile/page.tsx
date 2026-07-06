"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

type ProfileQuestion = {
  id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  mastery_status: string | null;
  review_priority: string | null;
  needs_manual_check: boolean;
  question_text_status: string | null;
  answer_status: string | null;
  created_at: string | null;
};

type ProfileReview = {
  question_id: string;
  review_result: string | null;
  completed_at: string | null;
};

type ReviewItem = {
  questionId: string;
  title: string;
  meta: string;
  result: string;
  completedAt: string;
};

type WeakChapter = {
  key: string;
  subject: string;
  chapter: string;
  count: number;
};

type ProfileStats = {
  totalQuestions: number;
  totalCompleted: number;
  weakChapters: WeakChapter[];
  recentReviews: ReviewItem[];
  dayReviews: ReviewItem[];
};

const emptyStats: ProfileStats = {
  totalQuestions: 0,
  totalCompleted: 0,
  weakChapters: [],
  recentReviews: [],
  dayReviews: [],
};

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isWeakQuestion(question: ProfileQuestion) {
  const mastery = question.mastery_status?.trim() ?? "";
  return (
    question.review_priority === "high" ||
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    mastery.includes("没思路") ||
    mastery.includes("有一点思路") ||
    mastery.includes("不稳") ||
    mastery.includes("卡住")
  );
}

function titleForQuestion(question: ProfileQuestion | undefined, questionId: string) {
  return question?.knowledge_point?.trim() || question?.chapter?.trim() || `错题 ${questionId.slice(0, 8)}`;
}

function metaForQuestion(question: ProfileQuestion | undefined) {
  if (!question) return "题卡已不在当前错题库";
  return `${question.subject} / ${question.chapter ?? "未分类"} / ${question.knowledge_point ?? "待识别知识点"}`;
}

function resultLabel(value: string | null) {
  if (value === "mastered") return "已掌握";
  if (value === "improved") return "有进步";
  if (value === "wrong_again") return "再次错误";
  if (value === "still_wrong") return "仍然不会";
  return "已完成";
}

function buildWeakChapters(questions: ProfileQuestion[]) {
  const groups = new Map<string, WeakChapter>();

  for (const question of questions.filter(isWeakQuestion)) {
    const subject = question.subject || "未标学科";
    const chapter = question.chapter?.trim() || "待整理 / 未分类";
    const key = `${subject}::${chapter}`;
    const current = groups.get(key) ?? { key, subject, chapter, count: 0 };
    current.count += 1;
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "zh-CN"))
    .slice(0, 6);
}

function buildReviewItems(reviews: ProfileReview[], questions: ProfileQuestion[]) {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return reviews
    .filter((review) => Boolean(review.completed_at))
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .map((review) => {
      const question = questionById.get(review.question_id);

      return {
        questionId: review.question_id,
        title: titleForQuestion(question, review.question_id),
        meta: metaForQuestion(question),
        result: resultLabel(review.review_result),
        completedAt: review.completed_at ?? "",
      };
    });
}

function ProfileCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.055)] ${className}`}>
      {children}
    </section>
  );
}

function ReviewList({ items, emptyLabel }: { items: ReviewItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Link
          key={`${item.questionId}-${item.completedAt}`}
          href={`/questions/${item.questionId}`}
          className="block rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.meta}</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
              {item.result}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">{formatDateTime(item.completedAt)}</p>
        </Link>
      ))}
    </div>
  );
}

function ProfileContent() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<ProfileStats>(emptyStats);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看学习档案。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const selectedDay = dayParam || todayIsoDate();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        setMessage("登录后会显示你的导入、复盘和薄弱章节记录。");
        setIsLoading(false);
        return;
      }

      const reviewStart = `${addDays(todayIsoDate(), -179)}T00:00:00.000Z`;
      const [questionsResult, reviewsResult] = await Promise.all([
        client
          .from("questions")
          .select("id,subject,chapter,knowledge_point,mastery_status,review_priority,needs_manual_check,question_text_status,answer_status,created_at")
          .eq("user_id", user.id)
          .is("deleted_at", null),
        client
          .from("reviews")
          .select("question_id,review_result,completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", reviewStart),
      ]);

      const error = questionsResult.error ?? reviewsResult.error;
      if (error) {
        setMessage(`学习档案读取失败：${error.message}`);
        setIsLoading(false);
        return;
      }

      const questions = (questionsResult.data ?? []) as ProfileQuestion[];
      const reviews = (reviewsResult.data ?? []) as ProfileReview[];
      const reviewItems = buildReviewItems(reviews, questions);

      if (isActive) {
        setStats({
          totalQuestions: questions.length,
          totalCompleted: reviewItems.length,
          weakChapters: buildWeakChapters(questions),
          recentReviews: reviewItems.slice(0, 8),
          dayReviews: reviewItems.filter((item) => item.completedAt.slice(0, 10) === selectedDay),
        });
        setMessage("");
        setIsLoading(false);
      }
    }

    loadProfile().catch((error) => {
      if (isActive) {
        setMessage(error instanceof Error ? error.message : "学习档案读取失败。");
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [selectedDay, supabase]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] px-4 pb-28 pt-4 text-slate-950 md:px-8 md:pb-10">
      <div className="mx-auto grid max-w-[1180px] gap-4">
        <header className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#10b981]">11408 学习记录</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">学习档案</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                汇总当前错题库、复盘完成记录、薄弱章节和最近复盘。数据全部来自本地账号下的真实题卡与复习记录。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/questions" className="inline-flex min-h-10 items-center rounded-lg bg-[#10b981] px-4 text-sm font-black text-white">
                打开错题库
              </Link>
              <Link href="/settings" className="inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-slate-100">
                数据设置
              </Link>
            </div>
          </div>
        </header>

        {message ? (
          <p className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <ProfileCard>
            <p className="text-sm font-black text-slate-500">累计导入</p>
            <p className="mt-2 text-4xl font-black tracking-normal text-slate-950">{stats.totalQuestions}</p>
            <p className="mt-1 text-sm text-slate-500">当前未删除题卡</p>
          </ProfileCard>
          <ProfileCard>
            <p className="text-sm font-black text-slate-500">累计完成</p>
            <p className="mt-2 text-4xl font-black tracking-normal text-slate-950">{stats.totalCompleted}</p>
            <p className="mt-1 text-sm text-slate-500">近 180 天复盘记录</p>
          </ProfileCard>
          <ProfileCard>
            <p className="text-sm font-black text-slate-500">薄弱章节</p>
            <p className="mt-2 text-4xl font-black tracking-normal text-[#10b981]">{stats.weakChapters.length}</p>
            <p className="mt-1 text-sm text-slate-500">按高优先级和待核对题统计</p>
          </ProfileCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ProfileCard>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">薄弱章节</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">点击进入错题库的不熟题本继续处理。</p>
              </div>
              <Link href="/questions?scope=weak" className="text-sm font-black text-[#10b981]">查看全部</Link>
            </div>
            {stats.weakChapters.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                暂无明显薄弱章节。可以先导入题卡或完成一次复盘。
              </div>
            ) : (
              <div className="grid gap-3">
                {stats.weakChapters.map((chapter) => (
                  <Link
                    key={chapter.key}
                    href="/questions?scope=weak"
                    className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{chapter.chapter}</p>
                        <p className="mt-1 text-xs text-slate-500">{chapter.subject}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                        {chapter.count} 题
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ProfileCard>

          <ProfileCard>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{selectedDay} 当天完成</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">从首页贡献日历进入时，会定位到这一天。</p>
              </div>
              <Link href="/review/today" className="text-sm font-black text-[#10b981]">今日复习</Link>
            </div>
            <ReviewList items={stats.dayReviews} emptyLabel={isLoading ? "正在读取学习记录..." : "这一天暂无完成记录。"} />
          </ProfileCard>
        </section>

        <ProfileCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">最近复盘</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">点击任一记录进入题目详情，继续做题或查看解析。</p>
            </div>
            <Link href="/reports" className="text-sm font-black text-[#10b981]">学习报告</Link>
          </div>
          <ReviewList items={stats.recentReviews} emptyLabel={isLoading ? "正在读取学习记录..." : "暂无复盘记录，先从今日复习或专项练习开始。"} />
        </ProfileCard>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f9fb] px-4 pb-28 pt-4 text-slate-950 md:px-8 md:pb-10">
          <div className="mx-auto max-w-[1180px] rounded-[18px] border border-slate-100 bg-white p-5 text-sm font-bold text-slate-500 shadow-[0_12px_35px_rgba(15,23,42,0.055)]">
            正在读取学习档案...
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
