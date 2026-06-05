"use client";

import { useMemo, useState } from "react";
import { MobileCard, MobileSection, Notice } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getAnswerStatusLabel } from "@/lib/questions/answer-labels";
import {
  importExampleJson,
  parseImportJsonText,
  type ImportParsedCard,
  type ImportRowError,
} from "@/lib/import/import-schema";

type ImportApiResult = {
  error?: string;
  successCount?: number;
  failureCount?: number;
  successes?: Array<{ index: number; questionId: string; reviewCount: number; warning?: string }>;
  failures?: ImportRowError[];
};

function ImportPreviewCard({ item }: { item: ImportParsedCard }) {
  const { card } = item;
  const hasAnswer = Boolean(card.standard_answer?.trim());

  return (
    <MobileCard>
      <div className="flex flex-wrap gap-2">
        <StatusPill label={`第 ${item.index} 条`} tone="slate" />
        <StatusPill label={card.subject} tone="blue" />
        <StatusPill label={card.mastery_status} tone="amber" />
        {card.image_path ? (
          <StatusPill label="已绑定原图路径" tone="blue" />
        ) : (
          <StatusPill label="文字错题卡" tone="amber" />
        )}
        <StatusPill label={card.difficulty ? `难度：${card.difficulty}` : "难度待补充"} tone="slate" />
        <StatusPill label={hasAnswer ? "包含答案" : "未包含答案，可后续补充"} tone={hasAnswer ? "blue" : "amber"} />
        <StatusPill label={getAnswerStatusLabel(card.answer_status)} tone="amber" />
      </div>
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
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {card.chapter ? `${card.chapter} / ` : ""}
          {card.question_text ?? card.user_note}
        </p>
      )}
      <dl className="mt-3 space-y-2 text-sm">
        {hasAnswer ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="font-semibold text-slate-800">标准答案预览</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-slate-600">
              {card.standard_answer}
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
          <dd className="mt-1 text-slate-600">{card.one_sentence_tip ?? "待补充"}</dd>
        </div>
        {card.image_code ? (
          <div>
            <dt className="font-semibold text-slate-800">image_code</dt>
            <dd className="mt-1 break-words text-slate-600">{card.image_code}</dd>
          </div>
        ) : null}
      </dl>
    </MobileCard>
  );
}

export default function ImportPage() {
  const [jsonText, setJsonText] = useState("");
  const [parseErrors, setParseErrors] = useState<ImportRowError[]>([]);
  const [apiResult, setApiResult] = useState<ImportApiResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parsed = useMemo(() => parseImportJsonText(jsonText), [jsonText]);
  const previewCards = parsed.cards;
  const canImport = previewCards.length > 0 && !isImporting;

  function handleParse() {
    const result = parseImportJsonText(jsonText);
    setParseErrors(result.errors);
    setApiResult(null);
  }

  async function handleImport() {
    setIsImporting(true);
    setApiResult(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonText }),
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
    <div>
      <PageHeader
        title="导入 ChatGPT 错题卡"
        subtitle="粘贴 ChatGPT 生成的 JSON 数组，先预览，再写入错题库和复习计划。"
      />

      <MobileSection>
        <Notice tone="blue">
          <p className="font-bold">推荐流程</p>
          <ol className="mt-2 grid gap-1">
            <li>1. 白天在 ChatGPT 里讨论错题</li>
            <li>2. 晚上让 ChatGPT 生成 JSON</li>
            <li>3. 粘贴到这里确认导入</li>
            <li>4. 第二天按复习计划清掉</li>
          </ol>
        </Notice>
      </MobileSection>

      <MobileSection title="粘贴 JSON">
        <MobileCard>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">JSON 错题卡数组</span>
            <textarea
              value={jsonText}
              onChange={(event) => {
                setJsonText(event.target.value);
                setParseErrors([]);
                setApiResult(null);
              }}
              rows={12}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm leading-6 text-slate-950 outline-none focus:border-blue-500"
              placeholder="粘贴 ChatGPT 生成的 JSON 数组"
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
        </MobileCard>
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              预览 {previewCards.length} 张错题卡
            </h2>
            <StatusPill label="source: chatgpt_import" tone="blue" />
          </div>
          {previewCards.map((item) => (
            <ImportPreviewCard key={item.index} item={item} />
          ))}
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="min-h-14 w-full rounded-lg bg-slate-950 px-4 text-base font-semibold text-white disabled:bg-slate-300"
          >
            {isImporting ? "导入中..." : "确认导入"}
          </button>
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
    </div>
  );
}
