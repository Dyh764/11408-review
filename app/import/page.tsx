"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileCard, MobilePageShell, MobileSection, Notice, SectionCard, StatCard } from "@/components/mobile/primitives";
import { ChoiceList } from "@/components/mobile/ChoiceList";
import { MathText } from "@/components/mobile/MathText";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import {
  getImportQualityReport,
  type ImportQualityRow,
} from "@/lib/import/import-quality";
import { getAnswerStatusLabel } from "@/lib/questions/answer-labels";
import {
  chatGptImportPrompt,
  exam408ImportPrompt,
  importExampleJson,
  parseImportJsonText,
  parseImportWithDiagnostics,
  type ImportDiagnostic,
  type ImportParsedCard,
  type ImportRowError,
} from "@/lib/import/import-schema";

type ImportApiResult = {
  error?: string;
  successCount?: number;
  failureCount?: number;
  successes?: ImportSuccess[];
  failures?: ImportRowError[];
  diagnostics?: ImportDiagnostic[];
};

type ImportSuccess = {
  index: number;
  questionId: string;
  reviewCount: number;
  warning?: string;
  inbox?: boolean;
};

function ImportDiagnosticCard({ diagnostic }: { diagnostic: ImportDiagnostic }) {
  return (
    <MobileCard tone="red">
      <div className="flex flex-wrap gap-2">
        <StatusPill label={diagnostic.type} tone="red" />
        <StatusPill label={`第 ${diagnostic.line} 行 / 第 ${diagnostic.character} 个字符`} tone="amber" />
        {diagnostic.field ? <StatusPill label={`字段：${diagnostic.field}`} tone="slate" /> : null}
      </div>
      <div className="mt-3 rounded-lg bg-white/80 p-3">
        <p className="text-xs font-black text-red-700">错误片段</p>
        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-800">
          {diagnostic.snippet}
        </pre>
      </div>
      <div className="mt-3 rounded-lg bg-white/80 p-3">
        <p className="text-xs font-black text-red-700">修复建议</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">{diagnostic.suggestion}</p>
      </div>
      <details className="mt-3 rounded-lg bg-white/80 p-3">
        <summary className="cursor-pointer list-none text-xs font-black text-[#4f23b6]">
          查看修复后的 JSON 示例
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-800">
          {diagnostic.fixedExample}
        </pre>
      </details>
    </MobileCard>
  );
}

