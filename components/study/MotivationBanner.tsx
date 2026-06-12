"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildMotivationCacheKey,
  getDailyMotivation,
} from "@/lib/motivation";
import { StudyCard } from "@/components/study/study-ui";

type MotivationResponse = {
  message?: string;
  fallback?: string;
  dateKey?: string;
  cacheKey?: string;
};

function todayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

export function MotivationBanner({
  text,
  userId = null,
}: {
  text?: string;
  userId?: string | null;
}) {
  const fallback = useMemo(() => text ?? getDailyMotivation(), [text]);
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") {
      return fallback;
    }

    return window.localStorage.getItem(buildMotivationCacheKey(userId, todayUtcKey())) ?? fallback;
  });

  useEffect(() => {
    let isActive = true;
    const localKey = buildMotivationCacheKey(userId, todayUtcKey());
    const cached = window.localStorage.getItem(localKey);

    if (cached) {
      return;
    }

    fetch("/api/motivation/today")
      .then((response) => response.json() as Promise<MotivationResponse>)
      .then((data) => {
        if (!isActive) {
          return;
        }

        const nextMessage = data.message || data.fallback || fallback;
        const nextCacheKey = data.cacheKey || buildMotivationCacheKey(userId, data.dateKey);

        window.localStorage.setItem(nextCacheKey, nextMessage);
        setMessage(nextMessage);
      })
      .catch(() => {
        if (isActive) {
          window.localStorage.setItem(localKey, fallback);
          setMessage(fallback);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fallback, userId]);

  return (
    <StudyCard className="bg-[#fbfaff]">
      <p className="text-xs font-black text-[#5b2bd6]">今日激励句</p>
      <p className="mt-2 text-sm leading-6 text-[#211536]">{message}</p>
    </StudyCard>
  );
}
