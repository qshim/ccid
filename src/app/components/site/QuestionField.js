"use client";

// 히어로의 보라색 형상. 전에는 82개 path 가 든 252KB SVG 를 받아 왔지만,
// 지금은 캔버스에 직접 그린다 — 파일을 내려받지 않고, 크기에 따라 밀도가 조절되며,
// 천천히 도는 동안에도 형태가 뭉개지지 않는다.
//
// 토러스를 경선(tube 둘레)과 위선(중심축 둘레) 두 방향으로 모두 그어 그물로 만든다.
// 뒷면을 지우지 않는 것이 핵심이다 — 겹쳐 비치는 반투명 레이어가 천으로 뜬 구조물
// (서도호의 작업 같은) 인상을 만든다. 선이 겹칠수록 짙어지며 솔기처럼 드러난다.

import { useEffect, useRef } from "react";

const R = 1;        // 중심축 → tube 중심
const TUBE = 0.42;  // tube 반지름
const MERIDIANS = 132; // 튜브를 감는 고리 수 — 촘촘할수록 교차가 무늬를 만든다
const PARALLELS = 38; // 축을 감는 고리 수
const SEGMENTS = 132; // 고리 하나를 이루는 점
const TILT = (62 * Math.PI) / 180;

const point = (u, v) => {
  const cu = Math.cos(u), su = Math.sin(u);
  const cv = Math.cos(v), sv = Math.sin(v);
  const x = (R + TUBE * cv) * cu;
  const y = (R + TUBE * cv) * su;
  const z = TUBE * sv;
  // X축 기울기만 적용하고 원근은 약하게 — 형태를 읽되 납작해 보이지 않게.
  const yt = y * Math.cos(TILT) - z * Math.sin(TILT);
  const zt = y * Math.sin(TILT) + z * Math.cos(TILT);
  return [x, yt, zt];
};

export default function QuestionField() {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  // 포인터 기울기 — 기존 동작 유지.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const move = (e) => {
      if (reduce.matches || raf) return;
      raf = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--pointer-x", `${((e.clientX - box.left) / box.width - 0.5) * 14}deg`);
        el.style.setProperty("--pointer-y", `${-((e.clientY - box.top) / box.height - 0.5) * 12}deg`);
        raf = 0;
      });
    };
    const reset = () => {
      el.style.setProperty("--pointer-x", "0deg");
      el.style.setProperty("--pointer-y", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    let w = 0, h = 0, scale = 1, cx = 0, cy = 0;
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(box.width));
      h = Math.max(1, Math.round(box.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const projW = 2 * (R + TUBE);
      const projH = 2 * (R + TUBE) * Math.cos(TILT) + 2 * TUBE * Math.sin(TILT);
      scale = Math.min(w / (projW * 1.02), h / (projH * 1.04));
      cx = w / 2;
      cy = h / 2;
    };

    const stroke = (spin) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, h, w, 0);
      g.addColorStop(0, "#342264");
      g.addColorStop(0.5, "#7250c6");
      g.addColorStop(1, "#ac91db");
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.65;
      // 뒷면을 지우지 않는다 — 겹치는 선이 짙어지며 천처럼 비쳐 보인다.
      ctx.globalAlpha = 0.42;

      const project = (u, v) => {
        const [x, y] = point(u + spin, v);
        return [cx + x * scale, cy + y * scale];
      };

      ctx.beginPath();
      for (let i = 0; i < MERIDIANS; i++) {
        const u = (i / MERIDIANS) * Math.PI * 2;
        for (let s = 0; s <= SEGMENTS; s++) {
          const v = (s / SEGMENTS) * Math.PI * 2;
          const [px, py] = project(u, v);
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
      for (let j = 0; j < PARALLELS; j++) {
        const v = (j / PARALLELS) * Math.PI * 2;
        for (let s = 0; s <= SEGMENTS; s++) {
          const u = (s / SEGMENTS) * Math.PI * 2;
          const [px, py] = project(u, v);
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let spin = 0;
    let last = 0;
    let visible = true;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible || reduce.matches) {
        last = now;
        return;
      }
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      spin += dt * 0.000045; // 아주 느리게 — 눈에 띄는 회전이 아니라 숨 쉬는 정도
      stroke(spin);
    };

    fit();
    stroke(0);
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      fit();
      stroke(spin);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      host.classList.toggle("field-in-view", e.isIntersecting);
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="question-field" ref={hostRef}>
      <div className="field-grid" aria-hidden="true" />
      <div className="field-art" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
