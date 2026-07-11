"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-entry reveal: fades + rises its children once when they scroll into
// view. Observes intersection against the nearest scrolling ancestor (the page
// uses an inner `<main>` scroll container, so the default viewport root won't
// fire). Respects `prefers-reduced-motion` by rendering visible immediately.
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  y = 12,
  duration = 600,
  className = "",
  style,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }

    const root = el.closest("main") || null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { root, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity ${duration}ms var(--ease-reveal) ${delay}ms, transform ${duration}ms var(--ease-reveal) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
