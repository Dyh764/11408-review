import Link from "next/link";

type VariantKey = "a" | "b" | "c";

type Variant = {
  key: VariantKey;
  name: string;
  title: string;
  description: string;
  route: string;
  recommendation: string;
  pageClass: string;
  desktopShellClass: string;
  mobileShellClass: string;
  navClass: string;
  panelClass: string;
  subtlePanelClass: string;
  heroClass: string;
  primaryClass: string;
  secondaryClass: string;
  progressClass: string;
  accentClass: string;
  mutedClass: string;
  chipClass: string;
};

const variants: Record<VariantKey, Variant> = {
  a: {
    key: "a",
    name: "方案 A",
    title: "方案 A：接近 408os 的浅色 dashboard",
    description: "浅色、克制、信息密度高，重点模拟 408 真题系统的学习概览与多栏 dashboard。",
    route: "/design-preview/a",
    recommendation: "适合正式功能页落地，尤其适合错题库、章节目录和报告页。",
    pageClass: "bg-[#eef7f3] text-slate-950",
    desktopShellClass: "bg-[#eef7f3]",
    mobileShellClass: "bg-[#f3faf6]",
    navClass: "border-emerald-100 bg-white/90 text-slate-900 shadow-[0_8px_24px_rgba(15,118,110,0.08)]",
    panelClass: "border-emerald-100 bg-white shadow-[0_14px_36px_rgba(15,118,110,0.08)]",
    subtlePanelClass: "border-emerald-100 bg-[#f7fcfa]",
    heroClass: "border-emerald-100 bg-white",
    primaryClass: "bg-[#0f9f7a] text-white shadow-[0_12px_26px_rgba(15,159,122,0.22)]",
    secondaryClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
    progressClass: "bg-[#0f9f7a]",
    accentClass: "text-[#0f8f70]",
    mutedClass: "text-slate-500",
    chipClass: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  },
  b: {
    key: "b",
    name: "方案 B",
    title: "方案 B：首页深色科技风 + 内页浅色 dashboard",
    description: "首屏更像考试训练平台的指挥台，内容区保持浅色，题目阅读压力更低。",
    route: "/design-preview/b",
    recommendation: "推荐采用。它最符合首页可深色、登录后功能页浅色的要求，长期使用也不累。",
    pageClass: "bg-[#071714] text-slate-950",
    desktopShellClass: "bg-[#071714]",
    mobileShellClass: "bg-[#071714]",
    navClass: "border-white/10 bg-[#0d241f]/92 text-white shadow-[0_12px_32px_rgba(0,0,0,0.26)]",
    panelClass: "border-emerald-100 bg-white shadow-[0_14px_36px_rgba(2,44,34,0.16)]",
    subtlePanelClass: "border-emerald-100 bg-[#f4fbf8]",
    heroClass: "border-white/10 bg-[#0d241f] text-white shadow-[0_18px_46px_rgba(0,0,0,0.26)]",
    primaryClass: "bg-[#20c997] text-[#06231c] shadow-[0_12px_26px_rgba(32,201,151,0.26)]",
    secondaryClass: "border-emerald-200 bg-white text-emerald-900",
    progressClass: "bg-[#20c997]",
    accentClass: "text-[#0f8f70]",
    mutedClass: "text-slate-500",
    chipClass: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  },
  c: {
    key: "c",
    name: "方案 C",
    title: "方案 C：全浅色考试平台风",
    description: "整体保持浅色，强化考试平台、题库目录和知识点掌握度，不做深色首页。",
    route: "/design-preview/c",
    recommendation: "适合最稳妥的全站改造，风格统一，视觉风险最低。",
    pageClass: "bg-[#f6faf8] text-slate-950",
    desktopShellClass: "bg-[#f6faf8]",
    mobileShellClass: "bg-[#f6faf8]",
    navClass: "border-slate-200 bg-white/95 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.07)]",
    panelClass: "border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]",
    subtlePanelClass: "border-slate-200 bg-slate-50",
    heroClass: "border-emerald-100 bg-[#e9f8f1]",
    primaryClass: "bg-[#059669] text-white shadow-[0_12px_26px_rgba(5,150,105,0.22)]",
    secondaryClass: "border-slate-200 bg-white text-slate-800",
    progressClass: "bg-[#059669]",
    accentClass: "text-[#047857]",
    mutedClass: "text-slate-500",
    chipClass: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  },
};

