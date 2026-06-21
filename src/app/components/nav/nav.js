"use client";
import LanguageToggle from "./lang";
import { programme } from "@/fonts/fonts";
import { useState, useRef, useEffect, useLayoutEffect } from "react";

const sections = ["cover", "about", "works", "members", "contact"];

export default function Nav({ sectionOn, onNavigate }) {
  const [boxPosition, setBoxPosition] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  const [boxTop, setBoxTop] = useState(0);
  const [boxHeight, setBoxHeight] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);
  const linkRefs = useRef([]);
  const pendingSectionRef = useRef(null);
  const pendingClearTimerRef = useRef(null);

  const calculatePositionAndWidth = (index) => {
    const linkElement = linkRefs.current[index];
    if (linkElement) {
      const linkWidth = linkElement.offsetWidth;
      const linkOffsetLeft = linkElement.offsetLeft;
      const linkHeight = linkElement.offsetHeight;
      const linkOffsetTop = linkElement.offsetTop;
      const remToPx = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      );
      const additionalWidth = 2 * remToPx;
      const additionalHeight = 0.35 * remToPx;

      return {
        position: linkOffsetLeft - 1 * remToPx, // Adjust position by subtracting 0.75rem
        width: linkWidth + additionalWidth,
        top: linkOffsetTop - additionalHeight / 2,
        height: linkHeight + additionalHeight,
      };
    }
    return { position: 0, width: 0, top: 0, height: 0 }; // Default fallback
  };

  // Set initial position and width based on sectionOn (synchronous, before paint).
  // Skip while a click target is pending — keeps box at the clicked target
  // until the smooth scroll fully settles (pending is cleared via timeout).
  useLayoutEffect(() => {
    if (pendingSectionRef.current !== null) {
      return;
    }
    const index = sections.indexOf(sectionOn);
    if (index === -1) return;
    const { position, width, top, height } = calculatePositionAndWidth(index);
    setBoxPosition(position);
    setBoxWidth(width);
    setBoxTop(top);
    setBoxHeight(height);
  }, [sectionOn]);

  // Enable transitions only after first paint with the measured position.
  useEffect(() => {
    const rafId = requestAnimationFrame(() => setHasMeasured(true));
    return () => {
      cancelAnimationFrame(rafId);
      if (pendingClearTimerRef.current) {
        clearTimeout(pendingClearTimerRef.current);
        pendingClearTimerRef.current = null;
      }
    };
  }, []);

  // Re-measure on resize (font/layout changes)
  useEffect(() => {
    const onResize = () => resetToSection();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sectionOn]);

  const handleHover = (e, index) => {
    setIsHovered(true);
    const { position, width, top, height } = calculatePositionAndWidth(index);
    setBoxPosition(position);
    setBoxWidth(width);
    setBoxTop(top);
    setBoxHeight(height);
  };

  const handleClick = (index, id) => {
    const { position, width, top, height } = calculatePositionAndWidth(index);
    setIsHovered(true);
    setBoxPosition(position);
    setBoxWidth(width);
    setBoxTop(top);
    setBoxHeight(height);
    pendingSectionRef.current = sections[index] || null;
    if (pendingClearTimerRef.current) {
      clearTimeout(pendingClearTimerRef.current);
    }
    if (typeof onNavigate === "function") {
      const cleanId = String(id || "").replace("#", "");
      onNavigate(cleanId);
    }
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
    // Hold the pending lock long enough for the smooth scroll + IntersectionObserver
    // settling so intermediate sections don't pull the box away from the click target.
    pendingClearTimerRef.current = window.setTimeout(() => {
      pendingSectionRef.current = null;
      pendingClearTimerRef.current = null;
    }, 1100);
  };

  const resetToSection = () => {
    const target = pendingSectionRef.current || sectionOn;
    const index = sections.indexOf(target);
    if (index !== -1) {
      const { position, width, top, height } = calculatePositionAndWidth(index);
      setBoxPosition(position);
      setBoxWidth(width);
      setBoxTop(top);
      setBoxHeight(height);
    }
  };

  const showBox = hasMeasured && (isHovered || sections.includes(sectionOn));
  // White on the cover (top); fades to black on the sections below.
  const isCover = sectionOn === "cover";

  return (
    <div
      className={`${programme.className} text-primaryB hidden lg:block z-[500]`}
    >
      <ul className=" z-[500] font-[300] leading-tight lg:text-[1.2vw] fixed top-0 left-0 right-0 pt-4 pb-3 mx-auto w-[100%] transition-all duration-300 transform">
        <LanguageToggle sectionOn={sectionOn} />

        <div
          className="group relative z-[500] gap-12 4xl:gap-20 lg:flex justify-center w-fit mx-auto"
          onMouseLeave={() => {
            setIsHovered(false);
            resetToSection();
          }}
        >
          <span
            className={`select-none pointer-events-none box-border z-[-1] absolute px-2 border-[.12vw] ${
              showBox ? "opacity-100" : "opacity-0"
            } ${isCover ? "border-primaryW/70" : "border-primaryB/60"}`}
            style={{
              height: `${boxHeight}px`,
              width: `${boxWidth}px`,
              left: `${boxPosition}px`,
              top: `${boxTop}px`,
              transition: hasMeasured
                ? "left 220ms cubic-bezier(0.4, 0, 0.2, 1), top 220ms cubic-bezier(0.4, 0, 0.2, 1), width 220ms cubic-bezier(0.4, 0, 0.2, 1), height 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out"
                : "none",
            }}
          ></span>
          {[
            { id: "#cover", label: "intro" },
            { id: "#about", label: "about" },
            { id: "#works", label: "works" },
            { id: "#members", label: "people" },
            { id: "#contact", label: "contact" },
          ].map(({ id, label }, index) => (
            <li
              key={id}
              onMouseEnter={(e) => handleHover(e, index)}
            >
              <a
                href={id}
                ref={(el) => (linkRefs.current[index] = el)}
                className={`transition-all mx-3 duration-300 ${
                  index === 0 ? "pl-[3px] " : ""
                }${
                  isCover
                    ? "text-primaryW opacity-90 hover:opacity-100"
                    : "text-primaryB opacity-70 hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(index, id);
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </div>
      </ul>
    </div>
  );
}
