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
// 글자마다 같은 시간을 주지 않는다. 처음에는 아주 빠르게 풀리다가 끝으로 갈수록 느려진다
// (ease-out, 1 − (1 − t)³). 문장이 길어도 끝나는 시점은 목표 시간(LONG_MS / SHORT_MS)으로 같다.
// 아직 맞춰지지 않은 꼬리 글자는 몇 개만, 옅게(.decode-tail) 보여 맞춰진 글이 먼저 읽힌다.
const WORD_MODE_OVER = 60; // 글자 수 기준
const LONG_MS = 1900;      // 문단 전체가 풀리는 목표 시간
const SHORT_MS = 1000;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// "\n"은 <br />로. 원문에 줄바꿈이 있던 문장(히어로·섹션 제목)을 그대로 쓴다.
const withBreaks = (s) => String(s).split("\n").map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>);

export default function DecodeText({ text, onView = false, className }) {
  const [shown, setShown] = useState({ done: text, tail: "" });
  const [armed, setArmed] = useState(!onView);
  const hostRef = useRef(null);
  const first = useRef(true);
  const raf = useRef(0);

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
        setShown({ done: text, tail: "" });
        return;
      }
    }
    if (prefersReducedMotion()) {
      setShown({ done: text, tail: "" });
      return;
    }

    const wordMode = text.length > WORD_MODE_OVER;
    // 단어 모드에서는 공백도 하나의 단위로 둔다 — 단어 경계와 줄바꿈이 유지된다.
    const units = wordMode ? text.split(/(\s+)/).filter((u) => u !== "") : Array.from(text);
    const trail = wordMode ? 2 : 4;
    const scrambleMs = wordMode ? 50 : 64;
    const duration = wordMode ? LONG_MS : SHORT_MS;

    let start = 0;
    let lastScramble = -Infinity;
    let frozen = [];

    const scrambleUnit = (u) =>
      Array.from(u)
        .map((ch) => (isScrambleable(ch) ? scrambleFor(ch) : ch))
        .join("");

    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(units.length * easeOut(t));
      if (t >= 1) {
        setShown({ done: text, tail: "" });
        return;
      }
      if (now - lastScramble >= scrambleMs) {
        lastScramble = now;
        frozen = units.map(scrambleUnit);
      }
      // 꼬리 뒤로는 빈칸·줄바꿈만 남겨 줄 수가 흔들리지 않게 한다(떠 있는 마침표가 남지 않게 부호는 뺀다).
      const tail = units.slice(settled).map((u, k) => {
        if (/^\s+$/.test(u)) return u;
        if (k >= trail) return "";
        return /[A-Za-z\uac00-\ud7a3]/.test(u) ? frozen[settled + k] ?? u : u;
      });
      setShown({ done: units.slice(0, settled).join(""), tail: tail.join("") });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf.current);
  }, [text, armed, onView]);

  // 스크린리더에는 확정된 문장만 읽히게 하고, 흔들리는 글자는 숨긴다.
  return (
    <span className={className} ref={hostRef}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {withBreaks(shown.done)}
        {shown.tail && <span className="decode-tail">{withBreaks(shown.tail)}</span>}
      </span>
    </span>
  );
}
