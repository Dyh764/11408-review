import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div>
      <PageHeader
        title="登录 11408-review"
        subtitle="登录后继续导入 ChatGPT 错题卡、整理错题库、完成今日复习。"
      />
      <Suspense fallback={<p className="px-5 pt-5 text-sm text-slate-500">正在加载登录表单...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
