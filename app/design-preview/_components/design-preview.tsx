import Link from "next/link";

type VariantKey = "a" | "b" | "c";

type Variant = {
  key: VariantKey;
  name: string;
  title: string;
  subtitle: string;
  recommendation: string;
  route: string;
  previewClass: string;
  heroClass: string;
  primaryButtonClass: string;
  ghostButtonClass: string;
  progressClass: string;
  accentTextClass: string;
  tagClass: string;
  cardClass: string;
  reviewMode: string;
  bankMode: string;
  strengths: string[];
  weaknesses: string[];
  tokens: string[];
  landing: string[];
};

const variants: Record<VariantKey, Variant> = {
  a: {
    key: "a",
    name: "方案 A",
    title: "紫色冲刺仪表盘",
    subtitle: "目标感最强，首页像学习驾驶舱，适合考前倒计时和每日任务压强比较明确的状态。",
    recommendation: "优先适合正式首页落地，能把待复习、倒计时、薄弱项和入口放在一个清晰焦点里。",
    route: "/design-preview/a",
    previewClass: "bg-[#f4f0ff] text-[#211536]",
    heroClass: "bg-[#4f23b6] text-white shadow-[0_18px_42px_rgba(79,35,182,0.28)]",
    primaryButtonClass: "bg-[#5b2bd6] text-white shadow-[0_12px_26px_rgba(91,43,214,0.26)]",
    ghostButtonClass: "border-[#d9cffd] bg-white text-[#4f23b6]",
    progressClass: "bg-[#7c3aed]",
    accentTextClass: "text-[#5b2bd6]",
    tagClass: "bg-[#ede7ff] text-[#4f23b6]",
    cardClass: "border-[#e4dcff] bg-white shadow-[0_10px_28px_rgba(62,38,123,0.08)]",
    reviewMode: "优先级队列",
    bankMode: "战情目录",
    strengths: ["目标感最强", "首页信息判断最快", "冲刺状态和倒计时表达清楚"],
    weaknesses: ["视觉压强较高", "长期日常使用需要控制红色和警示信息比例"],
    tokens: [
      "主色 #5B2BD6，深紫 #2B174F，强调紫 #7C3AED",
      "辅助色用青蓝 #0EA5E9 和琥珀 #F59E0B，避免整页单一紫色",
      "背景 #F4F0FF，卡片白底，圆角 8px，阴影轻但方向明确",
      "标题 24/20/16，正文 14，辅助信息 12，数字指标 28",
      "主按钮实心紫，次按钮白底紫边，标签浅紫底深紫字",
      "进度条 8px 高，使用紫色实心条和浅紫轨道",
    ],
    landing: [
      "先重做首页数据编排和快速入口层级",
      "今日复习保留一题一屏，并接入综合优先级说明",
      "错题库从列表改为科目入口，再进入章节和题目",
    ],
  },
  b: {
    key: "b",
    name: "方案 B",
    title: "紫色极简高效",
    subtitle: "更干净、更克制，适合每天高频打开，阅读舒适，降低长期备考时的视觉疲劳。",
    recommendation: "适合正式复习页和错题库列表落地，信息密度适中，不会压迫刷题流程。",
    route: "/design-preview/b",
    previewClass: "bg-[#f8f7fc] text-[#1f2937]",
    heroClass: "border border-[#e8e3f5] bg-white text-[#1f2937] shadow-[0_10px_28px_rgba(31,41,55,0.06)]",
    primaryButtonClass: "bg-[#6d4aff] text-white shadow-[0_10px_22px_rgba(109,74,255,0.18)]",
    ghostButtonClass: "border-[#e5e0f3] bg-[#fbfaff] text-[#5b3ed0]",
    progressClass: "bg-[#6d4aff]",
    accentTextClass: "text-[#5b3ed0]",
    tagClass: "bg-[#f0edff] text-[#5b3ed0]",
    cardClass: "border-[#eeeaf6] bg-white shadow-[0_8px_20px_rgba(31,41,55,0.04)]",
    reviewMode: "安静闪卡",
    bankMode: "清单目录",
    strengths: ["最适合长期使用", "阅读负担最低", "正式业务迁移成本小"],
    weaknesses: ["冲刺氛围较弱", "首页第一眼的战斗感不如 A 和 C"],
    tokens: [
      "主色 #6D4AFF，文本 #1F2937，弱文本 #6B7280",
      "辅助色用绿色 #10B981 表示掌握，橙色 #F97316 表示关注",
      "背景 #F8F7FC，卡片白底，边框 #EEEAF6，圆角 8px",
      "标题 22/18/15，正文 14，辅助信息 12，数字指标 26",
      "主按钮克制实心紫，次按钮浅紫底，标签低饱和",
      "进度条 6px 高，留白更大，减少装饰感",
    ],
    landing: [
      "优先抽出通用移动端卡片、标签和进度组件",
      "复习页先落地一题一屏与答案揭示状态",
      "错题库用可折叠目录承接真实数据",
    ],
  },
  c: {
    key: "c",
    name: "方案 C",
    title: "紫色卡片战斗",
    subtitle: "卡片感最强，复习页更像闪卡 App，错题库更像手机学习工具，有明显冲刺氛围。",
    recommendation: "适合冲刺模式和今日复习落地，能强化做题节奏和每题完成反馈。",
    route: "/design-preview/c",
    previewClass: "bg-[#160f28] text-white",
    heroClass: "bg-[#261348] text-white shadow-[0_18px_42px_rgba(0,0,0,0.26)] ring-1 ring-white/10",
    primaryButtonClass: "bg-[#a78bfa] text-[#160f28] shadow-[0_12px_26px_rgba(167,139,250,0.26)]",
    ghostButtonClass: "border-white/15 bg-white/8 text-white",
    progressClass: "bg-[#a78bfa]",
    accentTextClass: "text-[#c4b5fd]",
    tagClass: "bg-white/10 text-[#ddd6fe]",
    cardClass: "border-white/10 bg-white/8 shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
    reviewMode: "战斗闪卡",
    bankMode: "科目阵地",
    strengths: ["复习节奏最强", "视觉记忆点明显", "冲刺模式延展性好"],
    weaknesses: ["深色方案需要严格控制可读性", "正式落地时需提供浅色备选或限制使用场景"],
    tokens: [
      "主色 #A78BFA，深底 #160F28，卡片 #261348",
      "辅助色用青色 #22D3EE、粉色 #F472B6 和绿色 #34D399 做少量状态点",
      "背景深紫，卡片半透明但保留 8px 圆角和清晰边框",
      "标题 24/19/15，正文 14，辅助信息 12，数字指标 30",
      "主按钮浅紫反差，次按钮透明白边，标签用白色透明底",
      "进度条 8px 高，强调当前回合推进感",
    ],
    landing: [
      "先用于今日复习和冲刺模式，不建议直接全站深色化",
      "闪卡状态要完整覆盖查看答案、记录结果、下一题和跳过",
      "错题库保留深色科目首页，题目列表可切回浅底提高阅读效率",
    ],
  },
};

