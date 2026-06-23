"use client";

import { type ReactNode, type TouchEvent, useEffect, useState } from "react";
import { MobileSection } from "@/components/mobile/primitives";
import { StudyCard } from "@/components/study/study-ui";

type SwipeReview = {
  id: string;
};

export function ReviewFlashcardDeck<T extends SwipeReview>({
  reviews,
  renderCard,
}: {
  reviews: T[];
  renderCard: (review: T) => ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(current - 1, 0));
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => Math.min(current + 1, reviews.length - 1));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviews.length]);

  if (reviews.length === 0) {
    return null;
  }

  const safeActiveIndex = Math.min(activeIndex, reviews.length - 1);
  const activeReview = reviews[safeActiveIndex] ?? reviews[0];

  function goPrevious() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function goNext() {
    setActiveIndex((current) => Math.min(current + 1, reviews.length - 1));
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < 48) {
      return;
    }

    if (deltaX > 0) {
      goPrevious();
    } else {
      goNext();
    }
  }

  return (
    <div
      className="touch-pan-y"
      onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="transition-transform duration-200 ease-out">{renderCard(activeReview)}</div>
      <MobileSection>
        <StudyCard className="py-3">
          <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-500">
            <button
              type="button"
              onClick={goPrevious}
              disabled={safeActiveIndex === 0}
              className="min-h-9 rounded-lg bg-slate-100 px-3 text-slate-700 disabled:text-slate-300"
            >
              左滑上一题
            </button>
            <span className="text-slate-950">
              {safeActiveIndex + 1} / {reviews.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={safeActiveIndex >= reviews.length - 1}
              className="min-h-9 rounded-lg bg-blue-50 px-3 text-blue-700 disabled:text-slate-300"
            >
              右滑下一题
            </button>
          </div>
        </StudyCard>
      </MobileSection>
    </div>
  );
}
