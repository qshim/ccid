"use client";

// 타자기 + 디코드 연출. 두 가지 계기로 돈다.
//  1) 언어 전환 — text 가 바뀌면 다시 푼다.
//  2) onView — 스크롤로 화면에 처음 들어올 때 한 번 푼다 (섹션 타이틀용).
//
// 글자 풀은 두 가지 규칙을 지킨다.
//  · 라틴은 A–Z, a–z 만 쓴다 (특수기호·숫자 없음).
//  · 한글은 완성형 음절(U+AC00–U+D7A3)에서만 고른다. 이 구간은 초·중·종성이
//    이미 조합된 글자들이라 "ㄱㅏ" 같은 깨진 낱자가 절대 나오지 않는다.
// 공백과 문장부호는 스크램블 대상에서 빼, 줄 길이와 단어 경계가 흔들리지 않게 한다.

import { useEffect, useRef, useState } from "react";

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const HANGUL_BASE = 0xac00;
const HANGUL_COUNT = 0xd7a3 - 0xac00 + 1; // 11,172자 — 전부 읽을 수 있는 음절

const isHangulSyllable = (ch) => {
  const c = ch.codePointAt(0);
  return c >= HANGUL_BASE && c <= 0xd7a3;
};
const isScrambleable = (ch) => /[A-Za-z]/.test(ch) || isHangulSyllable(ch);
const randomLatin = () => LATIN[Math.floor(Math.random() * LATIN.length)];
const randomHangul = () =>
  String.fromCodePoint(HANGUL_BASE + Math.floor(Math.random() * HANGUL_COUNT));
// 같은 종류로만 바꿔치기 — 한글 자리에 라틴이 끼어들면 줄 폭이 튄다.
const scrambleFor = (ch) => (isHangulSyllable(ch) ? randomHangul() : randomLatin());

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// 길이에 따라 두 가지 방식으로 푼다.
//  · 긴 글(문단)은 단어 단위로 훑는다 — 낱자로 하면 한 문단에 수십 초가 걸린다.
//  · 짧은 글(제목·선언)은 낱자 단위로 푼다 — 글자가 하나씩 맞춰지는 맛이 산다.
// 어느 쪽이든 전체 소요를 목표 시간(LONG_MS / SHORT_MS)에 맞춰 간격을 역산하므로,
// 문장이 길어져도 끝나는 시점은 비슷하다.
const WORD_MODE_OVER = 60; // 글자 수 기준
const LONG_MS = 3400;      // 문단 전체가 풀리는 목표 시간
const SHORT_MS = 1500;

export default function DecodeText({ text, onView = false, className }) {
  const [shown, setShown] = useState(text);
  const [armed, setArmed] = useState(!onView);
  const hostRef = useRef(null);
  const first = useRef(true);
  const raf = useRef(0);
  const timer = useRef(0);

  // onView: 처음 화면에 들어올 때 한 번만 무장한다.
  useEffect(() => {
    if (!onView || armed) return;
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onView, armed]);

  useEffect(() => {
    if (!armed) return;

    // 언어가 아직 안 바뀐 첫 렌더에서는, onView 가 아니면 연출하지 않는다.
    if (first.current) {
      first.current = false;
      if (!onView) {
        setShown(text);
        return;
      }
    }
    if (prefersReducedMotion()) {
      setShown(text);
      return;
    }

    const wordMode = text.length > WORD_MODE_OVER;
    // 단어 모드에서는 공백도 하나의 단위로 둔다 — 단어 경계와 줄바꿈이 유지된다.
    const units = wordMode ? text.split(/(\s+)/).filter((u) => u !== "") : Array.from(text);
    const trail = wordMode ? 3 : 10;
    const scrambleMs = wordMode ? 42 : 58;
    // 목표 시간을 단위 수로 나눠 간격을 정한다. 너무 빨라 깜빡이거나(14ms 미만)
    // 너무 느려 늘어지지(90ms 초과) 않도록 양끝을 막는다.
    const target = wordMode ? LONG_MS : SHORT_MS;
    const step = Math.min(90, Math.max(14, Math.round(target / Math.max(1, units.length))));

    let settled = 0;
    let lastScramble = 0;
    let frozen = [];

    const scrambleUnit = (u) =>
      Array.from(u)
        .map((ch) => (isScrambleable(ch) ? scrambleFor(ch) : ch))
        .join("");

    const tick = (now = 0) => {
      if (now - lastScramble >= scrambleMs) {
        lastScramble = now;
        frozen = units.map(scrambleUnit);
      }
      const out = units.map((u, i) => {
        if (i < settled) return u;
        if (!/[A-Za-z\uac00-\ud7a3]/.test(u)) return u; // 공백·부호는 제자리
        if (i < settled + trail) return frozen[i] ?? u;
        return "";
      });
      setShown(out.join(""));
      if (settled >= units.length) {
        setShown(text);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    timer.current = window.setInterval(() => {
      settled += 1;
      if (settled > units.length) window.clearInterval(timer.current);
    }, step);
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      window.clearInterval(timer.current);
    };
  }, [text, armed, onView]);

  // 스크린리더에는 확정된 문장만 읽히게 하고, 흔들리는 글자는 숨긴다.
  // "\n"은 <br />로. 원문에 줄바꿈이 있던 문장(히어로·섹션 제목)을 그대로 쓴다.
  const lines = String(shown).split("\n");
  return (
    <span className={className} ref={hostRef}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}