const subjects = [
  { name: "高等数学", total: 46, due: 8, weak: "极限、级数", progress: 58 },
  { name: "线性代数", total: 27, due: 5, weak: "线性方程组", progress: 66 },
  { name: "概率论与数理统计", total: 22, due: 3, weak: "随机变量", progress: 52 },
  { name: "数据结构", total: 31, due: 6, weak: "树与图", progress: 61 },
  { name: "计算机组成原理", total: 19, due: 4, weak: "流水线", progress: 49 },
  { name: "操作系统", total: 24, due: 2, weak: "进程同步", progress: 72 },
  { name: "计算机网络", total: 18, due: 1, weak: "TCP 拥塞控制", progress: 77 },
];

const chapters = [
  { name: "函数、极限、连续", count: 14, hard: 6, state: "重点关注" },
  { name: "一元函数微分学", count: 9, hard: 3, state: "有进步" },
  { name: "线性方程组", count: 11, hard: 5, state: "仍不稳定" },
];

const questions = [
  { title: "极限等价无穷小替换的适用条件", diff: "困难", state: "又错了", flag: "needs_fix" },
  { title: "矩阵秩与解空间维数判断", diff: "中等", state: "仍不会", flag: "needs_manual_check" },
  { title: "TCP 慢启动窗口变化", diff: "中等", state: "有进步", flag: "已核对" },
];

const variantsList = Object.values(variants);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ value, variant }: { value: number; variant: Variant }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/10">
      <div className={cx("h-full rounded-full", variant.progressClass)} style={{ width: `${value}%` }} />
    </div>
  );
}

function SectionTitle({ eyebrow, title, variant }: { eyebrow: string; title: string; variant: Variant }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className={cx("text-xs font-bold", variant.accentTextClass)}>{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black tracking-normal">{title}</h2>
      </div>
      <span className={cx("rounded-full px-3 py-1 text-xs font-bold", variant.tagClass)}>{variant.name}</span>
    </div>
  );
}

function BottomMockNav({ variant }: { variant: Variant }) {
  return (
    <div className={cx("grid grid-cols-4 gap-1 rounded-lg border p-1 text-center text-[11px] font-bold", variant.cardClass)}>
      {["首页", "复习", "错题", "我的"].map((item, index) => (
        <div key={item} className={cx("rounded-md px-1 py-2", index === 0 ? variant.tagClass : "opacity-70")}>
          {item}
        </div>
      ))}
    </div>
  );
}

