"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState, MobileCard, MobileSection, Notice } from "@/components/mobile/primitives";
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
  type ProfileRecord,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type StatusResponse = {
  supabase: { configured: boolean; urlConfigured: boolean; anonKeyConfigured: boolean };
  openai: { configured: boolean; modelConfigured: boolean };
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
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
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
          setProfile(currentProfile);
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
        setMessage("请先登录，再保存 timezone。");
        return;
      }

      const normalized = await updateCurrentProfileTimezone(supabase, user, timezone);
      setTimezone(normalized);
      setMessage(`timezone 已保存为 ${normalized}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存 timezone 失败。");
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
      setMessage(`已生成 ${exportContent.fileName}。图片未打包，导出中保留 image_path。`);
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
    <div>
      <PageHeader
        title="我的"
        subtitle="账号、导入、报告、导出、系统检查和 PWA 安装入口。"
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

      <MobileSection>
        <div className="space-y-4">
        <MobileCard>
          <h2 className="text-sm font-bold text-slate-800">账号</h2>
          <p className="mt-2 break-words text-sm text-slate-600">
            当前登录邮箱：{email || "未登录"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Profile：{profile ? profile.id : "未读取"}
          </p>
        </MobileCard>

        <MobileCard>
          <h2 className="text-sm font-bold text-slate-800">常用入口</h2>
          <div className="mt-3 grid gap-2">
            <Link
              href="/import"
              className="flex min-h-12 items-center justify-between rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
            >
              <span>导入 ChatGPT 错题卡</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link
              href="/reports"
              className="flex min-h-12 items-center justify-between rounded-lg bg-slate-50 px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100"
            >
              <span>学习报告</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link
              href="/settings/system-check"
              className="flex min-h-12 items-center justify-between rounded-lg bg-slate-50 px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100"
            >
              <span>系统检查</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </MobileCard>

        <MobileCard>
          <h2 className="text-sm font-bold text-slate-800">Timezone</h2>
          <div className="mt-3 grid gap-3">
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
              {isSavingTimezone ? "保存中..." : "保存 timezone"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            缺失或无效 timezone 会默认使用 Asia/Shanghai。复习日期和导出文件名优先使用该设置。
          </p>
        </MobileCard>

        <MobileCard>
          <h2 className="text-sm font-bold text-slate-800">配置状态</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill
              label={status?.supabase.configured ? "Supabase 已配置" : "Supabase 未配置"}
              tone={status?.supabase.configured ? "blue" : "red"}
            />
            <StatusPill
              label={status?.openai.configured ? "OpenAI 已配置" : "OpenAI 未配置"}
              tone={status?.openai.configured ? "blue" : "amber"}
            />
            <StatusPill
              label={status?.storage.configured ? `Bucket: ${status.storage.bucket}` : "Bucket 未配置"}
              tone={status?.storage.configured ? "slate" : "red"}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            设置页只显示是否配置，不显示 API Key、service role key 或 token。
          </p>
        </MobileCard>

        <MobileCard>
          <h2 className="text-sm font-bold text-slate-800">数据导出</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            JSON 用于完整备份；Markdown 便于阅读；CSV 便于 Excel 查看。图片不会打包进文件，但会保留 image_path。
          </p>
          <div className="mt-3 grid gap-2">
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
        </MobileCard>

        <Notice>
          <h2 className="text-sm font-bold text-slate-800">PWA 安装</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            手机浏览器打开部署地址后，iPhone Safari 使用分享菜单“添加到主屏幕”，Android Chrome 使用“安装应用”或“添加到主屏幕”。
          </p>
        </Notice>

        <button
          type="button"
          onClick={handleLogout}
          className="min-h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          退出登录
        </button>
        </div>
      </MobileSection>
    </div>
  );
}
