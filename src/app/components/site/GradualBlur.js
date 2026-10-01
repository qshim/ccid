"use client";

// 한 겹짜리 backdrop-filter 는 끝나는 자리에 선이 생긴다. 여기서는 여러 층을
// 겹쳐 각 층에 서로 다른 세기의 블러와 좁은 마스크 띠를 주어, 위에서 아래로
// 블러가 서서히 풀리게 한다 — 경계가 보이지 않는다.
//
// divCount 개의 층이 각자 자기 구간만 담당하고(마스크), 아래로 갈수록 세기가
// 줄어든다. 층끼리 구간을 겹쳐 두는 것이 중요하다. 틈이 생기면 그 자리에
// 다시 선이 보인다.

import { useMemo } from "react";

const CURVES = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
};

const DIRECTION = { top: "to top", bottom: "to bottom", left: "to left", right: "to right" };

export default function GradualBlur({
  position = "top",
  height = "9rem",
  strength = 2,
  divCount = 6,
  curve = "ease-out",
  exponential = false,
  opacity = 1,
  zIndex = 0,
  className = "",
  style = {},
}) {
  const layers = useMemo(() => {
    const step = 100 / divCount;
    const ease = CURVES[curve] || CURVES.linear;
    const dir = DIRECTION[position] || "to bottom";

    return Array.from({ length: divCount }, (_, idx) => {
      const i = idx + 1;
      const progress = ease(i / divCount);
      const blur = exponential
        ? Math.pow(2, progress * 4) * 0.0625 * strength
        : 0.0625 * progress * divCount * strength;

      // 인접한 층과 구간을 겹쳐 띠 사이에 빈틈이 생기지 않게 한다.
      const a = Math.round((step * i - step) * 10) / 10;
      const b = Math.round(step * i * 10) / 10;
      const c = Math.round((step * i + step) * 10) / 10;
      const d = Math.round((step * i + step * 2) * 10) / 10;
      let mask = `transparent ${a}%, black ${b}%`;
      if (c <= 100) mask += `, black ${c}%`;
      if (d <= 100) mask += `, transparent ${d}%`;

      // 세기를 CSS 변수로 한 번 더 곱한다 — 스크롤에 따라 층 전체의 블러가
      // 같은 비율로 자라거나 풀린다 (헤더에서 --gblur-scale 을 준다).
      const filter = `blur(calc(${blur.toFixed(3)}rem * var(--gblur-scale, 1)))`;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            maskImage: `linear-gradient(${dir}, ${mask})`,
            WebkitMaskImage: `linear-gradient(${dir}, ${mask})`,
            backdropFilter: filter,
            WebkitBackdropFilter: filter,
            opacity,
          }}
        />
      );
    });
  }, [position, height, strength, divCount, curve, exponential, opacity]);

  const vertical = position === "top" || position === "bottom";
  return (
    <div
      aria-hidden="true"
      className={`gradual-blur ${className}`}
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex,
        [position]: 0,
        ...(vertical
          ? { left: 0, right: 0, height }
          : { top: 0, bottom: 0, width: height }),
        ...style,
      }}
    >
      {layers}
    </div>
  );
}
