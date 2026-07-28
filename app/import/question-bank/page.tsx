"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MobilePageShell,
  MobileSection,
  SectionCard,
  StatCard,
} from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { supabaseBucket } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type ManifestAsset = {
  file: string;
  kind?: string;
  subject?: string;
};

type ManifestCard = {
  subject?: string;
  source?: {
    asset_file?: string;
    import_key?: string;
    image_required?: boolean;
  };
  image_path?: string;
  standard_answer?: string;
  answer_explanation?: string;
};

type QuestionBankManifest = {
  schema_version?: string;
  cards: ManifestCard[];
  assets: ManifestAsset[];
  qa?: {
    total_questions?: number;
    total_assets?: number;
    parse_failures?: unknown[];
    duplicate_import_keys?: string[];
    official_answers_matched?: number;
    official_answers_missing?: unknown[];
  };
};

type ImportFailure = {
  index: number;
  message: string;
};

type ImportResponse = {
  error?: string;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  failureCount?: number;
  failures?: ImportFailure[];
};

type PackageState = {
  manifest: QuestionBankManifest;
  filesByName: Map<string, File>;
  missingAssets: string[];
};

const storageFolder = "question-bank/wangdao-27-v3";
const importChunkSize = 60;
const uploadConcurrency = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseManifest(value: unknown): QuestionBankManifest {
  if (!isRecord(value) || !Array.isArray(value.cards) || !Array.isArray(value.assets)) {
    throw new Error("manifest.json 格式不正确：缺少 cards 或 assets。");
  }

  return value as unknown as QuestionBankManifest;
}

function uniqueAssetNames(manifest: QuestionBankManifest) {
  return Array.from(
    new Set(
      manifest.cards
        .map((card) => card.source?.asset_file?.trim() ?? "")
        .filter(Boolean),
    ),
  );
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) {
          return;
        }
        await worker(items[index], index);
      }
    },
  );
  await Promise.all(runners);
}

