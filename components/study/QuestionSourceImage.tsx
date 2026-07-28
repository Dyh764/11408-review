"use client";

import type { QuestionSourceInfo } from "@/lib/types";

export function QuestionSourceImage({
  src,
  sourceInfo,
  compact = false,
  onError,
}: {
  src: string;
  sourceInfo?: QuestionSourceInfo | null;
  compact?: boolean;
  onError?: () => void;
}) {
  const crop = sourceInfo?.image_crop;

  if (!crop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="原题图片"
        className={`mx-auto w-full object-contain ${
          compact ? "max-h-20" : "max-h-[28dvh] md:max-h-[36dvh]"
        }`}
        onError={onError}
      />
    );
  }

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden bg-white ${
        compact ? "max-h-20" : "max-h-[30dvh]"
      }`}
      style={{ aspectRatio: `${crop.width} / ${crop.height}` }}
      aria-label="原题页中的题目区域"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="原题页裁剪区域"
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: `${(crop.page_width / crop.width) * 100}%`,
          height: "auto",
          left: `${-(crop.x / crop.width) * 100}%`,
          top: `${-(crop.y / crop.height) * 100}%`,
        }}
        onError={onError}
      />
    </div>
  );
}
