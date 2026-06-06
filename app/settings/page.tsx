"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState, MobilePageShell, MobileSection, Notice, SectionCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { defaultTimeZone, normalizeTimeZone } from "@/lib/dates";
import {
  buildCsvExport,
  buildJsonExport,
  buildMarkdownExport,
  exportFileName,
  fetchCurrentUserExportDataset,
  type ExportDataset,
} from "@/lib/export/export-data";
import {
  fetchCurrentProfile,
  updateCurrentProfileTimezone,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type StatusResponse = {
  supabase: { configured: boolean; urlConfigured: boolean; anonKeyConfigured: boolean };
  openai: {
    configured: boolean;
    modelConfigured: boolean;
    optional: boolean;
    label: string;
  };
  ai: {
    provider: "gemini" | "deepseek" | "none";
    configured: boolean;
    label: string;
    model: string;
  };
  gemini: {
    configured: boolean;
    model: string;
    modelConfigured: boolean;
    optional: boolean;
    label: string;
  };
  deepseek: {
    configured: boolean;
    model: string;
    modelConfigured: boolean;
    optional: boolean;
    label: string;
  };
  storage: { bucket: string; configured: boolean };
};

type ExportFormat = "json" | "markdown" | "csv";

const timezoneOptions = ["Asia/Shanghai", "UTC", "Asia/Tokyo", "America/Los_Angeles", "Europe/London"];

function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportContent(format: ExportFormat, dataset: ExportDataset) {
  if (format === "json") {
    return {
      fileName: exportFileName("json"),
      mimeType: "application/json;charset=utf-8",
      content: buildJsonExport(dataset),
    };
  }

  if (format === "markdown") {
    return {
      fileName: exportFileName("markdown"),
      mimeType: "text/markdown;charset=utf-8",
      content: buildMarkdownExport(dataset),
    };
  }

  return {
    fileName: exportFileName("csv"),
    mimeType: "text/csv;charset=utf-8",
    content: buildCsvExport(dataset),
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState(defaultTimeZone);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看设置和导出数据。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | "">("");

  useEffect(() => {
    fetch("/api/settings/status")
      .then((response) => response.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() => {
        setStatus(null);
      });
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadSettings() {
      try {
        const {
          data: { user },
          error,
        } = await client.auth.getUser();

        if (error || !user) {
          setMessage("请先登录，再查看设置。");
          return;
        }

        const currentProfile = await fetchCurrentProfile(client, user);

        if (isActive) {
          setEmail(user.email ?? "");
          setTimezone(normalizeTimeZone(currentProfile.timezone));
          setMessage("");
        }
      } catch (error) {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取设置失败。");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  async function handleSaveTimezone() {
    if (!supabase) {
      setMessage("Supabase 尚未配置。");
      return;
    }

    setIsSavingTimezone(true);
    setMessage("");

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage("请先登录，再保存复习日期时区。");
        return;
      }

      const normalized = await updateCurrentProfileTimezone(supabase, user, timezone);
      setTimezone(normalized);
      setMessage(`复习日期时区已保存为 ${normalized}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存复习日期时区失败。");
    } finally {
      setIsSavingTimezone(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (!supabase) {
      setMessage("Supabase 尚未配置，无法导出。");
      return;
    }

    setExportingFormat(format);
    setMessage("");

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage("请先登录，再导出数据。");
        return;
      }

      const dataset = await fetchCurrentUserExportDataset(supabase, user.id);
      const exportContent = buildExportContent(format, dataset);
      downloadTextFile(exportContent.fileName, exportContent.mimeType, exportContent.content);
      setMessage(`已生成 ${exportContent.fileName}。图片文件不会打包进导出文件。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败。");
    } finally {
      setExportingFormat("");
    }
  }

  async function handleLogout() {
    if (!supabase) {
      setMessage("Supabase 尚未配置。");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="我的"
        subtitle="管理账号和自己的学习数据。主流程不依赖可选 AI 服务。"
      />

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取我的页面..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </MobileSection>
      ) : null}

      <MobileSection title="账号与数据">
        <div className="space-y-3">
          <SectionCard>
            <p className="text-sm font-semibold text-slate-900">当前账号</p>
            <p className="mt-2 break-words text-sm text-slate-600">
              {email || "未登录"}
            </p>
          </SectionCard>

          <SectionCard title="导出数据" subtitle="导出当前账号的错题、复习和报告。图片文件不会打包进导出文件。">
            <div className="grid gap-2">
              {(["json", "markdown", "csv"] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(format)}
                  disabled={Boolean(exportingFormat)}
                  className="min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                >
                  {exportingFormat === format ? "导出中..." : `导出 ${format.toUpperCase()}`}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="复习日期时区" subtitle="用于安排复习日期和生成导出文件名，默认使用 Asia/Shanghai。">
            <div className="grid gap-3">
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
              >
                {timezoneOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveTimezone}
                disabled={isSavingTimezone}
                className="min-h-12 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {isSavingTimezone ? "保存中..." : "保存复习日期时区"}
              </button>
            </div>
          </SectionCard>

          <button
            type="button"
            onClick={handleLogout}
            className="min-h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            退出登录
          </button>
        </div>
      </MobileSection>

      <MobileSection title="主要功能状态">
        <SectionCard>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={status?.supabase.configured ? "Supabase 已配置" : "Supabase 未配置"}
              tone={status?.supabase.configured ? "blue" : "red"}
            />
            <StatusPill
              label={status?.storage.configured ? "图片存储已配置" : "图片存储未配置"}
              tone={status?.storage.configured ? "blue" : "red"}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            当前主流程不依赖 OpenAI、Gemini 或 DeepSeek。你可以正常上传、导入、复习和查看答案。
          </p>
        </SectionCard>
      </MobileSection>

      <MobileSection title="可选增强">
        <SectionCard>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={`AI 学习分析：${status?.ai.label ?? "未启用（可选）"}`}
              tone={status?.ai.configured ? "blue" : "amber"}
            />
            <StatusPill
              label={status?.gemini.label ?? "Gemini 未启用（可选）"}
              tone={status?.gemini.configured ? "blue" : "amber"}
            />
            <StatusPill
              label={status?.deepseek.label ?? "DeepSeek 学习分析：未启用（可选）"}
              tone={status?.deepseek.configured ? "blue" : "amber"}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            这些能力只用来辅助整理错因、思路和提醒，不影响日常复习。
          </p>
        </SectionCard>
      </MobileSection>

      <MobileSection title="低频入口">
        <div className="space-y-3">
          <SectionCard>
            <div className="grid gap-2">
              <Link
                href="/settings/system-check"
                className="flex min-h-12 items-center justify-between rounded-lg bg-slate-50 px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100"
              >
                <span>系统检查</span>
                <span aria-hidden="true">&gt;</span>
              </Link>
              <Link
                href="/reports"
                className="flex min-h-12 items-center justify-between rounded-lg bg-slate-50 px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100"
              >
                <span>学习报告</span>
                <span aria-hidden="true">&gt;</span>
              </Link>
            </div>
          </SectionCard>

          <Notice>
            <h2 className="text-sm font-bold text-slate-800">安装到手机桌面</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              手机浏览器打开部署地址后，可以通过浏览器菜单添加到主屏幕。
            </p>
          </Notice>
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
