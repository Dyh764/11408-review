"use client";

import { type PointerEvent, type ReactNode, useEffect, useState } from "react";
import { MobileSection } from "@/components/mobile/primitives";
import { StudyCard } from "@/components/study/study-ui";

type SwipeReview = {
  id: string;
};

const swipeThreshold = 56;
const maxDragOffset = 128;

function clampDragOffset(value: number) {
  return Math.max(-maxDragOffset, Math.min(maxDragOffset, value));
}

function shouldIgnorePointerStart(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("button,a,input,textarea,select,summary"))
    : false;
}

export function ReviewFlashcardDeck<T extends SwipeReview>({
  reviews,
  renderCard,
  isNavigationLocked,
}: {
  reviews: T[];
  renderCard: (review: T) => ReactNode;
  isNavigationLocked?: (review: T) => boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const safeActiveIndex = reviews.length > 0 ? Math.min(activeIndex, reviews.length - 1) : 0;
  const activeReview = reviews[safeActiveIndex] ?? reviews[0];
  const navigationLocked = activeReview ? Boolean(isNavigationLocked?.(activeReview)) : false;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (navigationLocked) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(Math.min(current, reviews.length - 1) - 1, 0));
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          Math.min(Math.min(current, reviews.length - 1) + 1, reviews.length - 1),
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigationLocked, reviews.length]);

  if (reviews.length === 0) {
    return null;
  }

  const isDragging = dragStartX !== null;
  const dragDirectionLabel =
    navigationLocked
      ? "当前卡片暂时不能切换"
      : Math.abs(dragOffsetX) >= swipeThreshold
      ? dragOffsetX > 0
        ? "松手回到上一题"
        : "松手进入下一题"
      : "左滑下一题，右滑上一题";

  function goPrevious() {
    if (navigationLocked) {
      return;
    }

    setActiveIndex(Math.max(safeActiveIndex - 1, 0));
  }

  function goNext() {
    if (navigationLocked) {
      return;
    }

    setActiveIndex(Math.min(safeActiveIndex + 1, reviews.length - 1));
  }

  function finishDrag(deltaX: number) {
    if (Math.abs(deltaX) >= swipeThreshold) {
      if (deltaX > 0) {
        goPrevious();
      } else {
        goNext();
      }
    }

    setDragStartX(null);
    setDragOffsetX(0);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (navigationLocked) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (shouldIgnorePointerStart(event.target)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStartX(event.clientX);
    setDragOffsetX(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (navigationLocked || dragStartX === null) {
      return;
    }

    setDragOffsetX(clampDragOffset(event.clientX - dragStartX));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (navigationLocked || dragStartX === null) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(event.clientX - dragStartX);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragStartX(null);
    setDragOffsetX(0);
  }

  return (
    <div className="space-y-3">
      <div className="px-1 text-center text-xs font-black text-slate-500" aria-live="polite">
        {dragDirectionLabel}
      </div>
      <div
        className="touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className={isDragging ? "" : "transition-transform duration-200 ease-out"}
          style={{
            transform: `translateX(${dragOffsetX}px) rotate(${dragOffsetX / 28}deg)`,
          }}
        >
          {renderCard(activeReview)}
        </div>
      </div>
      <MobileSection>
        <StudyCard className="py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-black text-slate-500">
            <button
              type="button"
              onClick={goPrevious}
              disabled={navigationLocked || safeActiveIndex === 0}
              className="min-h-9 rounded-lg bg-slate-100 px-3 text-slate-700 disabled:text-slate-300"
            >
              上一题
            </button>
            <span className="text-slate-950">
              {safeActiveIndex + 1} / {reviews.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={navigationLocked || safeActiveIndex >= reviews.length - 1}
              className="min-h-9 rounded-lg bg-blue-50 px-3 text-blue-700 disabled:text-slate-300"
            >
              下一题
            </button>
          </div>
        </StudyCard>
      </MobileSection>
    </div>
  );
}
