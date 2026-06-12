"use client";

import { useMemo, useState } from "react";
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
  importExampleJson,
  parseImportJsonText,
  type ImportParsedCard,
  type ImportRowError,
} from "@/lib/import/import-schema";

type ImportApiResult = {
  error?: string;
  successCount?: number;
  failureCount?: number;
  successes?: Array<{ index: number; questionId: string; reviewCount: number; warning?: string; inbox?: boolean }>;
  failures?: ImportRowError[];
};

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
        {card.image_path ? (
          <StatusPill label="已绑定原图路径" tone="blue" />
        ) : (
          <StatusPill label="文字错题卡" tone="amber" />
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
      <h2 className="mt-3 text-base font-semibold text-slate-950">
        {card.knowledge_point ?? "待补充知识点"}
      </h2>
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

export default function ImportPage() {
  const [jsonText, setJsonText] = useState("");
  const [parseErrors, setParseErrors] = useState<ImportRowError[]>([]);
  const [apiResult, setApiResult] = useState<ImportApiResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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

  function handleParse() {
    const result = parseImportJsonText(jsonText);
    setParseErrors(result.errors);
    setApiResult(null);
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

  function copyImportExampleJson() {
    copyTextToClipboard(importExampleJson);
  }

  async function handleImport(importMode: "normal" | "inbox" = "normal") {
    setIsImporting(true);
    setApiResult(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonText, importMode }),
      });
      const result = (await response.json()) as ImportApiResult;

      setApiResult(result);
      if (!response.ok && result.error) {
        setParseErrors([{ index: 0, message: result.error }]);
      }
    } catch (error) {
      setApiResult({
        error: error instanceof Error ? error.message : "导入失败，请稍后重试。",
      });
    } finally {
      setIsImporting(false);
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
              className="min-h-12 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              复制 ChatGPT 整理指令
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
                setApiResult(null);
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
                setApiResult(null);
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
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleImport("normal")}
              disabled={!canImport}
              className="min-h-14 rounded-lg bg-slate-950 px-4 text-base font-semibold text-white disabled:bg-slate-300"
            >
              {isImporting ? "导入中..." : "确认导入"}
            </button>
            <button
              type="button"
              onClick={() => handleImport("inbox")}
              disabled={!canImport}
              className="min-h-14 rounded-lg bg-[#5b2bd6] px-4 text-base font-semibold text-white disabled:bg-slate-300"
            >
              导入到待整理
            </button>
          </div>
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
            </div>
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
