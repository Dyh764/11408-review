"use client";

import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MobileSection } from "@/components/mobile/primitives";

type SwipeReview = {
  id: string;
};

type GestureAxis = "horizontal" | "vertical" | null;

const swipeThreshold = 56;
const directionLockThreshold = 10;
const horizontalDominanceRatio = 1.25;
const maxDragOffset = 128;

function clampDragOffset(value: number) {
  return Math.max(-maxDragOffset, Math.min(maxDragOffset, value));
}

function shouldIgnorePointerStart(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("input,textarea,select,summary,[data-swipe-ignore]"))
    : false;
}

export function ReviewFlashcardDeck<T extends SwipeReview>({
  reviews,
  renderCard,
  isNavigationLocked,
  onAdvance,
  activeReviewId,
  onActiveReviewChange,
  focusMode = false,
}: {
  reviews: T[];
  renderCard: (review: T) => ReactNode;
  isNavigationLocked?: (review: T) => boolean;
  onAdvance?: (review: T) => boolean;
  activeReviewId?: string;
  onActiveReviewChange?: (review: T) => void;
  focusMode?: boolean;
}) {
  const [uncontrolledActiveIndex, setUncontrolledActiveIndex] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    axis: GestureAxis;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const controlledIndex =
    activeReviewId === undefined
      ? -1
      : reviews.findIndex((review) => review.id === activeReviewId);
  const requestedIndex =
    activeReviewId === undefined
      ? uncontrolledActiveIndex
      : controlledIndex >= 0
        ? controlledIndex
        : 0;
  const safeActiveIndex =
    reviews.length > 0 ? Math.max(0, Math.min(requestedIndex, reviews.length - 1)) : 0;
  const activeReview = reviews[safeActiveIndex] ?? reviews[0];
  const navigationLocked = activeReview
    ? Boolean(isNavigationLocked?.(activeReview))
    : false;

  const setActiveReviewByIndex = useCallback(
    (nextIndex: number) => {
      if (reviews.length === 0) {
        return;
      }

      const safeIndex = Math.max(0, Math.min(nextIndex, reviews.length - 1));
      const nextReview = reviews[safeIndex];

      if (activeReviewId === undefined) {
        setUncontrolledActiveIndex(safeIndex);
      }

      if (nextReview) {
        onActiveReviewChange?.(nextReview);
      }
    },
    [activeReviewId, onActiveReviewChange, reviews],
  );

  const goPrevious = useCallback(() => {
    if (navigationLocked) {
      return;
    }

    setActiveReviewByIndex(safeActiveIndex - 1);
  }, [navigationLocked, safeActiveIndex, setActiveReviewByIndex]);

  const goNext = useCallback(() => {
    if (navigationLocked) {
      return;
    }

    if (activeReview && onAdvance?.(activeReview)) {
      return;
    }

    setActiveReviewByIndex(safeActiveIndex + 1);
  }, [
    activeReview,
    navigationLocked,
    onAdvance,
    safeActiveIndex,
    setActiveReviewByIndex,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious]);

  if (reviews.length === 0) {
    return null;
  }

  const dragDirectionLabel =
    navigationLocked
      ? "当前卡片暂时不能切换"
      : Math.abs(dragOffsetX) >= swipeThreshold
        ? dragOffsetX > 0
          ? "松手回到上一题"
          : "松手进入下一题"
        : "左滑下一题，右滑上一题";

  function resetGesture() {
    gestureRef.current = null;
    setIsDragging(false);
    setDragOffsetX(0);
  }

  function finishHorizontalDrag(deltaX: number) {
    if (Math.abs(deltaX) >= swipeThreshold) {
      if (deltaX > 0) {
        goPrevious();
      } else {
        goNext();
      }
    }

    suppressNextClickRef.current = Math.abs(deltaX) >= directionLockThreshold;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
    resetGesture();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (navigationLocked || shouldIgnorePointerStart(event.target)) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
    };
    setDragOffsetX(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId || navigationLocked) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < directionLockThreshold) {
        return;
      }

      gesture.axis =
        Math.abs(deltaX) > Math.abs(deltaY) * horizontalDominanceRatio
          ? "horizontal"
          : "vertical";

      if (gesture.axis === "horizontal") {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      }
    }

    if (gesture.axis !== "horizontal") {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
    setDragOffsetX(clampDragOffset(deltaX));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (gesture.axis === "horizontal") {
      finishHorizontalDrag(event.clientX - gesture.startX);
      return;
    }

    resetGesture();
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetGesture();
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressNextClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  }

  const navigation = (
    <div className="rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_6px_16px_rgba(15,23,42,0.04)] md:p-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-black text-slate-500 md:gap-3">
        <button
          type="button"
          data-swipe-ignore
          onClick={goPrevious}
          disabled={navigationLocked || safeActiveIndex === 0}
          className="min-h-8 rounded-lg bg-slate-100 px-3 text-slate-700 disabled:text-slate-300 md:min-h-9"
        >
          上一题
        </button>
        <span className="text-slate-950">
          {safeActiveIndex + 1} / {reviews.length}
        </span>
        <button
          type="button"
          data-swipe-ignore
          onClick={goNext}
          disabled={navigationLocked || safeActiveIndex >= reviews.length - 1}
          className="min-h-8 rounded-lg bg-blue-50 px-3 text-blue-700 disabled:text-slate-300 md:min-h-9"
        >
          下一题
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={
        focusMode
          ? "flex h-full min-h-0 flex-col gap-1.5 px-2 py-1.5 md:gap-2 md:px-3 md:py-2"
          : "space-y-3"
      }
    >
      <div
        className={
          focusMode
            ? "sr-only shrink-0 px-1 text-center text-xs font-black text-slate-500 md:not-sr-only md:block"
            : "shrink-0 px-1 text-center text-xs font-black text-slate-500"
        }
        aria-live="polite"
      >
        {dragDirectionLabel}
      </div>
      <div
        className={`touch-pan-y select-none ${
          focusMode ? "min-h-0 flex-1 overflow-hidden" : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
        <div
          className={`${isDragging ? "" : "transition-transform duration-200 ease-out"} ${
            focusMode ? "h-full min-h-0" : ""
          }`}
          style={{
            transform: `translateX(${dragOffsetX}px) rotate(${dragOffsetX / 28}deg)`,
          }}
        >
          {renderCard(activeReview)}
        </div>
      </div>
      {focusMode ? (
        <div className="shrink-0">{navigation}</div>
      ) : (
        <MobileSection>{navigation}</MobileSection>
      )}
    </div>
  );
}
