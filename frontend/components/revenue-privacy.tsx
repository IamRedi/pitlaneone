"use client";

import { useEffect, useRef, useState } from "react";

export function RevenuePrivacy({ value }: { value: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const clickCount = useRef(0);
  const clickResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickResetTimer.current) clearTimeout(clickResetTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function handleReveal() {
    if (isVisible) return;

    clickCount.current += 1;
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current);

    if (clickCount.current === 3) {
      clickCount.current = 0;
      setIsVisible(true);
      hideTimer.current = setTimeout(() => setIsVisible(false), 5000);
      return;
    }

    clickResetTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1500);
  }

  return (
    <button
      type="button"
      onClick={handleReveal}
      className="block min-h-8 text-left"
      aria-label="Shfaq te ardhurat"
    >
      <span className={`text-2xl font-black text-ink transition duration-200 ${isVisible ? "blur-0" : "select-none blur-md"}`}>
        {value}
      </span>
    </button>
  );
}
