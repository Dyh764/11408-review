import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getProductionConfigCheck, type ProductionConfigCheck } from "@/lib/production-config-check";

function toneClass(status: "pass" | "warn" | "fail") {
  if (status === "pass") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "warn") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-red-50 text-red-700 ring-red-100";
}

function StatusBadge({ status }: { status: "pass" | "warn" | "fail" }) {
  const label = status === "pass" ? "通过" : status === "warn" ? "待验证" : "需处理";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClass(status)}`}>
      {label}
    </span>
  );
}

function ConfigRow({ label, value }: { label: string; value: { configured: boolean; value: string } }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{value.configured ? value.value : "未配置"}</p>
      </div>
      <StatusBadge status={value.configured ? "pass" : "fail"} />
    </div>
  );
}

function CheckCard({
  title,
  status,
  message,
}: {
  title: string;
  status: "pass" | "warn" | "fail";
  message: string;
}) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
    </article>
  );
}

function edgeMessage(check: ProductionConfigCheck["edgeFunctions"]) {
  if (check.status === "pass") {
    return "Edge Functions 代码和验收文档均存在；真实调用需等 Supabase production secrets 配置后执行。";
  }

  return [
    check.missingDocs.length ? `缺少文档：${check.missingDocs.join(", ")}` : "",
    check.missingFunctions.length ? `缺少函数：${check.missingFunctions.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

export default async function SystemCheckPage() {
  const check = await getProductionConfigCheck();

  return (
    <div>
      <PageHeader
        title="生产环境检查"
        subtitle="用于 Vercel + Supabase 上线前确认配置状态；本页只显示状态和脱敏值。"
      />

      <section className="space-y-4 px-5 pt-5">
        <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">环境变量</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                当前环境：{check.environment}；生成时间：{check.generatedAt}
              </p>
            </div>
            <Link href="/settings" className="text-xs font-semibold text-blue-600">
              返回设置
            </Link>
          </div>

          <div className="mt-3">
            {Object.entries(check.variables).map(([name, value]) => (
              <ConfigRow key={name} label={name} value={value} />
            ))}
          </div>
        </article>

        <CheckCard
          title="Supabase 连接"
          status={check.supabase.status}
          message={check.supabase.message}
        />

        <CheckCard
          title="当前用户 profile"
          status={check.currentProfile.status}
          message={check.currentProfile.message}
        />

        <CheckCard
          title="Storage bucket"
          status={check.storage.status}
          message={`bucket 名称：${check.storage.bucket || "未配置"}`}
        />

        <CheckCard
          title="Edge Functions 文档"
          status={check.edgeFunctions.status}
          message={edgeMessage(check.edgeFunctions)}
        />

        <p className="text-xs leading-5 text-slate-500">
          安全说明：本页不会显示完整 key，不会读取或暴露 service role key，也不会绕过 RLS。
        </p>
      </section>
    </div>
  );
}