const stats = [
  { label: "错题总量", value: "286", helper: "本周新增 18 题" },
  { label: "今日待处理", value: "24", helper: "含 7 道高优先级" },
  { label: "掌握率", value: "68%", helper: "较上周 +6%" },
  { label: "待核对题卡", value: "11", helper: "建议导入后整理" },
];

const subjects = [
  { name: "数据结构", progress: 74, count: 82, weak: "树、图、排序", due: 7 },
  { name: "计算机组成原理", progress: 58, count: 67, weak: "流水线、Cache", due: 6 },
  { name: "操作系统", progress: 63, count: 71, weak: "进程同步、内存", due: 8 },
  { name: "计算机网络", progress: 81, count: 66, weak: "TCP、拥塞控制", due: 3 },
];

const recentQuestions = [
  { title: "二叉排序树删除结点后的中序序列判断", subject: "数据结构", status: "又错一次" },
  { title: "流水线吞吐率与加速比计算边界", subject: "组成原理", status: "需要核对" },
  { title: "PV 操作互斥与同步信号量初值", subject: "操作系统", status: "本周重点" },
];

const weakChapters = [
  { title: "树与二叉树", detail: "错题 18 道，概念混淆 6 次", level: "高风险" },
  { title: "Cache 映射与替换", detail: "错题 12 道，计算步骤不稳", level: "重点复盘" },
  { title: "进程同步", detail: "错题 15 道，PV 顺序错误", level: "本章欠缺" },
];

const featureAreas = [
  "真题刷题",
  "错题本",
  "导入错题",
  "章节分析",
  "题卡核对",
  "专项复盘",
];

const variantsList = Object.values(variants);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ value, variant }: { value: number; variant: Variant }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className={cx("h-full rounded-full", variant.progressClass)} style={{ width: `${value}%` }} />
    </div>
  );
}

function Card({
  children,
  variant,
  className = "",
  subtle = false,
}: {
  children: React.ReactNode;
  variant: Variant;
  className?: string;
  subtle?: boolean;
}) {
  return (
    <div className={cx("rounded-lg border p-4", subtle ? variant.subtlePanelClass : variant.panelClass, className)}>
      {children}
    </div>
  );
}

function StatGrid({ variant }: { variant: Variant }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card key={item.label} variant={variant}>
          <p className={cx("text-xs font-bold", variant.mutedClass)}>{item.label}</p>
          <p className="mt-2 text-3xl font-black tracking-normal">{item.value}</p>
          <p className={cx("mt-2 text-xs leading-5", variant.mutedClass)}>{item.helper}</p>
        </Card>
      ))}
    </div>
  );
}