export default function QuestionBankImportPage() {
  const supabase = useMemo(() => createClient(), []);
  const [packageState, setPackageState] = useState<PackageState | null>(null);
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [failures, setFailures] = useState<ImportFailure[]>([]);

  const manifest = packageState?.manifest;
  const cards = manifest?.cards ?? [];
  const assets = manifest ? uniqueAssetNames(manifest) : [];
  const canImport =
    Boolean(supabase) &&
    Boolean(packageState) &&
    packageState?.missingAssets.length === 0 &&
    cards.length > 0 &&
    !isImporting;

  async function handlePackage(files: FileList | null) {
    setPackageState(null);
    setMessage("");
    setFailures([]);
    setUploadedCount(0);
    setProcessedCount(0);
    setImportedCount(0);
    setUpdatedCount(0);
    setSkippedCount(0);

    if (!files?.length) {
      return;
    }

    try {
      const selected = Array.from(files);
      const filesByName = new Map(selected.map((file) => [file.name, file]));
      const manifestFile = filesByName.get("manifest.json");

      if (!manifestFile) {
        throw new Error("没有找到 manifest.json，请选择完整题库包文件夹。");
      }

      const parsed = parseManifest(JSON.parse(await manifestFile.text()));
      const expectedAssets = uniqueAssetNames(parsed);
      const missingAssets = expectedAssets.filter((name) => !filesByName.has(name));
      const answerCount = parsed.cards.filter(
        (card) => card.standard_answer?.trim() && card.answer_explanation?.trim(),
      ).length;

      setPackageState({ manifest: parsed, filesByName, missingAssets });
      setMessage(
        missingAssets.length > 0
          ? `题库包不完整：缺少 ${missingAssets.length} 张原题图片。`
          : `题库包检查通过：${parsed.cards.length} 题、${expectedAssets.length} 张去重原图、${answerCount} 题含原书答案解析。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取题库包失败。");
    }
  }

  async function handleImport() {
    if (!supabase || !packageState || !canImport) {
      return;
    }

    setIsImporting(true);
    setFailures([]);
    setUploadedCount(0);
    setProcessedCount(0);
    setImportedCount(0);
    setUpdatedCount(0);
    setSkippedCount(0);
    setMessage("正在确认登录状态...");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("请先登录，再导入题库。");
      }

      const assetNames = uniqueAssetNames(packageState.manifest);
      const storageByAsset = new Map(
        assetNames.map((name) => [
          name,
          `users/${user.id}/questions/${storageFolder}/${name}`,
        ]),
      );

      setMessage(`正在上传原题图片：0 / ${assetNames.length}`);
      await runPool(assetNames, uploadConcurrency, async (name) => {
        const file = packageState.filesByName.get(name);
        const storagePath = storageByAsset.get(name);

        if (!file || !storagePath) {
          throw new Error(`题库包缺少原图：${name}`);
        }

        const { error } = await supabase.storage
          .from(supabaseBucket)
          .upload(storagePath, file, {
            upsert: true,
            cacheControl: "31536000",
            contentType: file.type || "image/webp",
          });

        if (error) {
          throw new Error(`上传 ${name} 失败：${error.message}`);
        }

        setUploadedCount((current) => {
          const next = current + 1;
          setMessage(`正在上传原题图片：${next} / ${assetNames.length}`);
          return next;
        });
      });

      const enrichedCards = packageState.manifest.cards.map((card) => {
        const assetFile = card.source?.asset_file?.trim() ?? "";
        if (!assetFile) {
          return {
            ...card,
            image_path: null,
          };
        }
        const imagePath = storageByAsset.get(assetFile);

        if (!imagePath) {
          throw new Error(`配图题缺少图片映射：${assetFile}`);
        }

        return {
          ...card,
          image_path: imagePath,
        };
      });

      const allFailures: ImportFailure[] = [];
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (let offset = 0; offset < enrichedCards.length; offset += importChunkSize) {
        const chunk = enrichedCards.slice(offset, offset + importChunkSize);
        setMessage(
          `正在写入题目：${offset} / ${enrichedCards.length}（可安全重试，重复题会自动跳过）`,
        );
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonText: JSON.stringify(chunk),
            importMode: "direct",
            replaceExisting: true,
          }),
        });
        const result = (await response.json().catch(() => ({}))) as ImportResponse;

        if (!response.ok || result.error) {
          throw new Error(result.error ?? `第 ${offset + 1} 批导入失败。`);
        }

        imported += result.importedCount ?? 0;
        updated += result.updatedCount ?? 0;
        skipped += result.skippedCount ?? 0;
        for (const failure of result.failures ?? []) {
          allFailures.push({
            index: offset + failure.index,
            message: failure.message,
          });
        }
        setImportedCount(imported);
        setUpdatedCount(updated);
        setSkippedCount(skipped);
        setProcessedCount(Math.min(offset + chunk.length, enrichedCards.length));
        setFailures([...allFailures]);
      }

      setMessage(
        allFailures.length > 0
          ? `导入完成：新增 ${imported} 题，跳过重复 ${skipped} 题，失败 ${allFailures.length} 题。`
          : `导入完成：新增 ${imported} 题，更新 ${updated} 题，跳过重复 ${skipped} 题；普通题已清除误绑图片，配图题只保留本题图形。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "题库导入失败。");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="王道 408 题库批量导入"
        subtitle="一次选择完整题库包，只上传真正配图题的图形并分批更新全部题目。"
      />

      <MobileSection>
        <SectionCard subtitle="题库原 PDF 不进入公开仓库；普通题不上传图片，配图题只上传本题图形到你的私有存储。">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="支持断点重试" tone="blue" />
            <StatusPill label="按原书答案" tone="blue" />
            <StatusPill label="重复题自动跳过" tone="slate" />
          </div>
          <label className="mt-4 block rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4">
            <span className="text-sm font-black text-blue-800">选择题库包文件夹</span>
            <input
              type="file"
              multiple
              accept=".json,.webp,image/webp"
              onChange={(event) => void handlePackage(event.target.files)}
              className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-white file:px-3 file:text-xs file:font-black file:text-blue-700"
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            />
            <p className="mt-2 text-xs leading-5 text-blue-900">
              请选择包含 manifest.json 和 assets 文件夹的完整目录。
            </p>
          </label>
          {message ? (
            <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              {message}
            </p>
          ) : null}
          {packageState?.missingAssets.length ? (
            <details className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-100">
              <summary className="cursor-pointer font-black">查看缺少的图片</summary>
              <p className="mt-2 break-all leading-5">
                {packageState.missingAssets.slice(0, 30).join("、")}
                {packageState.missingAssets.length > 30 ? "……" : ""}
              </p>
            </details>
          ) : null}
        </SectionCard>
      </MobileSection>

      {manifest ? (
        <MobileSection title="导入检查">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="题目" value={cards.length} tone="blue" />
            <StatCard label="去重图片" value={assets.length} tone="blue" />
            <StatCard
              label="官方答案"
              value={manifest.qa?.official_answers_matched ?? 0}
              tone="green"
            />
            <StatCard
              label="缺失图片"
              value={packageState?.missingAssets.length ?? 0}
              tone={packageState?.missingAssets.length ? "red" : "slate"}
            />
          </div>
          <SectionCard subtitle="上传和写入均可重复执行；已存在题目会按导入键清除普通题误绑图片、更新真正题图和原书内容，同时保留个人掌握度与复习记录。">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={!canImport}
              className="min-h-14 w-full rounded-xl bg-blue-600 px-4 text-base font-black text-white disabled:bg-slate-300"
            >
              {isImporting ? "正在导入，请保持页面打开" : `导入或更新全部 ${cards.length} 题`}
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-lg bg-slate-50 p-3">
                图片：{uploadedCount} / {assets.length}
              </p>
              <p className="rounded-lg bg-slate-50 p-3">
                题目：{processedCount} / {cards.length}
              </p>
              <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
                新增：{importedCount}
              </p>
              <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
                更新：{updatedCount}
              </p>
              <p className="rounded-lg bg-blue-50 p-3 text-blue-800">
                重复跳过：{skippedCount}
              </p>
            </div>
          </SectionCard>
        </MobileSection>
      ) : null}

      {failures.length > 0 ? (
        <MobileSection title={`失败明细（${failures.length}）`}>
          <div className="max-h-80 space-y-2 overflow-y-auto overscroll-contain">
            {failures.map((failure) => (
              <p
                key={`${failure.index}-${failure.message}`}
                className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800 ring-1 ring-red-100"
              >
                第 {failure.index} 题：{failure.message}
              </p>
            ))}
          </div>
        </MobileSection>
      ) : null}

      <MobileSection>
        <Link
          href="/import"
          className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
        >
          返回普通 JSON 导入
        </Link>
      </MobileSection>
    </MobilePageShell>
  );
}
