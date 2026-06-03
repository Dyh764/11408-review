"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        await ensureProfile(supabase, data.user);
        router.replace(nextPath);
      }
    });
  }, [nextPath, router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("请先配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }

    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (result.data.user) {
        await ensureProfile(supabase, result.data.user);
      }

      setMessage(mode === "signup" ? "注册完成，已进入项目。" : "登录成功。");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "认证失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      setMessage("Supabase 尚未配置。");
      return;
    }

    await supabase.auth.signOut();
    setMessage("已退出登录。");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="登录 11408-review"
        subtitle="第二阶段使用 Supabase Auth。没有配置环境变量时，页面会提示配置，不会白屏。"
      />

      <section className="space-y-4 px-5 pt-5">
        {!supabase ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
            请先配置 `.env.local` 中的 Supabase URL 和 anon key，然后重启 dev server。
          </div>
        ) : null}

        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`min-h-11 rounded-md text-sm font-semibold ${
              mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`min-h-11 rounded-md text-sm font-semibold ${
              mode === "signup" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">邮箱</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">密码</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
              placeholder="至少 6 位"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="min-h-14 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:bg-slate-300"
          >
            {isLoading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="min-h-12 w-full rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700"
        >
          退出登录
        </button>

        {message ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
