"use client";

// 이미지가 두 장 이상인 프로젝트는 몇 초에 한 번씩 천천히 겹쳐 넘긴다.
//
// 첫 장은 흐름 안에 그대로 두어 컨테이너 높이를 정하고(디테일 페이지의 figure는
// 이미지가 높이를 만든다), 나머지는 그 위에 절대배치로 쌓아 opacity만 바꾼다.
// 그래서 기존 .theme-image / .detail-image 의 크기 규칙을 건드리지 않는다.
//
// 한 장뿐이면 타이머도 오버레이도 만들지 않는다 — 평소와 똑같은 <Image> 하나다.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const SWITCH_MS = 5000;
const isReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ProjectImages({ images, alt, interval = SWITCH_MS, ...imgProps }) {
  const list = (images || []).filter(Boolean);
  const many = list.length > 1;
  const [index, setIndex] = useState(0);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!many || isReduced()) return;
    // 화면 밖에 있으면 넘기지 않는다. 홈 카드 네 장과 상세 이미지가 저마다 타이머를 돌리는데,
    // 보이지 않는 장면을 계속 바꿀 이유가 없다.
    let onScreen = true;
    const host = firstRef.current?.parentElement;
    const io = host && "IntersectionObserver" in window
      ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; })
      : null;
    if (io) io.observe(host);
    const id = window.setInterval(() => {
      // 탭이 숨겨져 있으면 넘기지 않는다 — 돌아왔을 때 몰아서 바뀌는 것도 막는다.
      if (!document.hidden && onScreen) setIndex((v) => (v + 1) % list.length);
    }, interval);
    return () => { window.clearInterval(id); io?.disconnect(); };
  }, [many, list.length, interval]);

  if (!list.length) return null;

  return (
    <>
      <Image ref={firstRef} src={list[0]} alt={alt} {...imgProps} />
      {many &&
        list.slice(1).map((src, n) => (
          <Image
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            {...imgProps}
            className="project-image-layer"
            style={{ opacity: index === n + 1 ? 1 : 0 }}
          />
        ))}
    </>
  );
}
