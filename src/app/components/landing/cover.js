"use client";

import { neuehaas } from "@/fonts/fonts";
import { useState, useEffect } from "react";
import { sheetsStatic } from "@/app/data/sheetsStatic";

const GLYPH_VARIANTS = [
  "normal",
  '"salt" 1',
  '"ss01" 1',
  '"ss02" 1',
  '"ss03" 1',
];

function ShuffleChar({ ch }) {
  const [variant, setVariant] = useState(() =>
    Math.floor(Math.random() * GLYPH_VARIANTS.length)
  );

  useEffect(() => {
    let timeoutId;
    const schedule = () => {
      const delay = 3000 + Math.random() * 5000; // 3–8s
      timeoutId = window.setTimeout(() => {
        setVariant((prev) => {
          let next = prev;
          while (next === prev) {
            next = Math.floor(Math.random() * GLYPH_VARIANTS.length);
          }
          return next;
        });
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <span style={{ fontFeatureSettings: GLYPH_VARIANTS[variant] }}>{ch}</span>
  );
}

function ShuffleText({ text }) {
  const chars = Array.from(text || "");
  return (
    <>
      {chars.map((ch, i) => (
        <ShuffleChar key={i} ch={ch} />
      ))}
    </>
  );
}

export default function Cover() {
  const [mainText, setMainText] = useState(null);
  const [typedWords, setTypedWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [startWaveAnim, setStartWaveAnim] = useState(false);
  const [activeLine, setActiveLine] = useState(0); // 0: top line, 1: bottom line

  // Matches `.wave-text` animation duration in globals.css (18s)
  const WAVE_ANIMATION_DURATION = 18000;

  useEffect(() => {
    const flatText = (sheetsStatic?.main || [])
      .map((row) => row?.[0])
      .filter(Boolean);
    setMainText(flatText);
    setTypedWords(flatText.map(() => ""));
  }, []);

  useEffect(() => {
    if (!mainText || currentWordIndex >= mainText.length) {
      setTimeout(() => {
        setStartWaveAnim(true);
      }, 1000);
      return;
    }

    const word = mainText[currentWordIndex];
    let charIndex = 0;

    const typeNextChar = () => {
      setTypedWords((prev) => {
        const newWords = [...prev];
        newWords[currentWordIndex] = word.slice(0, charIndex + 1);
        return newWords;
      });

      charIndex++;

      if (charIndex < word.length) {
        const progress = charIndex / word.length;
        const nextDelay = Math.max(5, 50 * (1 - progress * 0.8));
        setTimeout(typeNextChar, nextDelay);
      } else {
        setTimeout(() => setCurrentWordIndex((prev) => prev + 1), 80);
      }
    };

    typeNextChar();
  }, [currentWordIndex, mainText]);

  useEffect(() => {
    if (!startWaveAnim || !mainText) return;

    setActiveLine(0);
    const id = window.setInterval(() => {
      setActiveLine((prev) => (prev === 0 ? 1 : 0));
    }, WAVE_ANIMATION_DURATION);

    return () => window.clearInterval(id);
  }, [startWaveAnim, mainText]);

  const [startAnim, setStartAnim] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStartAnim(true);
    }, 800);

    return () => clearTimeout(timeout);
  }, []);

  // Use a GPU-composited transform (not the `scale` property) + will-change so the
  // text is rasterized once and scaled as a texture — otherwise the slow 18s scale
  // re-rasterizes each frame and the glyphs/letter-spacing visibly jitter.
  const scaleStyle = startAnim
    ? {
        transform: "scale(0.97)",
        transformOrigin: "left center",
        transition: "transform 18s ease-out",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }
    : {
        transformOrigin: "left center",
        willChange: "transform",
        backfaceVisibility: "hidden",
      };

  return (
    <div className="relative flex flex-col w-full h-full lg:pt-[40dvh] pt-[31vh] px-0 translate-x-0 md:-translate-x-1 lg:-translate-x-6 gap-[clamp(0.05rem,0.3vw,0.2rem)]">
      <div className="text-left relative inline-block w-full h-auto min-h-[1.15em] md:min-h-0 text-[7.5vw] md:text-[3vw] lg:text-[3vw] text-[#0f0f13]">
        <pre
          className={`${neuehaas.className} tracking-[1px] md:hidden whitespace-pre-wrap overflow-visible relative leading-[1.05] ${
            currentWordIndex === 0 ? "blinking-cursor" : ""
          }`}
          style={{ ...scaleStyle }}
        >
          {startWaveAnim && mainText && mainText[0] ? (
            <span className={`wave-text ${activeLine === 0 ? "active" : ""}`}>
              <ShuffleText text={typedWords[0]} />
            </span>
          ) : (
            <span className="first-part" style={{ opacity: 1, color: "#0f0f13" }}>
              <ShuffleText text={typedWords[0]} />
            </span>
          )}
        </pre>
        <p
          className={`${neuehaas.className} tracking-[-1px] hidden md:block overflow-visible relative leading-[1.05] whitespace-nowrap ${
            currentWordIndex === 0 ? "blinking-cursor" : ""
          }`}
          style={{ ...scaleStyle }}
        >
          {startWaveAnim && mainText && mainText[0] ? (
            <span className={`wave-text ${activeLine === 0 ? "active" : ""}`}>
              <ShuffleText text={typedWords[0]} />
            </span>
          ) : (
            <span className="first-part" style={{ opacity: 1, color: "#0f0f13" }}>
              <ShuffleText text={typedWords[0]} />
            </span>
          )}
        </p>
      </div>

      <div className="text-left relative inline-block w-full h-auto min-h-[1.15em] md:min-h-0 text-[7.5vw] md:text-[3vw] lg:text-[3vw] text-[#0f0f13]">
        <pre
          className={`${neuehaas.className} tracking-[1px] md:hidden whitespace-pre-wrap overflow-visible relative leading-[1.05] ${
            currentWordIndex === 1 ? "blinking-cursor" : ""
          }`}
          style={{ ...scaleStyle }}
        >
          {startWaveAnim && mainText && mainText[1] ? (
            <span className={`wave-text ${activeLine === 1 ? "active" : ""}`}>
              <ShuffleText text={typedWords[1]} />
            </span>
          ) : (
            <span className="first-part" style={{ opacity: 1 }}>
              <ShuffleText text={typedWords[1]} />
            </span>
          )}
        </pre>
        <p
          className={`${neuehaas.className} tracking-[-1px] hidden md:block overflow-visible relative leading-[1.05] whitespace-nowrap ${
            currentWordIndex === 1 ? "blinking-cursor" : ""
          }`}
          style={{ ...scaleStyle }}
        >
          {startWaveAnim && mainText && mainText[1] ? (
            <span className={`wave-text ${activeLine === 1 ? "active" : ""}`}>
              <ShuffleText text={typedWords[1]} />
            </span>
          ) : (
            <span className="first-part" style={{ opacity: 1 }}>
              <ShuffleText text={typedWords[1]} />
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