function HomeMock({ variant }: { variant: Variant }) {
  return (
    <section className="space-y-3">
      <SectionTitle eyebrow="首页 mock" title="学习驾驶舱" variant={variant} />
      <div className={cx("rounded-lg p-5", variant.heroClass)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold opacity-80">距离目标节点</p>
            <p className="mt-2 text-3xl font-black tracking-normal">128 天</p>
          </div>
          <div className="rounded-lg bg-white/14 px-3 py-2 text-right">
            <p className="text-xs font-bold opacity-80">今日待复习</p>
            <p className="text-2xl font-black">20</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold opacity-85">
            <span>今日学习进度</span>
            <span>12 / 20</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-full w-[60%] rounded-full bg-white" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 opacity-90">
          慢一点也没关系，今天走过的路，都会在下一次做题时回应你。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["今日复习", "优先清掉到期题"],
          ["拍题上传", "保留原题和卡点"],
          ["JSON 导入", "整理文字题"],
          ["冲刺模式", "处理高风险错题"],
        ].map(([title, desc], index) => (
          <div key={title} className={cx("rounded-lg border p-4", index === 0 ? variant.primaryButtonClass : variant.cardClass)}>
            <p className="text-sm font-black">{title}</p>
            <p className="mt-1 text-xs leading-5 opacity-75">{desc}</p>
          </div>
        ))}
      </div>

      <div className={cx("rounded-lg border p-4", variant.cardClass)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">薄弱提醒</p>
            <p className="mt-1 text-xs leading-5 opacity-70">极限、线性方程组今天优先复盘</p>
          </div>
          <span className={cx("rounded-full px-3 py-1 text-xs font-bold", variant.tagClass)}>智能自检入口</span>
        </div>
      </div>
      <BottomMockNav variant={variant} />
    </section>
  );
}

