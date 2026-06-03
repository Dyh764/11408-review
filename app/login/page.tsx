import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div>
      <PageHeader
        title="登录 11408-review"
        subtitle="第二阶段使用 Supabase Auth。没有配置环境变量时，页面会提示配置，不会白屏。"
      />
      <Suspense fallback={<p className="px-5 pt-5 text-sm text-slate-500">正在加载登录表单...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
