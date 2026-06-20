"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    const state = {
      tx: window.innerWidth / 2,
      ty: window.innerHeight / 2,
      cx: window.innerWidth / 2,
      cy: window.innerHeight / 2,
      tScale: 0.2,
      cScale: 0.2,
      visible: false,
      cOpacity: 0,
      tOpacity: 0,
    };

    const handleMove = (e) => {
      state.tx = e.clientX;
      state.ty = e.clientY;
      if (!state.visible) {
        state.visible = true;
        state.tOpacity = 1;
        state.cx = e.clientX;
        state.cy = e.clientY;
      }
    };

    const handleLeave = () => {
      state.tOpacity = 0;
    };

    const handleEnter = () => {
      state.tOpacity = 1;
    };

    const handleHoverIn = () => {
      state.tScale = 0.55;
    };
    const handleHoverOut = () => {
      state.tScale = 0.2;
    };

    let rafId;
    const tick = () => {
      const lerp = 0.2;
      state.cx += (state.tx - state.cx) * lerp;
      state.cy += (state.ty - state.cy) * lerp;
      state.cScale += (state.tScale - state.cScale) * 0.18;
      state.cOpacity += (state.tOpacity - state.cOpacity) * 0.2;
      cursor.style.transform = `translate(-50%, -50%) translate3d(${state.cx}px, ${state.cy}px, 0) scale(${state.cScale})`;
      cursor.style.opacity = String(state.cOpacity);
      rafId = requestAnimationFrame(tick);
    };

    const HOVER_SELECTOR = 'a, button, [role="button"], input, textarea, select, label[for]';
    const attachHovers = () => {
      const els = document.querySelectorAll(HOVER_SELECTOR);
      els.forEach((el) => {
        el.addEventListener("pointerenter", handleHoverIn);
        el.addEventListener("pointerleave", handleHoverOut);
      });
      return els;
    };

    let hoverEls = attachHovers();
    const observer = new MutationObserver(() => {
      hoverEls.forEach((el) => {
        el.removeEventListener("pointerenter", handleHoverIn);
        el.removeEventListener("pointerleave", handleHoverOut);
      });
      hoverEls = attachHovers();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerleave", handleLeave);
    document.addEventListener("pointerenter", handleEnter);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
      document.removeEventListener("pointerenter", handleEnter);
      hoverEls.forEach((el) => {
        el.removeEventListener("pointerenter", handleHoverIn);
        el.removeEventListener("pointerleave", handleHoverOut);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 120,
        height: 120,
        borderRadius: "50%",
        pointerEvents: "none",
        background: "#5D009C",
        mixBlendMode: "multiply",
        zIndex: 9999,
        opacity: 0,
        transform: "translate(-50%, -50%) translate3d(-200px, -200px, 0) scale(0.2)",
        willChange: "transform, opacity",
      }}
    />
  );
}
