"use client";

/**
 * Background music tied to the cover (main) section.
 * - Plays (looping) while sectionOn === "cover".
 * - On leaving the cover, the volume fades out over 3.8s, then pauses.
 * - On returning to the cover, it resumes and fades back in over 3.8s.
 * Respects browser autoplay policy: if the initial play is blocked, it
 * starts on the first user interaction (while still on the cover).
 */

import { useEffect, useRef } from "react";

const FADE_MS = 3800;
const TARGET_VOLUME = 0.8;

export default function CoverAudio({ sectionOn, src }) {
  const audioRef = useRef(null);
  const rafRef = useRef(0);
  const sectionRef = useRef(sectionOn);
  sectionRef.current = sectionOn;

  // Smooth volume ramp toward `target`, then optionally run `onDone`.
  function fade(audio, target, onDone) {
    cancelAnimationFrame(rafRef.current);
    const startVol = audio.volume;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / FADE_MS);
      audio.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // Create the audio element once.
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = "auto";
    audioRef.current = audio;

    // Autoplay fallback: start on the first interaction, if still on the cover.
    const unlock = () => {
      const a = audioRef.current;
      if (a && sectionRef.current === "cover" && a.paused) {
        a.play().then(() => fade(a, TARGET_VOLUME)).catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // React to section changes: play+fade-in on cover, fade-out+pause elsewhere.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (sectionOn === "cover") {
      audio
        .play()
        .then(() => fade(audio, TARGET_VOLUME))
        .catch(() => {
          // Autoplay blocked — the interaction listener will start it.
        });
    } else if (!audio.paused) {
      fade(audio, 0, () => audio.pause());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionOn]);

  return null;
}
