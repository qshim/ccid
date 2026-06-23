"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguageStore } from "@/app/store/languageStore";
import { motion, useAnimation } from "framer-motion";
import { pxGrotesk, neuehaas, programme} from "@/fonts/fonts";
import { sheetsStatic } from "@/app/data/sheetsStatic";
import GreyPlaceholder from "@/app/components/common/GreyPlaceholder";

// Temporarily hide the student/participant names under each project.
// Set back to true to restore them.
const SHOW_TEAM_NAMES = false;

// Project media: a single image/video, or a cross-fading slideshow that cycles
// through its images. Each instance gets a random start offset, per-tick jitter,
// and its own pace (some run noticeably slower) so the slideshows across the page
// never advance in unison.
function ProjectSlideshow({ images, alt }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const n = list.length;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (n <= 1) return;
    let timer;
    const base = 4200;
    // ~35% of slideshows run slow (1.5-2.1x); the rest near base (0.9-1.25x).
    const paceMul =
      Math.random() < 0.35 ? 1.5 + Math.random() * 0.6 : 0.9 + Math.random() * 0.35;
    // Each gap = paced base with ±20% jitter so they keep drifting apart.
    const nextDelay = () => base * paceMul * (0.8 + Math.random() * 0.4);
    const tick = () => {
      setIdx((i) => (i + 1) % n);
      timer = setTimeout(tick, nextDelay());
    };
    // Random initial offset so they don't all start their first flip together.
    timer = setTimeout(tick, nextDelay() * (0.3 + Math.random() * 0.9));
    return () => clearTimeout(timer);
  }, [n]);

  if (list.length === 0) return null;

  const renderOne = (src) =>
    String(src).toLowerCase().endsWith(".mp4") ? (
      <video
        src={src}
        className="w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    ) : (
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    );

  if (list.length === 1) return renderOne(list[0]);

  return (
    <div className="relative w-full h-full">
      {list.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          loading={i === 0 ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

export default function Works({ textColor, sectionOn }) {
  const [worksInfo, setWorksInfo] = useState(sheetsStatic?.works || []);
  const { lang } = useLanguageStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [expandedRowMedia, setExpandedRowMedia] = useState([]);
  const [expandedMediaIndex, setExpandedMediaIndex] = useState(0);
  const headerControls = useAnimation();
  const lineControls = useAnimation();
  const contentControls = useAnimation();
  const [contentFont, setContentFont] = useState("default");
  const rootRef = useRef(null);

  const EXPANDED_BODY =
    "LG Electronics: Affectionate Ingelligence CX DesignLG Electronics: Affectionate Ingelligence CX DesignLG Electronics: Affectionate Ingelligence CX DesignLG Electronics: Affectionate Ingelligence CX Design";
  
  useEffect(() => {
    setWorksInfo(sheetsStatic?.works || []);
  }, []);

  useEffect(() => {
    if (sectionOn !== "works") return;

    // Fast, sequential entrance: header -> line -> content
    headerControls.set({ y: 14, opacity: 0 });
    lineControls.set({ scaleX: 0 });
    contentControls.set({ y: 10, opacity: 0 });

    let cancelled = false;
    (async () => {
      await headerControls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.22, ease: "easeOut" },
      });
      if (cancelled) return;
      await lineControls.start({
        scaleX: 1,
        transition: { duration: 0.28, ease: "easeInOut" },
      });
      if (cancelled) return;
      await contentControls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.22, ease: "easeOut" },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionOn, headerControls, lineControls, contentControls]);

  // Slideshow on clicked-expanded row: rotate available media every 5s.
  useEffect(() => {
    if (!expandedRowKey) return;
    if (!Array.isArray(expandedRowMedia) || expandedRowMedia.length <= 1) return;

    const id = window.setInterval(() => {
      setExpandedMediaIndex((prev) => (prev + 1) % expandedRowMedia.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, [expandedRowKey, expandedRowMedia]);

  const rows = Array.isArray(worksInfo) ? worksInfo : [];
  // The sheet is organized in 3-row blocks:
  // [yearsRow, enTitlesRow, krTitlesRow] repeated.
  // 2022~2020 lives in the 2nd block, so we must parse all blocks (like the previous list UI did).
  const normalizeOneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const selectedHeaderRaw = "Selected Projects";

  const parseBlock = (baseIdx) => {
    const yearsRow = rows[baseIdx] || [];
    const enRow = rows[baseIdx + 1] || [];
    const krRow = rows[baseIdx + 2] || [];
    const tfRowCandidate = isTfRow(rows[baseIdx + 3]) ? rows[baseIdx + 3] : [];

    const titleRow =
      (lang === "en" ? enRow : krRow) && (lang === "en" ? enRow : krRow).length > 0
        ? (lang === "en" ? enRow : krRow)
        : enRow;

    const out = [];
    let currentYear = "";
    const colCount = Math.max(yearsRow.length, enRow.length, krRow.length);

    for (let j = 1; j < colCount; j += 1) {
      const yr = normalizeOneLine(yearsRow?.[j]);
      if (/^\d{4}$/.test(yr)) currentYear = yr;

      const titleRaw = normalizeOneLine(titleRow?.[j]);
      if (!titleRaw) continue;

      const parts = titleRaw.split(":");
      const client = parts.length > 1 ? parts[0].trim() : "";
      const project = parts.length > 1 ? parts.slice(1).join(":").trim() : titleRaw;

      // Helper to shorten description at a specific keyword (case-insensitive)
      const cutAtWord = (str, word) => {
        const s = String(str || "");
        const w = String(word || "");
        if (!s || !w) return s;
        const idx = s.toLowerCase().indexOf(w.toLowerCase());
        if (idx === -1) return s;
        return s.slice(0, idx + w.length).trim();
      };

      const categoriesByClient2025 = {
        "LG Electronics": ["Cooperation", "CX"],
        "CJ CGV & Naver Cloud": ["Cooperation", "UX"],
        "Hyundai Motors": ["Cooperation", "UX"],
        "Ministry of Trade, Industry and Energy": ["Cooperation", "UX"],
      };
      const categories =
        currentYear === "2025" && categoriesByClient2025[client]
          ? categoriesByClient2025[client]
          : [];

      const tfByClient2025 = {
        "LG Electronics":
          "Hyeonji Lee, Sooyoun Jo, Ji Min Rhee,\nTae Eun Kim, Youngchae Seo, Buyeon Kwon\nGaeun Huh, Eun Seol Kim",
        "CJ CGV & Naver Cloud":
          "Hyeonji Lee, Jiwon Park, Tae Eun Kim\nYaeji Jang, Sooyoun Jo",
        "Hyundai Motors":
          "Hyeonji Lee, Jiwon Park, Tae Eun Kim\nYaeji Jang, Sooyoun Jo, Hyeonji Lee,\nJiwon Park, Tae Eun Kim, Yaeji Jang",
      };
      const tfFromSheet = String(tfRowCandidate?.[j] ?? "").trim();
      const tf =
        tfFromSheet ||
        (currentYear === "2025" && tfByClient2025[client] ? tfByClient2025[client] : "");

      // Title comes straight from the sheet (the project part of the title row),
      // so the spreadsheet is the single source of truth for project titles.
      const description = project;

      const imagesByClient2025 = {
        "LG Electronics": [
          "/img/2025/lg_affectionate_intelligence_0.webp",
          "/img/2025/lg_affectionate_intelligence_1.webp",
          "/img/2025/lg_affectionate_intelligence_2.webp",
          "/img/2025/lg_affectionate_intelligence_3.webp",
          "/img/2025/lg_affectionate_intelligence_4.webp",
          "/img/2025/lg_affectionate_intelligence_5.webp",
        ],
        "CJ CGV & Naver Cloud": ["/img/2025/coex_1.webp", "/img/2025/coex_0.webp"],
        "Hyundai Motor Group": ["/img/2025/hd_ai_driven_design.webp"],
        "Ministry of Trade, Industry and Energy": ["/img/2025/motie.webp"],
        "Samsung Electronics MX": ["/img/2025/mx_galaxy_ai_0.webp", "/img/2025/mx_galaxy_ai_1.webp"],
      };
      const imagesByClient2026 = {
        "Samsung Electronics": ["/img/2026/samsung-gen-ui.webp"],
        "Hyundai Motor Group": ["/img/2025/hd_ongoing.webp"],
      };
      const imagesByClient2024 = {
        "Samsung Electronics VD": ["/img/2025/vd_0.webp", "/img/2025/vd_1.webp"],
        "KIA": ["/img/2025/kia_0.webp", "/img/2025/kia_1.webp"],
      };
      const imagesByClient2023 = {
        "Samsung Electronics VD": ["/img/2025/vd_23_0.webp"],
        "Seoul Design Foundation": [
          "/img/2025/ddp_0.webp",
          "/img/2025/ddp_1.webp",
          "/img/2025/ddp_2.webp",
          "/img/2025/ddp_3.webp",
          "/img/2025/ddp_4.webp",
          "/img/2025/ddp_5.webp",
          "/img/2025/ddp_6.webp",
        ],
      };
      const images =
        currentYear === "2025" && imagesByClient2025[client]
          ? imagesByClient2025[client]
          : currentYear === "2026" && imagesByClient2026[client]
          ? imagesByClient2026[client]
          : currentYear === "2024" && imagesByClient2024[client]
          ? imagesByClient2024[client]
          : currentYear === "2023" && imagesByClient2023[client]
          ? imagesByClient2023[client]
          : [];

      // Sheet row below the title = the project description/explanation.
      const detail = normalizeOneLine(krRow?.[j]);

      out.push({
        year: currentYear,
        title: titleRaw,
        client,
        // Use existing project text as the description body for now.
        description,
        // Longer description from the sheet (row under the project title).
        detail,
        // Placeholder; user will fill later.
        tf,
        categories,
        images,
      });
    }

    return out;
  };

  const isTfRow = (row) => {
    const firstCell = normalizeOneLine(row?.[0]).toLowerCase();
    return firstCell.includes("tf") || firstCell.includes("team");
  };

  const selectedProjects = [];
  for (let i = 0; i < rows.length; ) {
    const blockProjects = parseBlock(i);
    if (blockProjects.length > 0) selectedProjects.push(...blockProjects);
    const tfRowCandidate = rows[i + 3];
    i += isTfRow(tfRowCandidate) ? 4 : 3;
  }

  const INITIAL_YEAR = "2025";
  const initialYearNum = Number(INITIAL_YEAR);
  const isValidYearProject = (p) => {
    const yStr = String(p?.year ?? "").trim();
    return /^\d{4}$/.test(yStr);
  };

  // Include every valid-year project (incl. 2026) in the spreadsheet's own
  // column order — no year sorting.
  const projectsAll = selectedProjects.filter(isValidYearProject);
  const initialYearProjects = projectsAll.filter((p) => p.year === INITIAL_YEAR);
  // Collapsed: show 3 full rows + 1 partially visible row (faded/blurred at bottom).
  const collapsedProjects = (initialYearProjects.length > 0 ? initialYearProjects : projectsAll).slice(0, 4);
  // Show every project at once (no collapse).
  const visibleProjects = projectsAll;

  const hasMore = false;
  const COLLAPSED_ROW_H = 192;
  const toggleAriaLabel = isExpanded
    ? (lang === "kr" ? "접기" : "Collapse")
    : (lang === "kr" ? "더보기" : "More");

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      // When collapsing, return to the top of the Works section so the first rows are visible.
      if (prev && !next) {
        setExpandedRowKey(null);
        setExpandedRowMedia([]);
        setExpandedMediaIndex(0);
        window.requestAnimationFrame(() => {
          document
            .querySelector("#works")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return next;
    });
  };

  const renderRow = (p, idx, keyPrefix, isLast) => {
    // Figma: most rows use 160px content height + 32px bottom padding (=192px total).
    // CJ row uses 137px content height + 32px bottom padding (=169px total).
    const clientKey = String(p?.client || "").toLowerCase();
    const isCJ = clientKey === "cj cgv & naver cloud";
    // Match Figma content height (160px); 150px was clipping descenders (g, j, p, y).
    // Image is 394.66px wide; 16:9 -> 222px tall. Row height follows.
    const contentH = 222;
    const rowH = contentH + 32;
    const contentHHover = 280;
    const rowHHover = contentHHover + 32;
    const hasTwoImages = Array.isArray(p?.images) && p.images.length === 2;
    // On hover, always collapse to a single "hero" image (matches the intended interaction).
    const useHeroOnHover = true;
    const rowKey = `${keyPrefix}-${p.year}-${idx}-${p.title}`;
    const isRowExpanded = false;
    const mediaCandidates = Array.isArray(p?.images)
      ? p.images
          .slice(0, 3)
          .map((x) => String(x || "").trim())
          .filter((x) => x.length > 0)
      : [];
    const mediaList =
      p.year === "2025" && p.client === "CJ CGV & Naver Cloud"
        ? mediaCandidates.slice(0, 2)
        : mediaCandidates;
    const heroMedia = isRowExpanded && expandedRowMedia.length > 0 ? expandedRowMedia[expandedMediaIndex] : mediaList[0];
    const heroIsVideo = String(heroMedia || "").toLowerCase().endsWith(".mp4");

    return (
      <div
        key={rowKey}
        className="group pt-0 pb-[32px] overflow-hidden"
        style={{ maxHeight: `${rowH}px` }}
      >
        <div
          className="flex flex-col lg:flex-row gap-y-4 lg:gap-y-0 lg:gap-x-8 items-stretch transition-[height] duration-300 ease-out"
          style={{ height: isRowExpanded ? `${contentHHover}px` : `${contentH}px` }}
        >
          {/* Left: Project name, then "Year Client" on one grey line */}
          <div className="lg:basis-[296px] lg:flex-none min-w-0">
            <div className={`${pxGrotesk.className} tracking-[-0.01em] flex flex-col gap-[3px] text-[0.95rem] leading-[1.3] text-primaryB`}>
              {/* Project name */}
              <div className="font-medium">{p.description || p.project || ""}</div>
              {/* Year + Client (발주처) — grey, 12px, all caps */}
              {(p.year || p.client) && (
                <div className="font-light uppercase text-[12px] tracking-[0.01em] text-[#888]">
                  {[p.year, p.client].filter((s) => s && String(s).trim()).join(" ")}
                </div>
              )}
            </div>
          </div>

        {/* Middle: meta (≈296px) */}
        <div className="lg:flex-1 min-w-0 px-1 md:px-3 lg:px-0">
          <div
            className={`${pxGrotesk.className} h-full flex flex-col text-[0.95rem] leading-[1.45]`}
          >
            {/* Title + description block (Frame 3 + Frame 2) */}
            {/* Figma: title→names spacing is 17px */}
            <div className="min-w-0 shrink-0 pr-2 lg:pr-6 flex flex-col gap-[17px] w-full max-w-[34rem]">
              {/* Project description (sheet row under the title), before names */}
              {p.detail && p.detail.trim() !== "" && (
                <div className="text-[15px] leading-[1.3] tracking-[0] text-primaryB">
                  {p.detail}
                </div>
              )}
              {/* Expanded body uses the old "names" slot */}
              {isRowExpanded ? (
                <div
                  className="opacity-80 text-[1rem] leading-[1.45] whitespace-pre-wrap"
                  style={
                    contentFont === "hel"
                      ? { fontFamily: "Helvetica, Arial, sans-serif" }
                      : contentFont === "pre"
                      ? {
                          fontFamily:
                            'pretendardR, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                        }
                      : undefined
                  }
                >
                  {EXPANDED_BODY}
                </div>
              ) : (
                SHOW_TEAM_NAMES &&
                p.tf &&
                String(p.tf).trim() !== "" && (
                  <div
                    className="text-[#888] text-[0.8rem] leading-[1.45] min-w-0 max-w-full"
                    style={
                      contentFont === "hel"
                        ? { fontFamily: "Helvetica, Arial, sans-serif" }
                        : contentFont === "pre"
                        ? {
                            fontFamily:
                              'pretendardR, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                          }
                        : undefined
                    }
                  >
                    {String(p.tf)
                      .split(/\n+/)
                      .filter((line) => line && line.trim().length > 0)
                      .map((line, i) => {
                        const lineText = line.trim();
                        if (!lineText) return null;
                        return (
                          <p
                            key={`${keyPrefix}-${p.year}-${idx}-tf-line-${i}`}
                            className="m-0 whitespace-nowrap"
                          >
                            {lineText}
                          </p>
                        );
                      })}
                  </div>
                )
              )}
            </div>

          </div>
        </div>

        {/* Right: single image (2x the previous size) */}
        <div className="flex-none pt-0 overflow-hidden">
          {p.images && p.images[0] ? (
            <div
              className="w-full lg:w-[394.66px] bg-[#F6F0FF] overflow-hidden rounded-[3px] flex-none"
              style={{ height: isRowExpanded ? `${contentHHover}px` : `${contentH}px` }}
            >
              <ProjectSlideshow
                images={p.images}
                alt={`${p.client || "project"} image`}
              />
            </div>
          ) : (
            <GreyPlaceholder
              className="w-full lg:w-[394.66px] bg-[#F6F0FF] overflow-hidden rounded-[3px] flex-none"
              style={{ height: isRowExpanded ? `${contentHHover}px` : `${contentH}px` }}
            />
          )}
        </div>
      </div>
      </div>
    );
  };

  const renderMobileCard = (p, idx) => {
    const img = Array.isArray(p?.images) && p.images.length > 0 ? String(p.images[0] || "").trim() : "";
    // Show the project/work name (matches desktop), not the client/company name.
    const title = String(p?.description || p?.project || p?.title || "").trim();
    const year = String(p?.year || "").trim();
    const client = String(p?.client || "").trim();

    return (
      <div
        key={`mcard-${year || "y"}-${idx}-${title || "t"}`}
        className="pb-6"
      >
        <div className="w-full overflow-hidden rounded-[3px] bg-[#F6F0FF] aspect-[16/9]">
          {Array.isArray(p?.images) && p.images.length > 0 ? (
            <ProjectSlideshow images={p.images} alt={title || "project"} />
          ) : (
            <GreyPlaceholder className="w-full h-full" />
          )}
        </div>
        <div className={`${pxGrotesk.className} pt-4`}>
          {/* Full title (wraps, never truncated) */}
          <div className="text-[16px] leading-[1.3] font-medium text-primaryB">
            {title}
          </div>
          {/* Year + company, grey all caps */}
          {(year || client) && (
            <div className="font-light uppercase text-[12px] tracking-[0.01em] text-[#888] pt-[3px]">
              {[year, client].filter((s) => s && String(s).trim()).join(" ")}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={rootRef}
        className="text-primaryB w-full font-[400] relative py-4 sm:py-6 lg:py-10"
      >
        {visibleProjects.length > 0 ? (
          <div className="relative z-10 text-primaryB">
            <div className="w-full flex flex-col" style={{ backgroundColor: "transparent" }}>
              {/* Header row */}
              <div className="min-h-[3.875rem] flex items-end pb-4">
                <motion.div
                  animate={headerControls}
                  className={`${pxGrotesk.className} tracking-[-0.03em] leading-[1.22] whitespace-nowrap text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem]`}
                >
                  {selectedHeaderRaw}
                </motion.div>
              </div>

              {/* Disclaimer — sits under the title, above the project list.
                  Grey + smaller than the project titles, width-constrained so the
                  long copy wraps comfortably and never reads like a project name. */}
              <p
                className={`${pxGrotesk.className} max-w-[40rem] text-[12px] leading-[1.5] tracking-[0] text-[#7A6BB0] pb-4 lg:pb-6`}
              >
                Where project materials are confidential, the visuals shown are
                conceptual representations created by cciD and do not depict actual
                client deliverables, proprietary data, or unreleased product
                information.
              </p>

              <div className="flex-1 flex flex-col">
                {/* Mobile/tablet: one card per row (image + title + year only) */}
                <div className="lg:hidden pt-4 space-y-6">
                  {visibleProjects.map((p, idx) => renderMobileCard(p, idx))}
                  {!isExpanded && hasMore && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        aria-label={toggleAriaLabel}
                        className={`${programme.className} font-semibold text-[1.05rem] leading-none tracking-[0.02em] text-primaryB hover:opacity-70 transition-opacity p-2`}
                      >
                        <svg
                          width="26"
                          height="14"
                          viewBox="0 0 26 14"
                          fill="none"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M3 3L13 11L23 3"
                            fill="none"
                            stroke="#5c5c66"
                            strokeWidth="1.55"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        aria-label={toggleAriaLabel}
                        className={`${programme.className} font-semibold text-[1.05rem] leading-none tracking-[0.02em] text-primaryB hover:opacity-70 transition-opacity p-2`}
                      >
                        <svg
                          width="26"
                          height="14"
                          viewBox="0 0 26 14"
                          fill="none"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M3 11L13 3L23 11"
                            fill="none"
                            stroke="#5c5c66"
                            strokeWidth="1.55"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop (lg+) */}
                <motion.div
                  animate={contentControls}
                  className="hidden lg:block relative pt-[1rem]"
                >
                  {/* Collapsed/expanded container: animate max-height for a smoother "unfold" */}
                  <div
                    className="relative space-y-[1rem] overflow-hidden transition-[max-height] duration-700 ease-out"
                    style={{
                      maxHeight: "none",
                      // Fade-out 영역을 더 아래로 내려서 컨텐츠가 더 많이 보이도록 조정.
                      ...(isExpanded || !hasMore
                        ? null
                        : {
                            maskImage:
                              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 86%, rgba(0,0,0,0.25) 94%, rgba(0,0,0,0) 100%)",
                            WebkitMaskImage:
                              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 86%, rgba(0,0,0,0.25) 94%, rgba(0,0,0,0) 100%)",
                          }),
                    }}
                  >
                    {visibleProjects.map((p, idx) => {
                      const isLast = idx === visibleProjects.length - 1;
                      return (
                        <div key={`list-wrap-${p?.year || "y"}-${idx}-${p?.title || "t"}`}>
                          {renderRow(p, idx, "list", isLast)}
                        </div>
                      );
                    })}
                  </div>

                  {/* More button (separated from the clipped container so it never gets cut) */}
                  {!isExpanded && hasMore && (
                    <div className="pt-6 lg:pt-8 pb-2 flex justify-center">
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        aria-label={toggleAriaLabel}
                        className={`${programme.className} font-semibold text-[1.125rem] leading-none tracking-[0.02em] text-primaryB hover:opacity-70 transition-opacity p-2`}
                      >
                        <svg
                          width="28"
                          height="16"
                          viewBox="0 0 26 14"
                          fill="none"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M3 3L13 11L23 3"
                            fill="none"
                            stroke="#5c5c66"
                            strokeWidth="1.65"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </motion.div>

                {isExpanded && (
                  <div className="hidden lg:flex pt-8 pb-2 justify-center">
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      aria-label={toggleAriaLabel}
                      className={`${programme.className} font-semibold text-[1.125rem] leading-none tracking-[0.02em] text-primaryB hover:opacity-70 transition-opacity p-2`}
                    >
                      <svg
                        width="28"
                        height="16"
                        viewBox="0 0 26 14"
                        fill="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M3 11L13 3L23 11"
                          fill="none"
                          stroke="#5c5c66"
                          strokeWidth="1.65"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>

    </>
  );
}