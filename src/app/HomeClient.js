"use client";

import { useEffect, useRef, useState } from "react";
// import "./multilingual.css";
import Header from "./components/header/header";
import Nav from "./components/nav/nav";
import Navmobile from "./components/nav/navmobile";

import Cover from "./components/landing/cover";
import { neuehaas } from "@/fonts/fonts";
import ScrollFloat from "./components/common/ScrollFloat";
import GradFlowBackground from "./components/landing/GradFlowBackground";
import AboutIntro from "./components/about/_about";
import Works from "./components/works/works";
import Members from "./components/members";
import Contact from "./components/contact/contact";
import { sheetsStatic } from "./data/sheetsStatic";
import CoverAudio from "./components/common/CoverAudio";
import CustomCursor from "./components/cursor/cursor";

export default function HomeClient() {
  const mainRef = useRef(null);
  const currentSectionRef = useRef("cover");
  const lastStepTimeRef = useRef(0);
  const aboutLockTimeRef = useRef(0);
  const BASE_BG = "#f0f0ec"; // 기본 라이트(전체)
  const BASE_TEXT = "#0f0f13"; // 기본 블랙(전체)
  const BASE_BG_RGB = { r: 240, g: 240, b: 236 };
  const PEOPLE_PURPLE_RGB = { r: 224, g: 207, b: 239 };
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const peopleTintRgb = {
    r: lerp(BASE_BG_RGB.r, PEOPLE_PURPLE_RGB.r, 0.7),
    g: lerp(BASE_BG_RGB.g, PEOPLE_PURPLE_RGB.g, 0.7),
    b: lerp(BASE_BG_RGB.b, PEOPLE_PURPLE_RGB.b, 0.7),
  };
  const [worksBlend, setWorksBlend] = useState(0); // 0..1 (Works 섹션만)
  const [membersBlend, setMembersBlend] = useState(0); // 0..1 (People 섹션만)
  const [borderRadius, setBorderRadius] = useState(9999); // 초기값: rounded-full
  const [sectionOn, setSectionOn] = useState("cover");
  const [activeAboutId, setActiveAboutId] = useState("who");
  const [isAboutLocked, setIsAboutLocked] = useState(false);
  const [colorPalette] = useState(2);
  const [aboutStyle] = useState(2);
  const [aboutInfo, setAboutInfo] = useState(sheetsStatic?.about || []);
  const [coverBottomFade, setCoverBottomFade] = useState(0); // 0..1
  const [contactReveal, setContactReveal] = useState(0); // 0..1 (used to fade members->contact overlay)
  const [contactTopFade, setContactTopFade] = useState(1); // contact 상단 그라데이션 투명도
  const [brandRiser, setBrandRiser] = useState(false); // brand 상단 퍼플을 줄이는 밝은 웨이브
  const brandRiserTimerRef = useRef(null);
  // Heavy background = the 2nd/3rd stacked WebGL shader layers. Dropped on mobile
  // and for reduced-motion users to save GPU (one flowing layer still renders).
  const [heavyBg, setHeavyBg] = useState(true);
  // Cover parallax scrub: the cover is a tall (>100vh) section with a pinned
  // (sticky) stage. As you scroll its runway, the title leads (moves up faster)
  // and the gradient lags, so the intro stretches longer than one screen.
  const [parallaxOn, setParallaxOn] = useState(true);
  const coverTextRef = useRef(null);
  const COVER_RUNWAY_VH = 0.7; // extra scroll height above 100vh (= section is 170vh)
  // Scroll-driven brightening of the background shader's warm-grey tones. One
  // lift value per stacked layer; the back (base) layer leads and each layer
  // above it brightens a beat later, so the warmth rises through the stack as
  // you scroll (a scrubbing cascade). Read live by GradFlowBackground.
  const bgLiftBack = useRef(0); // z-[-4] base layer (brightens first)
  const bgLiftMid = useRef(0); // z-[-3]
  const bgLiftFront = useRef(0); // z-[-2] (brightens last)
  const BG_LIFT_MAX = 0.55;
  // Play the cascade across the cover's pinned scrub (~0.7vh) where the shader is
  // fully visible; past that the purple blend covers the warm-grey bands anyway.
  const BG_LIFT_SPAN_VH = 0.7;
  const ABOUT_ORDER = ["who", "sectors", "methodology"];
  const ABOUT_INITIAL_LOCK_MS = 900; // 최소 이 시간 동안은 항상 "Who We Are"를 먼저 보여줌
  const ABOUT_STEP_COOLDOWN_MS = 420;

  // 뷰포트 높이에 가까운 섹션만: 긴 스크롤(Works/Members)에 쓰면 마스크가 문서 전체 높이 기준이라 상단 제목까지 페이드됨
  const SCROLL_CONTENT_EDGE_MASK = {
    WebkitMaskImage:
      "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 3.5%, rgba(0,0,0,0.5) 7%, rgba(0,0,0,1) 11%, rgba(0,0,0,1) 100%)",
    maskImage:
      "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 3.5%, rgba(0,0,0,0.5) 7%, rgba(0,0,0,1) 11%, rgba(0,0,0,1) 100%)",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  };

  // OS-specific layout vars (mac desktop: fixed 80px gutters like Figma).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isAppleDesktop = /Mac/i.test(platform) || /Mac OS X/i.test(ua);

    const applyLayoutVars = () => {
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      const useMacFixedGutter = isAppleDesktop && !isMobile;

      document.documentElement.style.setProperty("--siteGutter", useMacFixedGutter ? "80px" : "1rem");
      // On mac desktop, force fixed 80px gutters by allowing container to expand with viewport.
      document.documentElement.style.setProperty("--siteMax", useMacFixedGutter ? "calc(100vw - 160px)" : "80rem");
      document.documentElement.style.setProperty(
        "--siteMaxWide",
        useMacFixedGutter ? "calc(100vw - 160px)" : "calc(80rem + 60px)"
      );
    };

    applyLayoutVars();
    window.addEventListener("resize", applyLayoutVars);
    return () => window.removeEventListener("resize", applyLayoutVars);
  }, []);

  useEffect(() => {
    setAboutInfo(sheetsStatic?.about || []);
  }, []);

  // Decide how many flowing shader layers to render (perf + reduced-motion).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mobileQ = window.matchMedia("(max-width: 639px)");
    const reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setHeavyBg(!mobileQ.matches && !reduceQ.matches);
      setParallaxOn(!reduceQ.matches);
    };
    apply();
    mobileQ.addEventListener("change", apply);
    reduceQ.addEventListener("change", apply);
    return () => {
      mobileQ.removeEventListener("change", apply);
      reduceQ.removeEventListener("change", apply);
    };
  }, []);

  // Cover: bottom white gradient should appear only after the first scroll.
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    let raf = 0;
    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const smoothstep01 = (t) => {
      const x = clamp01(t);
      return x * x * (3 - 2 * x);
    };
    const prefersReduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      raf = 0;
      const st = mainEl.scrollTop || 0;

      // Cover parallax scrub: within the pinned runway (0 → 70vh of scroll), the
      // title leads up (~28vh) against the (fixed) flowing background, so the intro
      // stretches longer than one screen. Written straight to the DOM (no React
      // state) so it stays smooth. Disabled for reduced-motion. The cover→brand
      // blend gradient is intentionally NOT parallaxed — it lives at the section
      // bottom so the handoff to brand stays seamless (no floating mid-scroll band).
      if (!prefersReduce && coverTextRef.current) {
        const vh = mainEl.clientHeight || 1;
        const runway = vh * COVER_RUNWAY_VH;
        const p = clamp01(runway > 0 ? st / runway : 0);
        const eased = smoothstep01(p);
        coverTextRef.current.style.transform = `translate3d(0, ${(-eased * vh * 0.28).toFixed(1)}px, 0)`;
      }

      // Background warm-grey brightening cascade (bottom/back layer first, then
      // up through the stack) driven by scroll over BG_LIFT_SPAN_VH viewports.
      if (!prefersReduce) {
        const vh = mainEl.clientHeight || 1;
        const pAll = clamp01(st / (vh * BG_LIFT_SPAN_VH));
        // Each layer ramps over its own staggered window so they brighten in turn.
        const seg = (a, b) => smoothstep01(clamp01((pAll - a) / (b - a)));
        bgLiftBack.current = seg(0.0, 0.55) * BG_LIFT_MAX;
        bgLiftMid.current = seg(0.2, 0.75) * BG_LIFT_MAX;
        bgLiftFront.current = seg(0.4, 0.95) * BG_LIFT_MAX;
      }

      // Dissolve should:
      // - be invisible at the very top
      // - kick in quickly on first scroll
      // Note: the overlay is positioned inside the cover section, so it naturally disappears
      // once the cover scrolls out of view (no separate fade-out needed).
      const t = smoothstep01(st <= 0 ? 0 : st / 120);
      setCoverBottomFade(t);

      // Contact 섹션: 스크롤이 맨 아래에 가까워지면 상단 흰 그라데이션을 서서히 숨김
      const scrollMax = (mainEl.scrollHeight || 0) - (mainEl.clientHeight || 0);
      if (scrollMax <= 0) {
        setContactTopFade(1);
      } else {
        const bottomRatio = clamp01(st / scrollMax); // 0=맨 위, 1=맨 아래
        // 마지막 10% 구간에서만 서서히 사라지도록 매핑
        const hideT = clamp01((bottomRatio - 0.9) / 0.1);
        setContactTopFade(1 - hideT);
      }
    };

    // Robust active-section detection from scroll position, run synchronously on
    // every scroll event (not via rAF, which can be throttled). The
    // IntersectionObserver can miss updates (fast scrolls, programmatic jumps),
    // which would leave the nav stuck in its "cover" color on light sections.
    // Pick the section whose span contains the viewport center.
    const detectSection = () => {
      const st = mainEl.scrollTop || 0;
      const viewCenter = st + (mainEl.clientHeight || 0) / 2;
      let activeId = currentSectionRef.current;
      mainEl.querySelectorAll("section").forEach((sec) => {
        if (!sec.id) return;
        const top = sec.offsetTop;
        if (viewCenter >= top && viewCenter < top + sec.offsetHeight) {
          activeId = sec.id;
        }
      });
      if (activeId && activeId !== currentSectionRef.current) {
        currentSectionRef.current = activeId;
        setSectionOn(activeId);
      }
    };
    const onScroll = () => {
      detectSection();
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    onScroll();
    mainEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      mainEl.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const sections = mainEl.querySelectorAll("section");
    const ratioById = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        // Track intersection ratio per section and choose the most visible one.
        entries.forEach((entry) => {
          const id = entry?.target?.id;
          if (!id) return;
          ratioById.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = currentSectionRef.current;
        let bestRatio = ratioById.get(bestId) ?? 0;
        ratioById.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        // Ignore tiny intersections (prevents jitter at boundaries)
        if (!bestId || bestRatio < 0.15) return;
        if (bestId === currentSectionRef.current) return;

        currentSectionRef.current = bestId;
        setSectionOn(bestId);
      },
      {
        threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75],
        root: mainEl,
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      ratioById.clear();
    };
  }, []);

  // Smooth background transition when entering/leaving the People section (no hard cut, no flicker).
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const membersSection = mainEl.querySelector("#members");
    if (!membersSection) return;

    const clamp01 = (n) => Math.max(0, Math.min(1, n));

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Use intersection ratio to blend colors smoothly.
        // We start blending after a small entry to avoid jitter at the boundary.
        const raw = entry?.intersectionRatio ?? 0;
        // Spread the transition a bit more so it feels more gradual.
        const t = clamp01((raw - 0.03) / 0.55);
        setMembersBlend(t);
      },
      { threshold: thresholds, root: mainEl } // main 스크롤 기준
    );

    observer.observe(membersSection);
    return () => observer.disconnect();
  }, []);

  // Smooth background transition when entering/leaving the Works section (match People behavior).
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const worksSection = mainEl.querySelector("#works");
    if (!worksSection) return;

    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const raw = entry?.intersectionRatio ?? 0;
        const t = clamp01((raw - 0.03) / 0.55);
        setWorksBlend(t);
      },
      { threshold: thresholds, root: mainEl } // main 스크롤 기준
    );

    observer.observe(worksSection);
    return () => observer.disconnect();
  }, []);

  // Contact reveal ratio within the main scroll container (used for members->contact dissolve).
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const contactSection = mainEl.querySelector("#contact");
    if (!contactSection) return;

    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const raw = entry?.intersectionRatio ?? 0;
        // Make it react early, but reach 1 only when contact is mostly visible.
        const t = clamp01((raw - 0.02) / 0.55);
        setContactReveal(t);
      },
      { threshold: thresholds, root: mainEl }
    );

    observer.observe(contactSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const contactSection = document.querySelector("#contact");

    if (!contactSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.requestAnimationFrame(() => {
          const ratio = Math.min(entry.intersectionRatio, 0.8);
          const maxRadius = 9999; // rounded-full (최대)
          const mappedRadius = Math.round(maxRadius * (1 - ratio / 0.8));

          setBorderRadius(mappedRadius); // 상태 업데이트
        });
      },
      { threshold: Array.from({ length: 9 }, (_, i) => i * 0.1) }
    );

    observer.observe(contactSection);

    return () => observer.unobserve(contactSection);
  }, []);

  // Brand section: 1.8s after it comes into view, a lighter wave rises from the
  // bottom over ~3.8s, receding the purple top. Resets when it leaves view so it
  // replays on every entry.
  useEffect(() => {
    const mainEl = mainRef.current;
    const brandSection = (mainEl || document).querySelector("#brand");
    if (!brandSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = (entry?.intersectionRatio ?? 0) > 0.6;
        if (inView) {
          if (brandRiserTimerRef.current == null) {
            brandRiserTimerRef.current = window.setTimeout(() => {
              setBrandRiser(true);
            }, 1800);
          }
        } else {
          if (brandRiserTimerRef.current != null) {
            clearTimeout(brandRiserTimerRef.current);
            brandRiserTimerRef.current = null;
          }
          setBrandRiser(false);
        }
      },
      { threshold: [0, 0.6, 1], root: mainEl || null }
    );

    observer.observe(brandSection);
    return () => {
      observer.disconnect();
      if (brandRiserTimerRef.current != null) {
        clearTimeout(brandRiserTimerRef.current);
        brandRiserTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-[100%] absolute scrollbar-hide bg-white z-[-2] overflow-x-hidden">
      <CustomCursor />
      {/* Background audio disabled (no sound on the site). */}
      {/* <CoverAudio sectionOn={sectionOn} src="/audio/design-intelligence-loops.mp3" /> */}
      <Header sectionOn={sectionOn} />
      <Nav
        sectionOn={sectionOn}
        onNavigate={(nextSection) => {
          const target = nextSection || "cover";
          currentSectionRef.current = target;
          setSectionOn(target);
        }}
      />

      <Navmobile sectionOn={sectionOn} />

      <div
        style={{
          transition: "opacity 1.5s ease-in-out",
          opacity: sectionOn === "cover" || sectionOn === "brand" ? "1" : "0",
          top: 0,
          visibility:
            sectionOn === "cover" || sectionOn === "brand" || sectionOn === "about"
              ? "visible"
              : "hidden",
        }}
        className="left-0 fixed z-[-5] bg-[url('/img/bgt.png')] bg-repeat bg-contain bg-center w-full h-[118dvh]"
      />
      {/* Three stacked flowing-gradient layers (Alex Harri shader), no blobs:
          a light base + two purple flowing layers blended on top for depth. */}
      <div
        style={{
          transition: "opacity 1.5s ease-in-out",
          opacity: sectionOn === "cover" || sectionOn === "brand" ? 1 : 0,
          top: 0,
          visibility: sectionOn === "cover" || sectionOn === "brand" ? "visible" : "hidden",
        }}
        className="left-0 fixed z-[-4] w-full h-[118dvh] pointer-events-none"
      >
        <GradFlowBackground
          className="w-full h-full"
          amp={0.5}
          contrast={1.18}
          noiseScale={0.45}
          wave1Y={0.42}
          wave2Y={0.72}
          phase={16192.0}
          liftRef={bgLiftBack}
          stops={["#2E1585", "#4E22D6", "#6E3DEE", "#B5ABA0", "#CCC4B8"]}
        />
      </div>
      {heavyBg && (
        <div
          style={{
            transition: "opacity 1.5s ease-in-out",
            opacity: sectionOn === "cover" || sectionOn === "brand" ? 0.6 : 0,
            top: 0,
            visibility: sectionOn === "cover" || sectionOn === "brand" ? "visible" : "hidden",
            mixBlendMode: "multiply",
          }}
          className="left-0 fixed z-[-3] w-full h-[118dvh] pointer-events-none"
        >
          <GradFlowBackground
            className="w-full h-full"
            amp={0.45}
            contrast={1.15}
            noiseScale={0.4}
            wave1Y={0.32}
            wave2Y={0.62}
            phase={8421.0}
            liftRef={bgLiftMid}
            stops={["#2a1466", "#3d1f9e", "#5a2fd6", "#7c3aed", "#A99C8E", "#CCC4B8"]}
          />
        </div>
      )}
      {heavyBg && (
        <div
          style={{
            transition: "opacity 1.5s ease-in-out",
            opacity: sectionOn === "cover" || sectionOn === "brand" ? 0.45 : 0,
            top: 0,
            visibility: sectionOn === "cover" || sectionOn === "brand" ? "visible" : "hidden",
            mixBlendMode: "multiply",
          }}
          className="left-0 fixed z-[-2] w-full h-[118dvh] pointer-events-none"
        >
          <GradFlowBackground
            className="w-full h-full"
            amp={0.5}
            contrast={1.2}
            noiseScale={0.5}
            wave1Y={0.5}
            wave2Y={0.85}
            phase={24310.0}
            liftRef={bgLiftFront}
            stops={["#2a1466", "#3d1f9e", "#5a2fd6", "#7c3aed", "#A99C8E", "#CCC4B8"]}
          />
        </div>
      )}
      {/* Base background layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[-10]"
        style={{ background: BASE_BG }}
      />
      <main
        ref={mainRef}
        style={{
          background: "transparent",
          color: BASE_TEXT,
          borderColor: BASE_TEXT,
        }}
        className="relative scrollbar-hide z-10 h-[100dvh] w-[100%] overflow-y-scroll snap-y snap-proximity"
      >
        {/* Members -> Contact dissolve overlay (visible only while in Members) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 right-0 bottom-0 z-[12] h-[7vh] md:h-[9vh]"
          style={{
            opacity: Math.max(0, Math.min(1, membersBlend)) * (1 - contactReveal),
            transition: "opacity 420ms cubic-bezier(0.16, 1, 0.3, 1)",
            maskImage:
              "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0) 100%)",
            background:
              "linear-gradient(to top, rgba(240,240,236,0) 0%, rgba(240,240,236,0.06) 40%, rgba(240,240,236,0.18) 100%)",
          }}
        />
        <section
          id="cover"
          className="relative z-[11] w-full"
          style={{
            height: parallaxOn ? `calc(100dvh + ${Math.round(COVER_RUNWAY_VH * 100)}dvh)` : "100dvh",
          }}
        >
          {/* Pinned stage: stays put across the runway so the scroll can scrub the
              parallax instead of just translating the whole section 1:1. */}
          <div className="sticky top-0 h-[100dvh] w-full overflow-hidden flex items-start justify-start">
            {/* Mask stays off text wrapper — same-node mask can clip descenders (g, j, p, y) in WebKit. */}
            <div
              ref={coverTextRef}
              className="relative z-10 w-full max-w-[var(--siteMax)] mx-auto pr-[var(--siteGutter)] pl-[var(--siteGutter)] md:pl-[calc(var(--siteGutter)*0.6)] lg:pl-0 [will-change:transform]"
            >
              <Cover textColor={BASE_TEXT} />
            </div>
          </div>
          {/* Bottom gradient: the brand section's purple, 0% -> 100% opacity, pinned
              to the SECTION bottom (right above brand) — not inside the pinned stage
              and never parallaxed — so the cover→brand handoff stays seamless. During
              the scrub it sits off-screen below the fold (the flowing background is
              continuous), and only appears as the clean blend at the handoff. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[3px] left-0 w-full h-[22vh] md:h-[26vh] z-[5]"
            style={{
              background:
                // easing-gradient (ease-in-out) — smooth transparent->solid, no banding
                "linear-gradient(to bottom, rgba(78,34,214,0) 0%, rgba(78,34,214,0.013) 8.1%, rgba(78,34,214,0.049) 15.5%, rgba(78,34,214,0.104) 22.5%, rgba(78,34,214,0.175) 29%, rgba(78,34,214,0.259) 35.3%, rgba(78,34,214,0.352) 41.2%, rgba(78,34,214,0.45) 47.1%, rgba(78,34,214,0.55) 52.9%, rgba(78,34,214,0.648) 58.8%, rgba(78,34,214,0.741) 64.7%, rgba(78,34,214,0.825) 71%, rgba(78,34,214,0.896) 77.5%, rgba(78,34,214,0.951) 84.5%, rgba(78,34,214,0.987) 91.9%, rgba(78,34,214,1) 100%)",
            }}
          />
        </section>
        <section
          id="brand"
          className="relative z-10 w-[100%] h-[62dvh] lg:h-[100dvh] -mt-px pt-px snap-start flex items-center justify-center overflow-hidden"
        >
          {/* Base: opaque lavender -> ivory (never transparent, so the section
              can't reveal the page background as a band). */}
          <div
            aria-hidden="true"
            className="absolute -top-px inset-x-0 bottom-0 z-0"
            style={{
              background:
                "linear-gradient(to bottom, #E0E0FF 0%, #E6E6FB 22%, #F0F0ED 60%, #F0F0ED 100%)",
            }}
          />
          {/* Blue top: the cover's purple-blue at 100%, fixed (no animation),
              fading down into the lavender base. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-px inset-x-0 z-[1] h-[60%]"
            style={{
              background:
                // easing-gradient (ease-in-out), no flat plateau -> no slope-change
                // band: solid at top, smoothly easing all the way to transparent.
                "linear-gradient(to bottom, #4E22D6 0%, rgba(78,34,214,0.987) 5.6%, rgba(78,34,214,0.951) 11.4%, rgba(78,34,214,0.896) 17.2%, rgba(78,34,214,0.825) 22.6%, rgba(78,34,214,0.741) 27.7%, rgba(78,34,214,0.648) 32.6%, rgba(78,34,214,0.55) 37.4%, rgba(78,34,214,0.45) 42.6%, rgba(78,34,214,0.352) 47.4%, rgba(78,34,214,0.259) 52.3%, rgba(78,34,214,0.175) 57.4%, rgba(78,34,214,0.104) 62.8%, rgba(78,34,214,0.049) 68.6%, rgba(78,34,214,0.013) 74.4%, rgba(78,34,214,0) 80%)",
            }}
          />
          {/* Lighter wave: rises from the bottom 1.8s after entering, over ~3.8s,
              receding the purple top. Soft transparent leading edge so it reads as
              light rising rather than a hard line. Below the cciD text (z-10). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
            style={{
              height: brandRiser ? "90%" : "0%",
              transition: "height 3800ms cubic-bezier(0.22, 1, 0.36, 1)",
              background:
                // Long, eased alpha tail at the top so the rising leading edge has
                // no defined line — it reads as light softly bleeding upward.
                "linear-gradient(to top, #F0F0ED 0%, #F0F0ED 12%, rgba(237,237,243,0.97) 20%, rgba(233,233,246,0.9) 28%, rgba(230,230,248,0.8) 36%, rgba(228,228,250,0.68) 44%, rgba(226,226,251,0.55) 52%, rgba(225,225,252,0.42) 60%, rgba(224,224,253,0.29) 68%, rgba(224,224,254,0.18) 76%, rgba(224,224,255,0.09) 84%, rgba(224,224,255,0.03) 92%, rgba(224,224,255,0) 100%)",
            }}
          />
          <ScrollFloat
            scrollContainerRef={mainRef}
            animationDuration={1}
            ease="back.inOut(2)"
            scrollStart="center bottom+=50%"
            scrollEnd="bottom bottom-=40%"
            stagger={0.03}
            containerClassName={`${neuehaas.className} relative z-10 select-none text-[#5D009C] leading-none tracking-[-0.04em]`}
            textClassName="text-[34vw] md:text-[26vw] lg:text-[22vw] leading-none"
          >
            cciD
          </ScrollFloat>
        </section>
        <section
          id="about"
          data-section="about"
          className="relative z-10 w-[100%]"
        >
          {/* Continuous vertical gradient across all three about blocks.
              Extends a few px above the section top (about paints after brand) so
              the brand↔about boundary is covered by ivory — no 1px white seam. */}
          <div
            className="absolute left-0 -top-[6px] bottom-0 right-0 z-0"
            style={{
              background: "linear-gradient(180deg, #F0F0ED 0%, #F0F0ED 40%, #E6E6FB 78%, #E0E0FF 100%)",
            }}
          />
          <div className="relative z-10 w-full">
            <AboutIntro />
          </div>
        </section>
        <section
          id="works"
          style={{
            backgroundColor: "#E0E0FF",
            // Bridge the about↔works boundary with the same lavender (no white seam).
            boxShadow: "0 -6px 0 0 #E0E0FF",
          }}
          className="transition-all duration-1000 lg:content-center w-full relative z-10 min-h-[100dvh] [@media(max-height:760px)]:min-h-0 snap-start flex justify-center items-start pt-8 pb-4 sm:pt-12 sm:pb-6 lg:pb-8 overflow-visible"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-[10vh] z-10"
            style={{
              background:
                "linear-gradient(to bottom, rgba(224,224,255,0.85) 0%, rgba(224,224,255,0.7) 55%, rgba(224,224,255,0.98) 100%)",
            }}
          />
          <div className="relative z-20 w-full max-w-[var(--siteMaxWide)] px-[var(--siteGutter)] mx-auto">
            <Works textColor={BASE_TEXT} sectionOn={sectionOn} />
          </div>
        </section>
        <section
          id="members"
          style={{
            backgroundColor: "#F0F0EC",
            color: BASE_TEXT,
          }}
          className="relative z-10 w-[100%] min-h-[100dvh] [@media(max-height:760px)]:min-h-0 snap-start flex justify-center items-start pt-[5.5rem] pb-8 sm:pb-10 lg:pb-12 overflow-visible"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(220,220,255,0.78) 0%, rgba(220,220,255,0.48) 40%, rgba(220,220,255,0.2) 70%, rgba(240,240,236,0) 100%)",
            }}
          />
          <div className="relative z-10 w-full max-w-[var(--siteMaxWide)] px-[var(--siteGutter)] mx-auto">
            <Members />
          </div>
        </section>
        <section
          id="contact"
          className="relative z-10 w-[100%] h-[100dvh] snap-end overflow-hidden"
        >
          <div className="relative z-10 h-full">
            <Contact borderRadius={borderRadius} sectionOn={sectionOn} colorPalette={colorPalette} />
          </div>
          <footer className="absolute bottom-0 left-0 z-20 w-full pb-3 md:pb-6">
            <div className="w-full max-w-[var(--siteMaxWide)] mx-auto px-[var(--siteGutter)] text-center lg:text-left">
              {/* Mobile: large centered cciD mark */}
              <div
                className={`lg:hidden ${neuehaas.className} select-none text-[#5D009C] leading-none tracking-[-0.04em] text-[17vw] md:text-[13vw]`}
              >
                cciD
              </div>
              {/* Desktop: full name, aligned with the Hiring column */}
              <div
                className={`hidden lg:block ${neuehaas.className} select-none text-[#5D009C] leading-[1.05] tracking-[-0.03em] text-[1.7vw]`}
              >
                cciD Center for Creative Intelligence Design
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}




