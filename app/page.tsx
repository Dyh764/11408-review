"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobilePageShell, MobileSection, PrimaryActionCard, SectionCard, StatCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

type DashboardStats = {
  dueToday: number;
  addedToday: number;
  weeklyCompletionRate: string;
};

const emptyStats: DashboardStats = {
  dueToday: 0,
  addedToday: 0,
  weeklyCompletionRate: "0%",
};

const primaryActions = [
  {
    href: "/review",
    title: "开始今日复习",
    description: "先清掉今天到期的错题，做完再看答案。",
    tone: "blue" as const,
    kicker: "第一步",
  },
  {
    href: "/upload",
    title: "拍题上传",
    description: "白天先拍题，保留原图和当时卡点。",
    tone: "cyan" as const,
    kicker: "新增错题",
  },
  {
    href: "/import",
    title: "导入 ChatGPT 错题卡",
    description: "晚上粘贴 JSON，把错题整理成可复习卡片。",
    tone: "slate" as const,
    kicker: "整理题卡",
  },
];

const secondaryLinks = [
  { href: "/questions", title: "错题库", description: "浏览、筛选和进入详情" },
  { href: "/reports", title: "学习报告", description: "查看薄弱点和下一步建议" },
  { href: "/sprint", title: "考前冲刺", description: "优先处理高风险错题" },
  { href: "/settings", title: "我的", description: "账号、导出和可选增强" },
];

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfNextDay(dateKey: string) {
  return `${addDays(dateKey, 1)}T00:00:00.000Z`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看真实学习统计。");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadDashboardStats() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        setMessage("登录后会显示你的实时学习统计。");
        return;
      }

      const today = todayIsoDate();
      const weekStart = addDays(today, -6);
      const [dueResult, addedResult, weeklyResult] = await Promise.all([
        client
          .from("reviews")
          .select("id,questions!inner(deleted_at)", { count: "exact", head: true })
          .eq("user_id", user.id)
          .lte("scheduled_date", today)
          .is("completed_at", null)
          .is("questions.deleted_at", null),
        client
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", startOfNextDay(today)),
        client
          .from("reviews")
          .select("completed_at")
          .eq("user_id", user.id)
          .gte("scheduled_date", weekStart)
          .lte("scheduled_date", today),
      ]);

      const error = dueResult.error ?? addedResult.error ?? weeklyResult.error;

      if (error) {
        setMessage(`学习统计更新失败：${error.message}`);
        return;
      }

      const weeklyRows = weeklyResult.data ?? [];
      const completed = weeklyRows.filter((review) => review.completed_at).length;
      const weeklyCompletionRate =
        weeklyRows.length > 0 ? `${Math.round((completed / weeklyRows.length) * 100)}%` : "0%";

      if (isActive) {
        setStats({
          dueToday: dueResult.count ?? 0,
          addedToday: addedResult.count ?? 0,
          weeklyCompletionRate,
        });
        setMessage("");
      }
    }

    loadDashboardStats().catch((error) => {
      if (isActive) {
        setMessage(error instanceof Error ? error.message : "学习统计更新失败。");
      }
    });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  return (
    <MobilePageShell>
      <PageHeader
        title="今日学习驾驶舱"
        subtitle="先复习，再整理新题。这里保留今天最该做的三件事。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="今日待复习" value={stats.dueToday} tone="blue" />
          <StatCard label="今日新增" value={stats.addedToday} />
          <StatCard label="本周完成率" value={stats.weeklyCompletionRate} tone="green" />
        </div>
        {message ? (
          <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-600">
            {message}
          </p>
        ) : null}
      </MobileSection>

      <MobileSection title="现在应该点这里">
        <div className="grid gap-3">
          {primaryActions.map((action) => (
            <PrimaryActionCard key={action.href} {...action} />
          ))}
        </div>
      </MobileSection>

      <MobileSection title="更多入口" subtitle="低频查看放在下面，学习时不用先处理它们。">
        <div className="grid gap-3">
          {secondaryLinks.map((link) => (
            <SectionCard key={link.href}>
              <Link href={link.href} className="flex min-h-11 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{link.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{link.description}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-blue-700">&gt;</span>
              </Link>
            </SectionCard>
          ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
