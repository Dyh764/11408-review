import Link from "next/link";
import { MobilePageShell, MobileSection, SectionCard } from "@/components/mobile/primitives";
import { StudyBadge, StudyCard, StudyPageHeader } from "@/components/study/study-ui";

const subjectMap = [
  {
    subject: "数据结构",
    chapters: ["线性表", "栈和队列", "树与二叉树", "图", "查找", "排序"],
  },
  {
    subject: "计算机组成原理",
    chapters: ["数据表示", "运算器", "存储系统", "指令系统", "CPU", "总线与 IO"],
  },
  {
    subject: "操作系统",
    chapters: ["进程管理", "内存管理", "文件系统", "IO 管理", "死锁", "调度算法"],
  },
  {
    subject: "计算机网络",
    chapters: ["物理层", "数据链路层", "网络层", "传输层", "应用层", "网络安全"],
  },
];

export default function KnowledgeMapPage() {
  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="知识图谱"
        subtitle="按 408 四科搭建复盘入口。已有错题仍在错题库中管理，这里只补齐考试平台的知识导航。"
      />

      <MobileSection>
        <SectionCard title="使用方式" subtitle="选择科目后回到错题库目录，继续按章节、题源和题目筛选。">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/questions"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-black text-white"
            >
              打开错题库
            </Link>
            <Link
              href="/practice"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-100 bg-white px-4 text-sm font-black text-emerald-700"
            >
              进入章节复盘
            </Link>
          </div>
        </SectionCard>
      </MobileSection>

      <MobileSection>
        <div className="grid gap-3">
          {subjectMap.map((item) => (
            <StudyCard key={item.subject}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">{item.subject}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    按考试章节组织，实际错题数量以错题库为准。
                  </p>
                </div>
                <StudyBadge tone="green">{item.chapters.length} 章</StudyBadge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.chapters.map((chapter) => (
                  <span
                    key={chapter}
                    className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                  >
                    {chapter}
                  </span>
                ))}
              </div>
            </StudyCard>
          ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