function SubjectProgress({ variant }: { variant: Variant }) {
  return (
    <Card variant={variant} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-normal">四科进度</h2>
        <span className={cx("rounded-full px-3 py-1 text-xs font-black ring-1", variant.chipClass)}>
          408 四科
        </span>
      </div>
      <div className="grid gap-3">
        {subjects.map((subject) => (
          <div key={subject.name} className="rounded-lg border border-slate-100 bg-white/70 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{subject.name}</p>
                <p className={cx("mt-1 text-xs leading-5", variant.mutedClass)}>薄弱：{subject.weak}</p>
              </div>
              <p className="shrink-0 text-right text-xs font-bold text-slate-500">
                {subject.count} 题<br />
                待复盘 {subject.due}
              </p>
            </div>
            <ProgressBar value={subject.progress} variant={variant} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentQuestions({ variant }: { variant: Variant }) {
  return (
    <Card variant={variant} className="space-y-3">
      <h2 className="text-lg font-black tracking-normal">最近错题</h2>
      {recentQuestions.map((question) => (
        <div key={question.title} className="rounded-lg border border-slate-100 bg-white/70 p-3">
          <p className="text-sm font-black leading-6">{question.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cx("rounded-full px-2.5 py-1 text-xs font-bold ring-1", variant.chipClass)}>
              {question.subject}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-100">
              {question.status}
            </span>
          </div>
        </div>
      ))}
    </Card>
  );
}

function WeakChapters({ variant }: { variant: Variant }) {
  return (
    <Card variant={variant} className="space-y-3">
      <h2 className="text-lg font-black tracking-normal">薄弱章节</h2>
      {weakChapters.map((chapter) => (
        <div key={chapter.title} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white/70 p-3">
          <div>
            <p className="text-sm font-black">{chapter.title}</p>
            <p className={cx("mt-1 text-xs leading-5", variant.mutedClass)}>{chapter.detail}</p>
          </div>
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
            {chapter.level}
          </span>
        </div>
      ))}
    </Card>
  );
}

function ImportEntry({ variant }: { variant: Variant }) {
  return (
    <Card variant={variant} className="space-y-4">
      <div>
        <p className={cx("text-xs font-black", variant.accentClass)}>导入入口</p>
        <h2 className="mt-1 text-lg font-black tracking-normal">GPT 整理后导入错题</h2>
        <p className={cx("mt-2 text-sm leading-6", variant.mutedClass)}>
          粘贴 408 真题 JSON，先看质检结果，再进入错题本整理。
        </p>
      </div>
      <div className="grid gap-2">
        <button className={cx("min-h-11 rounded-lg px-4 text-sm font-black", variant.primaryClass)}>
          导入错题
        </button>
        <button className={cx("min-h-11 rounded-lg border px-4 text-sm font-black", variant.secondaryClass)}>
          查看最近导入
        </button>
      </div>
    </Card>
  );
}

function FeatureGrid({ variant }: { variant: Variant }) {
  return (
    <Card variant={variant}>
      <h2 className="text-lg font-black tracking-normal">功能区</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {featureAreas.map((item) => (
          <div key={item} className={cx("rounded-lg border px-3 py-3 text-sm font-black", variant.secondaryClass)}>
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExamLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-12 shrink-0">
        <span className="absolute left-0 top-2 h-5 w-5 rotate-45 rounded-[3px] bg-[#12c6a3]" />
        <span className="absolute left-4 top-0 h-5 w-5 rotate-45 rounded-[3px] bg-[#22d3a6]" />
        <span className="absolute left-4 top-4 h-5 w-5 rotate-45 rounded-[3px] bg-[#0ea5e9]" />
      </div>
      <div>
        <p className={cx("font-black tracking-normal text-slate-950", compact ? "text-xl" : "text-3xl")}>
          408真题系统
        </p>
        {compact ? null : <p className="mt-0.5 text-xs font-bold text-slate-400">计算机考研智能备考平台</p>}
      </div>
    </div>
  );
}

function ContributionHeatmap({ compact = false }: { compact?: boolean }) {
  const cells = Array.from({ length: compact ? 45 : 90 }, (_, index) => {
    const tone = [0, 0, 1, 0, 2, 0, 3, 1, 0, 4][index % 10];
    return tone;
  });
  const toneClass = ["bg-slate-100", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[repeat(15,0.65rem)] gap-1">
        {cells.map((tone, index) => (
          <span key={index} className={cx("h-2.5 w-2.5 rounded-[2px]", toneClass[tone])} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-400">
        <span>少</span>
        {[1, 2, 3, 4].map((tone) => (
          <span key={tone} className={cx("h-2.5 w-2.5 rounded-[2px]", toneClass[tone])} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}

function SchemeCPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)]", className)}>
      {children}
    </section>
  );
}

function SchemeCSubjectProgress() {
  return (
    <SchemeCPanel className="xl:col-span-3">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-normal text-slate-900">四科掌握进度</h2>
          <p className="mt-1 text-sm font-bold text-slate-400">四科进度按做题进度和掌握率分开展示。</p>
        </div>
        <p className="text-sm font-black text-slate-700">四科平均掌握率 68%</p>
      </div>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        {subjects.map((subject) => (
          <div key={subject.name}>
            <div className="mb-3 flex items-end justify-between gap-4">
              <h3 className="text-base font-black text-slate-900">{subject.name}</h3>
              <span className="text-sm font-bold text-slate-600">{subject.count + 150}题</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-black tracking-normal text-slate-900">{Math.max(0, subject.progress - 12)}%</p>
                <p className="text-xs font-bold text-slate-500">做题进度</p>
              </div>
              <div>
                <p className="text-3xl font-black tracking-normal text-slate-900">{subject.progress}%</p>
                <p className="text-xs font-bold text-slate-500">掌握率</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${subject.progress}%` }} />
            </div>
            <div className="mt-3 flex justify-between gap-2 text-sm font-black">
              <span className="rounded-lg bg-emerald-100 px-3 py-2 text-emerald-700">掌握 {Math.floor(subject.progress / 12)}</span>
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-amber-700">不熟 {subject.due}</span>
              <span className="rounded-lg bg-red-100 px-3 py-2 text-red-600">不会 {Math.max(1, 12 - subject.due)}</span>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-500">未做 {subject.count}</span>
            </div>
          </div>
        ))}
      </div>
    </SchemeCPanel>
  );
}

function SchemeCRightRail() {
  return (
    <aside className="grid gap-4">
      <SchemeCPanel>
        <h2 className="text-lg font-black text-slate-900">功能区</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["导入错题", "错题库", "章节复盘", "学习报告", "真题筛选", "数据统计"].map((item, index) => (
            <div
              key={item}
              className={cx(
                "rounded-lg px-3 py-4 text-center text-sm font-black",
                index < 2 ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-700 ring-1 ring-slate-100",
              )}
            >
              {item}
            </div>
          ))}
        </div>
      </SchemeCPanel>

      <SchemeCPanel>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">我的收藏夹</h2>
          <span className="text-sm font-bold text-slate-500">编辑</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-100 p-4 text-blue-700">
            <p className="text-2xl font-black">0题</p>
            <p className="mt-3 text-base font-black">不熟题本</p>
          </div>
          <div className="rounded-lg bg-emerald-100 p-4 text-emerald-800">
            <p className="text-2xl font-black">0题</p>
            <p className="mt-3 text-base font-black">不会题本</p>
          </div>
        </div>
      </SchemeCPanel>

      <SchemeCPanel>
        <p className="text-lg font-black text-slate-900">本地学习档案</p>
        <p className="mt-1 text-sm font-bold text-slate-500">只展示当前错题资产，不接入外部社区身份。</p>
      </SchemeCPanel>
    </aside>
  );
}

function SchemeCDashboard() {
  return (
    <div data-testid="desktop-preview-c" className="hidden min-h-screen bg-[#f7f9fb] text-slate-950 lg:block">
      <nav aria-label="桌面预览导航" className="border-b border-slate-100 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
          <ExamLogo />
          <div className="flex items-center gap-12 text-base font-bold text-slate-500">
            {["首页面板", "真题总览", "真题分析", "知识图谱", "数据统计"].map((item, index) => (
              <span key={item} className={index === 0 ? "text-slate-900" : ""}>
                {item}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">光</span>
            <span className="text-slate-700">学习档案</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-6 py-4">
        <section className="grid gap-4 lg:grid-cols-4">
            <SchemeCPanel className="flex min-h-36 items-center gap-5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-700">档</div>
              <div>
                <p className="text-sm font-black text-slate-500">当前题库</p>
                <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">408 错题库</p>
              </div>
            </SchemeCPanel>
            <SchemeCPanel className="flex min-h-36 items-center gap-5">
              <div className="text-3xl text-slate-600">□</div>
              <div>
                <p className="text-sm font-black text-slate-600">已做题数</p>
                <p className="mt-2 text-4xl font-black tracking-normal text-slate-900">0</p>
                <p className="mt-1 text-sm text-slate-500">完成度 0%</p>
              </div>
            </SchemeCPanel>
            <SchemeCPanel className="flex min-h-36 items-center justify-between gap-5">
              <div>
                <p className="text-sm font-black text-slate-600">总题目</p>
                <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">846题</p>
                <p className="mt-1 text-sm text-slate-500">47题 x 18年</p>
              </div>
              <button className="text-sm font-black text-[#10b981]">立即刷题 &gt;</button>
            </SchemeCPanel>
            <SchemeCPanel className="flex min-h-36 items-center gap-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-violet-100 text-2xl font-black text-violet-600">中</div>
              <div>
                <p className="text-sm font-black text-slate-700">408通关进度</p>
                <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">0%</p>
              </div>
            </SchemeCPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_386px]">
          <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_0.9fr_0.9fr]">
            <SchemeCPanel>
              <h2 className="text-lg font-black text-slate-900">做题贡献（最近90天）</h2>
              <div className="mt-8 grid place-items-center">
                <ContributionHeatmap />
              </div>
            </SchemeCPanel>
            <SchemeCPanel>
              <h2 className="text-lg font-black text-slate-900">公告栏</h2>
              <div className="mt-5 space-y-5 text-sm text-slate-600">
                <p><span className="rounded bg-blue-50 px-2 py-1 text-blue-600">系统</span> 导入错题后会自动进入待整理题库 <span className="ml-4 rounded bg-red-400 px-2 py-1 text-white">new</span></p>
                <p><span className="rounded bg-blue-50 px-2 py-1 text-blue-600">提示</span> 建议先处理需要核对的题卡 <span className="ml-4 rounded bg-red-400 px-2 py-1 text-white">new</span></p>
              </div>
            </SchemeCPanel>
            <SchemeCPanel>
              <h2 className="text-lg font-black text-slate-900">最近错题</h2>
              <div className="mt-4 rounded-lg bg-cyan-50 p-4">
                <p className="text-xs font-black text-[#10b981]">数据结构</p>
                <p className="mt-4 text-lg font-black">二叉树遍历序列判断</p>
                <p className="mt-1 text-sm text-slate-500">错因：边界条件漏判</p>
              </div>
              <div className="mt-4 rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-black text-[#10b981]">操作系统</p>
                <p className="mt-4 text-lg font-black">页面置换算法手算</p>
                <p className="mt-1 text-sm text-slate-500">错因：过程记录不完整</p>
              </div>
            </SchemeCPanel>
          </div>

          <SchemeCSubjectProgress />
          <SchemeCPanel>
            <h2 className="text-lg font-black text-slate-900">薄弱章节</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {weakChapters.map((chapter) => (
                <div key={chapter.title} className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{chapter.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{chapter.detail}</p>
                  <span className="mt-3 inline-flex rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">
                    {chapter.level}
                  </span>
                </div>
              ))}
            </div>
          </SchemeCPanel>
          </div>

          <SchemeCRightRail />
        </section>
      </main>
    </div>
  );
}

function SchemeCMobile() {
  return (
    <div data-testid="mobile-preview-c" className="min-h-screen bg-[#f7f9fb] px-4 pb-24 pt-4 text-slate-950 lg:hidden">
      <header className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-between gap-3">
          <ExamLogo compact />
          <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">光</span>
        </div>
        <div className="mt-5 rounded-[18px] bg-emerald-50 p-4">
          <p className="text-xs font-black text-[#10b981]">首页面板</p>
          <h1 className="mt-2 text-2xl font-black tracking-normal text-slate-950">408 真题训练</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">移动端保留核心入口，不压缩桌面三栏。</p>
        </div>
      </header>

      <main className="mt-4 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MobileQuickAction title="错题本" description="不熟题本 / 不会题本" variant={variants.c} primary />
          <MobileQuickAction title="导入错题" description="GPT JSON 质检导入" variant={variants.c} />
        </div>

        <SchemeCPanel>
          <h2 className="text-base font-black">408 四科入口</h2>
          <div className="mt-4 grid gap-3">
            {subjects.map((subject) => (
              <div key={subject.name} className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2 flex justify-between gap-3">
                  <p className="text-sm font-black">{subject.name}</p>
                  <p className="text-sm font-black text-slate-500">{subject.progress}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${subject.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SchemeCPanel>

        <SchemeCPanel>
          <h2 className="text-base font-black">做题贡献（最近90天）</h2>
          <div className="mt-4 overflow-hidden">
            <ContributionHeatmap compact />
          </div>
        </SchemeCPanel>

        <RecentQuestions variant={variants.c} />

        <SchemeCPanel>
          <h2 className="text-base font-black">本章欠缺分析</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">薄弱章节：树与二叉树、Cache 映射、进程同步。</p>
        </SchemeCPanel>
      </main>

      <nav
        aria-label="移动预览底部导航"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur"
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-2 text-center text-xs font-black">
          {["首页", "错题", "导入", "我的"].map((item, index) => (
            <div key={item} className={cx("rounded-lg px-2 py-2", index === 0 ? "bg-[#10b981] text-white" : "bg-slate-50 text-slate-500")}>
              {item}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

function DesktopLayout({ variant }: { variant: Variant }) {
  if (variant.key === "c") {
    return <SchemeCDashboard />;
  }

  return (
    <div
      data-testid={`desktop-preview-${variant.key}`}
      className={cx("hidden min-h-screen px-6 py-6 lg:block xl:px-8", variant.desktopShellClass)}
    >
      <nav
        aria-label="桌面预览导航"
        className={cx("mx-auto flex max-w-[1320px] items-center justify-between rounded-lg border px-5 py-3", variant.navClass)}
      >
        <div>
          <p className={cx("text-xs font-black", variant.accentClass)}>408 真题系统</p>
          <p className="text-lg font-black tracking-normal">考试训练平台 Dashboard</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          {["总览", "真题", "错题", "导入", "报告"].map((item, index) => (
            <span key={item} className={cx("rounded-lg px-3 py-2", index === 0 ? variant.primaryClass : "bg-white/10")}>
              {item}
            </span>
          ))}
        </div>
      </nav>

      <main className="mx-auto mt-6 grid max-w-[1320px] gap-5">
        <section className={cx("rounded-lg border p-6", variant.heroClass)}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className={cx("text-xs font-black", variant.accentClass)}>{variant.name}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal">
                408 真题系统 / 考试平台风静态预览
              </h1>
              <p className={cx("mt-3 max-w-2xl text-sm leading-6", variant.key === "b" ? "text-white/72" : variant.mutedClass)}>
                同一套错题资产，桌面端展示多栏 dashboard，手机端切换成独立单列卡片流。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className={cx("min-h-11 rounded-lg px-4 text-sm font-black", variant.primaryClass)}>
                  打开错题本
                </button>
                <button className={cx("min-h-11 rounded-lg border px-4 text-sm font-black", variant.secondaryClass)}>
                  导入错题
                </button>
              </div>
            </div>
            <Card variant={variant} subtle>
              <p className="text-sm font-black">今日训练建议</p>
              <p className={cx("mt-2 text-5xl font-black tracking-normal", variant.accentClass)}>24</p>
              <p className={cx("mt-2 text-sm leading-6", variant.mutedClass)}>
                优先处理数据结构和操作系统高频错题，再进入组成原理专项。
              </p>
            </Card>
          </div>
        </section>

        <StatGrid variant={variant} />

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_0.85fr]">
          <SubjectProgress variant={variant} />
          <div className="grid gap-5">
            <RecentQuestions variant={variant} />
            <ImportEntry variant={variant} />
          </div>
          <div className="grid gap-5">
            <WeakChapters variant={variant} />
            <FeatureGrid variant={variant} />
          </div>
        </section>
      </main>
    </div>
  );
}

function MobileQuickAction({
  title,
  description,
  variant,
  primary = false,
}: {
  title: string;
  description: string;
  variant: Variant;
  primary?: boolean;
}) {
  return (
    <div className={cx("rounded-lg border p-4", primary ? variant.primaryClass : variant.panelClass)}>
      <p className="text-base font-black">{title}</p>
      <p className={cx("mt-1 text-xs leading-5", primary ? "opacity-80" : variant.mutedClass)}>{description}</p>
    </div>
  );
}

function MobileLayout({ variant }: { variant: Variant }) {
  if (variant.key === "c") {
    return <SchemeCMobile />;
  }

  return (
    <div
      data-testid={`mobile-preview-${variant.key}`}
      className={cx("min-h-screen px-4 pb-24 pt-4 lg:hidden", variant.mobileShellClass)}
    >
      <header className={cx("rounded-lg border p-4", variant.heroClass)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cx("text-xs font-black", variant.accentClass)}>408 真题系统</p>
            <h1 className="mt-2 text-2xl font-black tracking-normal">今日错题训练</h1>
            <p className={cx("mt-2 text-sm leading-6", variant.key === "b" ? "text-white/72" : variant.mutedClass)}>
              顶部只保留核心状态，下面按做题顺序展示入口。
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-white/14 px-3 py-2 text-right">
            <p className="text-xs font-bold opacity-70">待处理</p>
            <p className="text-2xl font-black">24</p>
          </div>
        </div>
      </header>

      <main className="mt-4 grid gap-4">
        <MobileQuickAction
          title="错题本"
          description="按科目、章节和知识点进入长期错题资产。"
          variant={variant}
          primary
        />
        <MobileQuickAction
          title="导入错题"
          description="粘贴 408 GPT JSON，先质检，再导入。"
          variant={variant}
        />

        <Card variant={variant}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black">408 四科入口</h2>
            <span className={cx("rounded-full px-2.5 py-1 text-xs font-black ring-1", variant.chipClass)}>
              同一套数据
            </span>
          </div>
          <div className="grid gap-3">
            {subjects.map((subject) => (
              <div key={subject.name} className="rounded-lg border border-slate-100 bg-white/70 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{subject.name}</p>
                    <p className={cx("mt-1 text-xs leading-5", variant.mutedClass)}>{subject.weak}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{subject.due} 待复盘</span>
                </div>
                <ProgressBar value={subject.progress} variant={variant} />
              </div>
            ))}
          </div>
        </Card>

        <RecentQuestions variant={variant} />

        <Card variant={variant}>
          <h2 className="text-base font-black">本章欠缺分析</h2>
          <p className={cx("mt-2 text-sm leading-6", variant.mutedClass)}>
            本章主要欠缺：树结构递归边界、PV 操作先后顺序、Cache 命中率计算。
          </p>
          <div className="mt-3 grid gap-2">
            {weakChapters.map((chapter) => (
              <div key={chapter.title} className="rounded-lg border border-slate-100 bg-white/70 p-3">
                <p className="text-sm font-black">{chapter.title}</p>
                <p className={cx("mt-1 text-xs leading-5", variant.mutedClass)}>{chapter.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <nav
        aria-label="移动预览底部导航"
        className={cx("fixed inset-x-0 bottom-0 z-20 border-t px-4 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur", variant.navClass)}
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-2 text-center text-xs font-black">
          {["首页", "错题", "导入", "我的"].map((item, index) => (
            <div key={item} className={cx("rounded-lg px-2 py-2", index === 0 ? variant.primaryClass : "bg-white/60")}>
              {item}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function DesignPreviewIndex() {
  return (
    <div className="min-h-screen bg-[#eef7f3] px-5 py-6 text-slate-950 md:px-8">
      <main className="mx-auto max-w-5xl">
        <p className="text-xs font-black text-emerald-700">第一阶段静态 UI mock</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">3 套 408 真题系统 / 考试平台风方案</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          每套方案都在同一路由内提供 desktop 预览和 390px mobile 预览，正式业务页不会被替换。
        </p>
        <div className="mt-6 grid gap-4">
          {variantsList.map((variant) => (
            <Link
              key={variant.key}
              href={variant.route}
              className="rounded-lg border border-emerald-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,118,110,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-emerald-700">{variant.name}</p>
                  <h2 className="mt-1 text-xl font-black tracking-normal">{variant.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{variant.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                  预览
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export function DesignPreviewPage({ variantKey }: { variantKey: VariantKey }) {
  const variant = variants[variantKey];
  const previewStyle =
    variant.key === "c"
      ? { fontFamily: '"SimSun", "宋体", "Songti SC", "STSong", serif' }
      : undefined;

  return (
    <div className={cx("min-h-screen overflow-x-hidden", variant.pageClass)} style={previewStyle}>
      <div className="fixed left-6 top-[5.75rem] z-30 hidden lg:block">
        <Link
          href="/design-preview"
          className="rounded-lg border border-white/20 bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          返回方案列表
        </Link>
      </div>
      <DesktopLayout variant={variant} />
      <MobileLayout variant={variant} />
      <section className="sr-only" aria-label="方案说明">
        {variant.recommendation}
      </section>
    </div>
  );
}