function ImportPreviewCard({ item, quality }: { item: ImportParsedCard; quality?: ImportQualityRow }) {
  const { card } = item;
  const hasAnswer = Boolean(card.standard_answer?.trim());
  const hasChoices = card.choices.length > 0;
  const hasWarnings = Boolean(quality?.recommendedInbox);

  return (
    <MobileCard>
      <div className="flex flex-wrap gap-2">
        <StatusPill label={`第 ${item.index} 条`} tone="slate" />
        <StatusPill label={card.subject} tone="blue" />
        <StatusPill label={card.source_info.name} tone="blue" />
        {card.image_path ? (
          <StatusPill label="已绑定原图路径" tone="blue" />
        ) : (
          <StatusPill label="无原图" tone="amber" />
        )}
        <StatusPill label={card.difficulty ? `难度：${card.difficulty}` : "难度待补充"} tone="slate" />
        {hasChoices ? (
          <StatusPill label={`选择题 / ${card.choices.length} 个选项`} tone="blue" />
        ) : null}
        <StatusPill label={hasAnswer ? "包含答案" : "未包含答案，可后续补充"} tone={hasAnswer ? "blue" : "amber"} />
        <StatusPill label={getAnswerStatusLabel(card.answer_status)} tone="amber" />
        {hasWarnings ? <StatusPill label="建议进入待整理" tone="amber" /> : null}
      </div>
      {quality?.issues.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quality.issues.map((issue) => (
            <span
              key={`${issue.severity}-${issue.label}`}
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                issue.severity === "error"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                  : issue.severity === "warning"
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              }`}
              title={issue.detail}
            >
              {issue.label}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 break-words text-xs font-semibold leading-5 text-slate-500">
        {card.knowledge_point ?? "待补充知识点"}
      </p>
      {!card.image_path ? (
        <div className="mt-3">
          <TextQuestionPreview
            subject={card.subject}
            chapter={card.chapter}
            knowledge_point={card.knowledge_point}
            question_text={card.question_text ?? card.user_note}
            mastery_status={card.mastery_status}
            question_text_status={card.question_text_status}
            source="chatgpt_import"
            compact
          />
        </div>
      ) : (
        <MathText
          text={`${card.chapter ? `${card.chapter} / ` : ""}${card.question_text ?? card.user_note ?? ""}`}
          className="mt-1 text-slate-600"
        />
      )}
      {hasChoices ? (
        <div className="mt-3">
          <ChoiceList choices={card.choices} compact />
        </div>
      ) : null}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="rounded-lg bg-[#f8f5ff] p-3 ring-1 ring-[#e4dcff]">
          <dt className="font-semibold text-slate-800">题源信息</dt>
          <dd className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
            <span>题源类型：{card.source_info.type || "未标来源"}</span>
            <span>题源名称：{card.source_info.name || "未标来源"}</span>
            <span>模块：{card.source_info.section || "无"}</span>
            <span>卷/套：{card.source_info.paper || card.source_info.volume || "无"}</span>
            <span>页码：{card.source_info.page || "无"}</span>
            <span>题号：{card.source_info.problem_number || "无"}</span>
            <span>原始来源：{card.source_info.raw || "未标来源"}</span>
          </dd>
        </div>
        {hasAnswer ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="font-semibold text-slate-800">标准答案预览</dt>
            <dd className="mt-1 text-slate-600">
              <MathText text={card.standard_answer} />
            </dd>
            <dd className="mt-2 text-xs text-slate-500">
              关键步骤 {card.key_steps.length} 步
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold text-slate-800">错因</dt>
          <dd className="mt-1 text-slate-600">
            {card.mistake_types.length ? card.mistake_types.join("、") : "待补充"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">一句话提醒</dt>
          <dd className="mt-1 text-slate-600">
            <MathText text={card.one_sentence_tip} fallback="待补充" />
          </dd>
        </div>
      </dl>
    </MobileCard>
  );
}

function ImportActionPanel({
  previewCount,
  directCount,
  inboxCount,
  seriousCount,
  repairNotices,
  canImport,
  isImporting,
  onImport,
  onInboxImport,
}: {
  previewCount: number;
  directCount: number;
  inboxCount: number;
  seriousCount: number;
  repairNotices: string[];
  canImport: boolean;
  isImporting: boolean;
  onImport: () => void;
  onInboxImport: () => void;
}) {
  return (
    <MobileSection title="顶部确认">
      <SectionCard subtitle="解析后可直接在这里确认导入，不用翻到预览列表底部。">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="共解析" value={previewCount} tone="blue" />
          <StatCard label="严重错误" value={seriousCount} tone={seriousCount > 0 ? "red" : "slate"} />
          <StatCard label="可直接导入" value={directCount} tone="green" />
          <StatCard label="建议待整理" value={inboxCount} tone="amber" />
        </div>
        {repairNotices.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repairNotices.map((notice) => (
              <span
                key={notice}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100"
              >
                {notice}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onImport}
            disabled={!canImport}
            className="min-h-14 rounded-lg bg-slate-950 px-4 text-base font-semibold text-white disabled:bg-slate-300"
          >
            {isImporting ? "导入中..." : "确认导入"}
          </button>
          <button
            type="button"
            onClick={onInboxImport}
            disabled={!canImport}
            className="min-h-14 rounded-lg bg-[#5b2bd6] px-4 text-base font-semibold text-white disabled:bg-slate-300"
          >
            导入到待整理
          </button>
        </div>
      </SectionCard>
    </MobileSection>
  );
}

export default function ImportPage() {
  const [jsonText, setJsonText] = useState("");
  const [parseErrors, setParseErrors] = useState<ImportRowError[]>([]);
  const [importDiagnostics, setImportDiagnostics] = useState<ImportDiagnostic[]>([]);
  const [parseNotice, setParseNotice] = useState("");
  const [parseRepairNotices, setParseRepairNotices] = useState<string[]>([]);
  const [apiResult, setApiResult] = useState<ImportApiResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastImportSuccesses, setLastImportSuccesses] = useState<ImportSuccess[]>([]);
  const [undoStatus, setUndoStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const parsed = useMemo(() => parseImportJsonText(jsonText), [jsonText]);
  const previewCards = parsed.cards;
  const qualityReport = useMemo(() => getImportQualityReport(parsed), [parsed]);
  const qualityByIndex = useMemo(
    () => new Map(qualityReport.rows.map((row) => [row.index, row])),
    [qualityReport],
  );
  const previewStats = useMemo(() => {
    const withAnswer = previewCards.filter((item) => item.card.standard_answer?.trim()).length;
    const withoutImage = previewCards.filter((item) => !item.card.image_path).length;
    const needsCheck = previewCards.filter(
      (item) => item.card.needs_manual_check || item.card.question_text_status !== "verified",
    ).length;

    return { withAnswer, withoutImage, needsCheck };
  }, [previewCards]);
  const canImport = previewCards.length > 0 && qualityReport.seriousCount === 0 && !isImporting;
  const visibleRepairNotices =
    parseRepairNotices.length > 0 ? parseRepairNotices : (parsed.repairNotices ?? []);

  function handleParse() {
    const result = parseImportJsonText(jsonText);
    const diagnosticResult = parseImportWithDiagnostics(jsonText);
    setParseErrors(result.errors);
    setImportDiagnostics(diagnosticResult.diagnostics);
    setParseRepairNotices(result.repairNotices ?? []);
    setParseNotice(
      result.sanitizedText && result.errors.length === 0
        ? "已自动修复中文引号或 LaTeX 反斜杠格式，请继续检查预览。"
        : "",
    );
    if (result.sanitizedText && result.errors.length === 0) {
      setJsonText(result.sanitizedText);
    }
    setApiResult(null);
    setLastImportSuccesses([]);
    setUndoStatus("");
  }

  async function copyTextToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("已复制，可粘贴给 ChatGPT 使用。");
    } catch {
      setCopyStatus("复制失败，请手动选择内容后复制。");
    }
  }

  function copyChatGptPrompt() {
    copyTextToClipboard(chatGptImportPrompt);
  }

  function copyExam408Prompt() {
    copyTextToClipboard(exam408ImportPrompt);
  }

  function copyImportExampleJson() {
    copyTextToClipboard(importExampleJson);
  }

  async function handleImport(importMode: "normal" | "inbox" = "normal") {
    setIsImporting(true);
    setApiResult(null);
    setUndoStatus("");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonText, importMode }),
      });
      const result = (await response.json()) as ImportApiResult;

      setApiResult(result);
      setImportDiagnostics(result.diagnostics ?? []);
      setLastImportSuccesses(response.ok ? (result.successes ?? []) : []);
      if (!response.ok && result.error) {
        setParseErrors([{ index: 0, message: result.error }]);
      }
    } catch (error) {
      setApiResult({
        error: error instanceof Error ? error.message : "导入失败，请稍后重试。",
      });
      setLastImportSuccesses([]);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleUndoLastImport() {
    if (lastImportSuccesses.length === 0) {
      setUndoStatus("没有可撤销的本次导入记录。");
      return;
    }

    const shouldUndo = window.confirm(
      `撤销本次导入的 ${lastImportSuccesses.length} 道错题？\n本操作会软删除这些题，不影响其他错题。`,
    );

    if (!shouldUndo) {
      return;
    }

    setIsUndoing(true);
    setUndoStatus("");

    try {
      const response = await fetch("/api/questions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: lastImportSuccesses.map((success) => success.questionId) }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        deletedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        setUndoStatus(result.error ?? "撤销本次导入失败。");
        return;
      }

      setUndoStatus(`已撤销本次导入，软删除 ${result.deletedCount ?? lastImportSuccesses.length} 道错题。`);
      setLastImportSuccesses([]);
    } catch (error) {
      setUndoStatus(error instanceof Error ? error.message : "撤销本次导入失败。");
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="导入 ChatGPT 错题卡"
        subtitle="粘贴 ChatGPT 生成的 JSON 数组，先预览，再写入错题库和复习计划。"
      />

      <MobileSection>
        <Notice tone="blue">
          <p className="font-bold">3 步完成导入</p>
          <ol className="mt-2 grid gap-1">
            <li>1. 复制 ChatGPT 生成的 JSON</li>
            <li>2. 粘贴到这里</li>
            <li>3. 预览确认后导入</li>
          </ol>
          <p className="mt-2 text-sm leading-6">
            数学公式请使用 LaTeX：行内写作 $\\sum_&#123;n=1&#125;^&#123;\\infty&#125; u_n$，块级公式使用 $$...$$。
          </p>
          <p className="mt-2 text-sm leading-6">
            选择题请尽量把 A/B/C/D 放进 choices，不要全部塞进 question_text。
          </p>
        </Notice>
      </MobileSection>

      <MobileSection title="给 ChatGPT 的整理模板">
        <SectionCard subtitle="晚上整理错题时，先复制指令或示例，再让 ChatGPT 按格式输出 JSON。">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyChatGptPrompt}
              aria-label="复制 ChatGPT 整理指令"
              title="复制 ChatGPT 整理指令"
              className="min-h-12 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              复制数学 GPT 整理模板
            </button>
            <button
              type="button"
              onClick={copyExam408Prompt}
              className="min-h-12 rounded-lg bg-[#5b2bd6] px-4 text-sm font-semibold text-white"
            >
              复制 408 GPT 整理模板
            </button>
            <button
              type="button"
              onClick={copyImportExampleJson}
              className="min-h-12 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              复制 JSON 示例
            </button>
          </div>
          {copyStatus ? (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
              {copyStatus}
            </p>
          ) : null}
        </SectionCard>
      </MobileSection>

      <MobileSection title="粘贴错题卡">
        <SectionCard subtitle="不用手改格式，先粘贴，点解析后再检查每一题。">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">ChatGPT 输出内容</span>
            <textarea
              value={jsonText}
              onChange={(event) => {
                setJsonText(event.target.value);
                setParseErrors([]);
                setImportDiagnostics([]);
                setParseNotice("");
                setParseRepairNotices([]);
                setApiResult(null);
                setLastImportSuccesses([]);
                setUndoStatus("");
              }}
              rows={12}
              className="mt-2 w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-blue-500"
              placeholder="把 ChatGPT 生成的 JSON 粘贴到这里。"
            />
          </label>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setJsonText(importExampleJson);
                setParseErrors([]);
                setImportDiagnostics([]);
                setParseNotice("");
                setParseRepairNotices([]);
                setApiResult(null);
                setLastImportSuccesses([]);
                setUndoStatus("");
              }}
              className="min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700"
            >
              插入示例 JSON
            </button>
            <button
              type="button"
              onClick={handleParse}
              className="min-h-12 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              解析
            </button>
          </div>
        </SectionCard>
      </MobileSection>

      {parseNotice ? (
        <MobileSection>
          <p className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
            {parseNotice}
          </p>
        </MobileSection>
      ) : null}

      {importDiagnostics.length > 0 ? (
        <MobileSection title="导入诊断">
          <div className="space-y-3">
            {importDiagnostics.map((diagnostic, index) => (
              <ImportDiagnosticCard
                key={`${diagnostic.type}-${diagnostic.field ?? "json"}-${diagnostic.line}-${diagnostic.character}-${index}`}
                diagnostic={diagnostic}
              />
            ))}
          </div>
        </MobileSection>
      ) : null}

      {parseErrors.length > 0 ? (
        <MobileSection>
          <div className="space-y-2">
          {parseErrors.map((error) => (
            <p
              key={`${error.index}-${error.message}`}
              className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 ring-1 ring-red-100"
            >
              {error.index > 0 ? `第 ${error.index} 条：` : ""}
              {error.message}
            </p>
          ))}
          </div>
        </MobileSection>
      ) : null}

      {previewCards.length > 0 ? (
        <ImportActionPanel
          previewCount={previewCards.length}
          directCount={qualityReport.importableCount - qualityReport.inboxRecommendedCount}
          inboxCount={qualityReport.inboxRecommendedCount}
          seriousCount={qualityReport.seriousCount}
          repairNotices={visibleRepairNotices}
          canImport={canImport}
          isImporting={isImporting}
          onImport={() => handleImport("normal")}
          onInboxImport={() => handleImport("inbox")}
        />
      ) : null}

      {previewCards.length > 0 ? (
        <MobileSection>
          <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">导入前质检</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label="共解析" value={previewCards.length} tone="blue" />
              <StatCard label="可直接导入" value={qualityReport.importableCount - qualityReport.inboxRecommendedCount} tone="green" />
              <StatCard label="建议待整理" value={qualityReport.inboxRecommendedCount} tone="amber" />
              <StatCard label="严重错误" value={qualityReport.seriousCount} tone={qualityReport.seriousCount > 0 ? "red" : "slate"} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatCard label="包含答案" value={previewStats.withAnswer} tone="green" />
              <StatCard label="未绑定原图" value={previewStats.withoutImage} tone="amber" />
              <StatCard label="需要核对" value={previewStats.needsCheck} />
            </div>
          </div>
          <h2 className="text-base font-semibold text-slate-950">
            预览 {previewCards.length} 张错题卡
          </h2>
          {previewCards.map((item) => (
            <ImportPreviewCard key={item.index} item={item} quality={qualityByIndex.get(item.index)} />
          ))}
          {qualityReport.seriousCount > 0 ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 ring-1 ring-red-100">
              存在严重错误，请先修正 JSON 后再导入。
            </p>
          ) : null}
          </div>
        </MobileSection>
      ) : null}

      {apiResult ? (
        <MobileSection>
          <div className="space-y-3">
          {apiResult.error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 ring-1 ring-red-100">
              {apiResult.error}
            </p>
          ) : null}
          {typeof apiResult.successCount === "number" ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
              已导入 {apiResult.successCount} 条；失败 {apiResult.failureCount ?? 0} 条。
              {apiResult.successes?.some((success) => success.inbox) ? " 已自动标记部分题为待整理。" : ""}
              {lastImportSuccesses.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/questions?scope=recent"
                    className="inline-flex min-h-9 items-center rounded-lg bg-white px-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-100"
                  >
                    查看最近导入
                  </Link>
                  <button
                    type="button"
                    onClick={handleUndoLastImport}
                    disabled={isUndoing}
                    className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:text-slate-400"
                  >
                    {isUndoing ? "撤销中..." : "撤销本次导入"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {undoStatus ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
              {undoStatus}
            </p>
          ) : null}
          {apiResult.failures?.map((failure) => (
            <p
              key={`${failure.index}-${failure.message}`}
              className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 ring-1 ring-amber-100"
            >
              第 {failure.index} 条失败：{failure.message}
            </p>
          ))}
          {apiResult.successes
            ?.filter((success) => success.warning)
            .map((success) => (
              <p
                key={success.questionId}
                className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 ring-1 ring-amber-100"
              >
                第 {success.index} 条：{success.warning}
              </p>
            ))}
          </div>
        </MobileSection>
      ) : null}
    </MobilePageShell>
  );
}
