"use client";

import { ABOUT_SECTIONS } from "./aboutData";
import { pretendardR, pxGrotesk } from "@/fonts/fonts";

// Mixed-script stack for Korean body text: Latin/digits render in PxGrotesk,
// Hangul falls through to Pretendard (PxGrotesk has no Hangul glyphs).
const mixedKrFont = `${pxGrotesk.style.fontFamily.split(",")[0]}, ${pretendardR.style.fontFamily}`;

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
                {/* Left: section title */}
                <div className="w-full lg:col-start-1 lg:col-span-1 lg:sticky lg:top-[18vh]">
                  <h2
                    className={`text-left font-[400] leading-tight text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem] tracking-[-0.03em] text-[#0f0f13] ${pxGrotesk.className}`}
                  >
                    {section.title}
                  </h2>
                </div>

                {/* Right: EN + KR paragraphs (+ sectors logo) */}
                <div className="w-full lg:col-start-2 lg:col-span-1">
                  <div className="w-full grid grid-cols-1 md:grid-cols-[1.11fr_0.89fr] gap-x-12 gap-y-6">
                    {en ? (
                      <p className={`${pxGrotesk.className} text-[15px] leading-[1.3] tracking-[-0.01em] font-[380]`}>
                        {en}
                      </p>
                    ) : null}
                    {kr ? (
                      <p style={{ fontFamily: mixedKrFont }} className="hidden sm:block text-[15px] leading-[1.58] tracking-[-0.01em] font-[450]">
                        {kr}
                      </p>
                    ) : null}
                  </div>

                  {isSectors ? <SectorsLogos /> : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
