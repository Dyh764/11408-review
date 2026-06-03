"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { reportMock } from "@/lib/mock-data";

type ReportTab = "daily" | "weekly" | "monthly";

const tabLabels: Record<ReportTab, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
};

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("weekly");
  const report = reportMock[tab];

  return (
    <div>
      <PageHeader
        title="学习报告"
        subtitle="今晚版本展示 mock 报告结构，核心围绕薄弱点和下一步建议。"
      />

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
          {(Object.keys(tabLabels) as ReportTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-11 rounded-md text-sm font-semibold ${
                tab === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 px-5 pt-5">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">新增错题</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{report.newQuestions}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">复习完成率</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {report.completionRate}
          </p>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">{report.title}</h2>
            <StatusPill label="mock report" tone="blue" />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">薄弱知识点</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.focus.map((item) => (
              <StatusPill key={item} label={item} tone="red" />
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">下一步建议</h3>
          <ul className="mt-3 space-y-3">
            {report.nextActions.map((action) => (
              <li key={action} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {action}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