function ReviewMock({ variant }: { variant: Variant }) {
  return (
    <section className="space-y-3">
      <SectionTitle eyebrow="今日复习 mock" title={variant.reviewMode} variant={variant} />
      <div className={cx("rounded-lg border p-4", variant.cardClass)}>
        <div className="flex items-center justify-between text-xs font-bold opacity-75">
          <span>第 3 / 20 题</span>
          <span>剩余 17 题</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={15} variant={variant} />
        </div>
        <div className="mt-4 rounded-lg border border-current/10 bg-white/40 p-4">
          <div className="flex flex-wrap gap-2">
            <span className={cx("rounded-full px-2 py-1 text-xs font-bold", variant.tagClass)}>系统优先级 92</span>
            <span className={cx("rounded-full px-2 py-1 text-xs font-bold", variant.tagClass)}>困难</span>
            <span className={cx("rounded-full px-2 py-1 text-xs font-bold", variant.tagClass)}>wrong_again</span>
          </div>
          <p className="mt-4 text-base font-black leading-7">
            已知数列极限存在，判断等价无穷小替换在复合函数中的适用条件，并说明不能直接替换的原因。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
            {["A. 可直接替换", "B. 需验证内层趋零", "C. 只看阶数", "D. 与定义域无关"].map((choice, index) => (
              <button
                key={choice}
                className={cx(
                  "min-h-11 rounded-lg border px-3 text-left",
                  index === 1 ? variant.primaryButtonClass : variant.ghostButtonClass,
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["查看答案", "跳过本题", "仍不会", "已掌握"].map((action, index) => (
            <button
              key={action}
              className={cx("min-h-11 rounded-lg border px-3 text-sm font-black", index === 0 ? variant.primaryButtonClass : variant.ghostButtonClass)}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
      <div className={cx("rounded-lg border p-4", variant.cardClass)}>
        <p className="text-sm font-black">本轮结束态预览</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {["完成 12", "又错 3", "掌握 5"].map((item) => (
            <div key={item} className={cx("rounded-lg px-2 py-3 text-xs font-black", variant.tagClass)}>
              {item}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 opacity-70">建议继续关注：极限、线性方程组。</p>
      </div>
    </section>
  );
}

function BankMock({ variant }: { variant: Variant }) {
  return (
    <section className="space-y-3">
      <SectionTitle eyebrow="错题库 mock" title={variant.bankMode} variant={variant} />
      <div className={cx("rounded-lg border p-3", variant.cardClass)}>
        <div className={cx("rounded-lg border px-3 py-3 text-sm font-bold", variant.ghostButtonClass)}>
          搜索科目、章节、知识点
        </div>
      </div>
      <div className="grid gap-3">
        {subjects.slice(0, 4).map((subject) => (
          <div key={subject.name} className={cx("rounded-lg border p-4", variant.cardClass)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black">{subject.name}</p>
                <p className="mt-1 text-xs leading-5 opacity-70">薄弱：{subject.weak}</p>
              </div>
              <div className="text-right text-xs font-bold opacity-75">
                <p>{subject.total} 题</p>
                <p>{subject.due} 待复习</p>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={subject.progress} variant={variant} />
            </div>
          </div>
        ))}
      </div>
      <div className={cx("rounded-lg border p-4", variant.cardClass)}>
        <p className="text-sm font-black">章节列表示例</p>
        <div className="mt-3 space-y-2">
          {chapters.map((chapter) => (
            <div key={chapter.name} className="flex items-center justify-between gap-3 rounded-lg border border-current/10 p-3">
              <div>
                <p className="text-sm font-bold">{chapter.name}</p>
                <p className="mt-1 text-xs opacity-65">{chapter.count} 题 · 困难 {chapter.hard}</p>
              </div>
              <span className={cx("rounded-full px-2 py-1 text-xs font-bold", variant.tagClass)}>{chapter.state}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={cx("rounded-lg border p-4", variant.cardClass)}>
        <p className="text-sm font-black">题目列表示例</p>
        <div className="mt-3 space-y-2">
          {questions.map((question) => (
            <div key={question.title} className="rounded-lg border border-current/10 p-3">
              <p className="text-sm font-bold leading-6">{question.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[question.diff, question.state, question.flag].map((tag) => (
                  <span key={tag} className={cx("rounded-full px-2 py-1 text-[11px] font-bold", variant.tagClass)}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesignNotes({ variant }: { variant: Variant }) {
  return (
    <section className={cx("space-y-4 rounded-lg border p-4", variant.cardClass)}>
      <div>
        <p className="text-sm font-black">方案说明</p>
        <p className="mt-2 text-sm leading-6 opacity-75">{variant.subtitle}</p>
      </div>
      <div>
        <p className="text-sm font-black">优点</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 opacity-75">
          {variant.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-black">缺点</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 opacity-75">
          {variant.weaknesses.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-black">Design token 建议</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 opacity-75">
          {variant.tokens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-black">后续正式落地建议</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 opacity-75">
          {variant.landing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="rounded-lg bg-black/5 p-3 text-xs font-bold leading-5 opacity-75">
        第一阶段只做静态 mock：不改 Supabase schema，不接入真实数据修复，不改题干、图片、标准答案，也不替换正式业务页面逻辑。
      </p>
    </section>
  );
}

export function DesignPreviewIndex() {
  return (
    <div className="min-h-screen space-y-5 bg-[#f6f3ff] px-5 py-6 text-slate-950">
      <div>
        <p className="text-xs font-black text-[#5b2bd6]">第一阶段静态 UI mock</p>
        <h1 className="mt-2 text-2xl font-black tracking-normal">3 套紫色考研冲刺风方案</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          每套都包含首页、今日复习闪卡、错题库目录页。这里是独立预览区，不替换正式页面。
        </p>
      </div>
      <div className="grid gap-3">
        {variantsList.map((variant) => (
          <Link key={variant.key} href={variant.route} className="rounded-lg border border-[#e4dcff] bg-white p-4 shadow-[0_10px_28px_rgba(62,38,123,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#5b2bd6]">{variant.name}</p>
                <p className="mt-1 text-lg font-black">{variant.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{variant.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#ede7ff] px-3 py-1 text-xs font-black text-[#4f23b6]">预览</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DesignPreviewPage({ variantKey }: { variantKey: VariantKey }) {
  const variant = variants[variantKey];

  return (
    <div className={cx("min-h-screen px-4 py-5", variant.previewClass)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/design-preview" className={cx("rounded-lg border px-3 py-2 text-xs font-black", variant.ghostButtonClass)}>
          返回方案列表
        </Link>
        <div className="text-right">
          <p className="text-xs font-bold opacity-70">{variant.name}</p>
          <h1 className="text-xl font-black tracking-normal">{variant.title}</h1>
        </div>
      </div>

      <div className="space-y-5">
        <DesignNotes variant={variant} />
        <HomeMock variant={variant} />
        <ReviewMock variant={variant} />
        <BankMock variant={variant} />
        <section className={cx("rounded-lg border p-4", variant.cardClass)}>
          <p className="text-sm font-black">我的推荐判断</p>
          <p className="mt-2 text-sm leading-6 opacity-75">{variant.recommendation}</p>
        </section>
      </div>
    </div>
  );
}
