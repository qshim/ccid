"use client";

import { useEffect, useRef, useState } from "react";
import { ABOUT_SECTIONS } from "./aboutData";
import { pretendardR, pxGrotesk } from "@/fonts/fonts";

// Mixed-script stack for Korean body text: Latin/digits render in PxGrotesk,
// Hangul falls through to Pretendard (PxGrotesk has no Hangul glyphs).
const mixedKrFont = `${pxGrotesk.style.fontFamily.split(",")[0]}, ${pretendardR.style.fontFamily}`;

// #6 스크롤 리빌: 뷰포트에 들어오면 한 번 페이드+상승. reduced-motion이면 즉시 표시.
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    // 안전장치: IO가 어떤 이유로든 발화하지 않아도 콘텐츠가 영구히 숨지 않도록.
    const fallback = setTimeout(() => setShown(true), 1600);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`${className} transition-[opacity,transform] duration-[700ms] ease-out will-change-[opacity,transform] ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </div>
  );
}

function SectorsLogos() {
  return (
    <div className="w-full mt-10 lg:mt-14">
      <div className="w-full flex justify-center">
        {/* Mobile / mid-resize: Figma export image */}
        <img
          src="/img/mobile_logo.png"
          alt="Sectors We Serve"
          className={[
            "block lg:hidden",
            "w-auto h-auto object-contain",
            "max-w-[92vw] max-h-[34vh] sm:max-h-[38vh]",
            "select-none pointer-events-none",
          ].join(" ")}
          draggable={false}
        />
        {/* Desktop: full logo layout image, fit to the content column width */}
        <img
          src="/img/logo.png"
          alt="Sectors We Serve"
          className={[
            "hidden lg:block w-full max-w-full h-auto object-contain",
            "max-h-[42vh] xl:max-h-[46vh]",
            "select-none pointer-events-none",
          ].join(" ")}
          draggable={false}
        />
      </div>
    </div>
  );
}

// #4 시각요소: 텍스트만 있는 블록(Who We Are / Methodology)에 회색 배경 div를
// 자리표시자(placeholder)로 넣어 리듬을 만든다. 나중에 이미지/도식으로 교체 가능.
function VisualPlaceholder({ label }) {
  return (
    <div
      aria-hidden="true"
      className="w-full mt-8 lg:mt-12 rounded-2xl bg-[#DBDBE2] aspect-[16/6] flex items-center justify-center overflow-hidden"
    >
      <span className={`${pxGrotesk.className} text-[11px] uppercase tracking-[0.14em] text-[#9a9aa6] select-none`}>
        {label}
      </span>
    </div>
  );
}

export default function AboutIntro() {
  return (
    <div className={`w-full subpixel-antialiased about-text-tuning ${pretendardR.className}`}>
      {ABOUT_SECTIONS.map((section) => {
        const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
        const en = paragraphs[0] || "";
        const kr = paragraphs[1] || "";
        const isSectors = section.id === "sectors";

        return (
          <div
            key={section.id}
            data-about-block={section.id}
            className="snap-start min-h-[58dvh] lg:min-h-[100dvh] w-full flex items-center"
          >
            <div className="w-full max-w-[var(--siteMax)] px-[var(--siteGutter)] mx-auto py-[7vh] lg:py-[14vh]">
              <div className="grid grid-cols-1 lg:grid-cols-[296px_1fr] gap-y-6 lg:gap-y-0 lg:gap-x-8 items-start">
                {/* Left: section title — tops align with the KR/EN columns */}
                <div className="w-full lg:sticky lg:top-[18vh]">
                  <Reveal>
                    <h2
                      className={`text-left font-[400] leading-tight text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem] tracking-[-0.03em] text-[#0f0f13] ${pxGrotesk.className}`}
                    >
                      {section.title}
                    </h2>
                  </Reveal>
                </div>

                {/* Right: KR (left) + EN (right) paragraphs (+ sectors logo / visual) */}
                <div className="w-full">
                  <Reveal delay={90}>
                    <div className="w-full grid grid-cols-1 md:grid-cols-[0.89fr_1.11fr] gap-x-12 gap-y-6">
                      {kr ? (
                        <p style={{ fontFamily: mixedKrFont }} className="hidden sm:block text-[15px] leading-[1.58] tracking-[-0.01em] font-[450]">
                          {kr}
                        </p>
                      ) : null}
                      {en ? (
                        <p className={`${pxGrotesk.className} text-[15px] leading-[1.3] tracking-[0] font-[380]`}>
                          {en}
                        </p>
                      ) : null}
                    </div>
                  </Reveal>

                  {isSectors ? (
                    <Reveal delay={140}>
                      <SectorsLogos />
                    </Reveal>
                  ) : (
                    <Reveal delay={140}>
                      <VisualPlaceholder label={section.title} />
                    </Reveal>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
