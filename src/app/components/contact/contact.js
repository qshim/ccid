"use client";
import { useEffect, useRef, useState } from "react";
import { sheetsStatic } from "@/app/data/sheetsStatic";
import LiquidBackground from "@/app/components/landing/liquidBackground";
import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";
import { pxGrotesk, pretendardR } from "@/fonts/fonts";

// Mixed-script stack for Korean body text: Latin/digits render in PxGrotesk,
// Hangul falls through to Pretendard (PxGrotesk has no Hangul glyphs). The
// PxGrotesk auto-fallback is excluded so it can't catch Hangul.
const mixedKrFont = `${pxGrotesk.style.fontFamily.split(",")[0]}, ${pretendardR.style.fontFamily}`;

function ShimmerEmail({ text }) {
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(null);

  // Slow yoyo shimmer: left -> right -> left
  const animationDurationMs = 11000;

  useAnimationFrame((time) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += delta;

    const fullCycle = animationDurationMs * 2;
    const cycleTime = elapsedRef.current % fullCycle;
    const t =
      cycleTime < animationDurationMs
        ? cycleTime / animationDurationMs
        : 1 - (cycleTime - animationDurationMs) / animationDurationMs;
    progress.set(t * 100);
  });

  useEffect(() => {
    elapsedRef.current = 0;
    lastTimeRef.current = null;
    progress.set(0);
  }, [progress]);

  const bgPos = useTransform(progress, (p) => `${p}% 50%`);

  return (
    <span className="relative inline-block">
      {/* Base: very subtle white so "transparent" areas are still visible */}
      <span className="relative z-10 text-[#0f0f13]/40">{text}</span>

      {/* Highlight: bright white + glow, clipped to glyphs (no rectangle) */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 z-20 pointer-events-none select-none text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.08) 65%, rgba(255,255,255,0) 100%)",
          backgroundSize: "280% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: bgPos,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          // 모션(하이라이트 이동)은 유지하되, 블러 느낌의 글로우는 제거
          textShadow: "none",
        }}
      >
        {text}
      </motion.span>
    </span>
  );
}

export default function Contact({ borderRadius, sectionOn, colorPalette = 2 }) {
  const [aboutInfo] = useState(sheetsStatic?.about || null);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useState({ current: null })[0];
  const emailText = aboutInfo?.[0]?.[2] || "";

  const handleCopy = async (e) => {
    e.preventDefault();
    if (!emailText) return;
    try {
      await navigator.clipboard.writeText(emailText);
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 1600);
    } catch (err) {
      // Fallback: select text by opening mailto if clipboard fails
      window.location.href = `mailto:${emailText}`;
    }
  };

  return (
    <div
      className={`transition-all duration-[1000ms] ease-out absolute top-0 left-0 w-full h-full overflow-hidden`}
    >
      {/* Flat ivory background — no lavender shift at the bottom. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{ background: "#F0F0ED" }}
      />

      {/* SVG glow filter (expand filter area, primitiveUnits for relative lengths) */}
      <svg width="0" height="0" aria-hidden="true" className="contact-glow-svg">
        <defs>
          <filter
            id="contactGlow"
            x="-50%"
            y="-200%"
            width="200%"
            height="500%"
            primitiveUnits="objectBoundingBox"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.025 0.2" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="1.3" result="saturated" />
            <feBlend in="SourceGraphic" in2="saturated" />
          </filter>
        </defs>
      </svg>

      {/* Form + Location 2-column layout */}
      <ContactBody emailText={emailText} />
    </div>
  );
}

function ContactBody({ emailText }) {
  const addressEn =
    "146-37, Hwarang-ro 32-gil, Seongbuk-gu, Seoul, 02789, Republic of Korea";
  const addressKr =
    "서울특별시 성북구 화랑로32길 146-37(한국예술종합학교 석관동 캠퍼스)";
  const tel = "+82-2-746-9620";

  return (
    <div className="select-text text-[#0f0f13] absolute inset-0 z-[2] overflow-y-auto">
      <div className="w-full max-w-[var(--siteMaxWide)] mx-auto px-[var(--siteGutter)] pt-[10vh] pb-[14vh]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[3.5vw] gap-y-[6vh]">
          {/* Hiring */}
          <section>
            <div className="pb-1.5 mb-3">
              <h2
                className={`${pxGrotesk.className} tracking-[-0.03em] leading-[1.22] whitespace-nowrap text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem]`}
              >
                Hiring
              </h2>
            </div>
            <p style={{ fontFamily: mixedKrFont }} className={`${pretendardR.className} text-[#0f0f13] text-[15px] leading-[1.58] tracking-[-0.01em] font-[450] mb-1.5`}>
              cciD는 Tech, UX, Visual 트랙으로 대학생 및 기졸업자 대상 체험형 인턴을
              모집합니다. cciD가 축적해 온 공간 기반 고객 경험 설계, 디지털 프로덕트
              구현, 브랜드 및 인터랙션 디자인 역량을 바탕으로 Physical AI 시대의 새로운
              고객 경험을 함께 실험하고 실현하는 실무 참여형 프로그램입니다. cciD
              인턴십은 정해진 과제를 수동적으로 수행하는 역할이 아니라, 함께 문제를
              정의하고, 빠르게 프로토타입을 만들고, 현장 적용 가능성을 검증하는
              Holistic Process에 초점을 둡니다.
            </p>
            <p className={`${pxGrotesk.className} text-[#0f0f13] text-[15px] font-[380] leading-[1.3] tracking-[0] mb-2`}>
              Join us in shaping the future of design, intelligence, and human
              experience. We read every application, so show us your curiosity
              and your craft. Polished portfolios and works-in-progress are
              equally welcome.
            </p>
            <a
              href="https://ccid-26-summer.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-[#5D009C] mb-4 transition-colors hover:text-[#7a1fc0]"
            >
              See full hiring details
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </a>
          </section>

          {/* LOCATION */}
          <section>
            <div className="flex items-center justify-between pb-1.5 mb-3">
              <h2
                className={`${pxGrotesk.className} tracking-[-0.03em] leading-[1.22] whitespace-nowrap text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem]`}
              >
                Get in touch
              </h2>
            </div>
            <div className={`${pretendardR.className} flex flex-col gap-2.5 text-[15px] font-[450] leading-[1.58] tracking-[-0.01em]`}>
              <div>
                <div style={{ fontFamily: mixedKrFont }} className="text-[#0f0f13]">{addressKr}</div>
                <div className={`${pxGrotesk.className} text-[#0f0f13]`}>{addressEn}</div>
              </div>
              <div className="flex flex-col">
                <a
                  href={`tel:${tel.replace(/[^+\d]/g, "")}`}
                  className={`${pxGrotesk.className} text-[#0f0f13] hover:text-[#0f0f13] transition-colors`}
                >
                  {tel}
                </a>
                <a
                  href={`mailto:${emailText}`}
                  className={`${pxGrotesk.className} text-[#0f0f13] hover:text-[#0f0f13] transition-colors`}
                >
                  {emailText || "-"}
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
