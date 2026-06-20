"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguageStore } from "@/app/store/languageStore";
import { motion, useAnimation } from "framer-motion";
import { pxGrotesk, neuehaas, programme} from "@/fonts/fonts";
import { sheetsStatic } from "@/app/data/sheetsStatic";
import GreyPlaceholder from "@/app/components/common/GreyPlaceholder";

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

      // Shortened / overridden description per Figma design
      const titleOverrides2025 = {
        "LG Electronics": "Affectionate Intelligence CX design",
        "CJ CGV & Naver Cloud": "AI-Driven AR Interaction Platform",
        "Hyundai Motors": "Development of AI-Driven Design Process",
      };

      let description = project;
      if (currentYear === "2025") {
        if (titleOverrides2025[client]) {
          description = titleOverrides2025[client];
        } else if (client === "Ministry of Trade, Industry and Energy") {
          // Fallback: keep original project title for this client
          description = project;
        }
      }

      const imagesByClient2025 = {
        "LG Electronics": ["/img/2025/lg/1.png", "/img/2025/lg/2.png", "/img/2025/lg/3.png"],
        // CJ: only 2 images (3rd slot intentionally omitted)
        "CJ CGV & Naver Cloud": ["/img/2025/cj/co1.png", "/img/2025/cj/co2.png"],
        "Hyundai Motors": ["/img/2025/hy/hy1.png", "/img/2025/hy/hy3.png", "/img/2025/hy/hy2.png"],
        "Ministry of Trade, Industry and Energy": ["/img/2025/mini/mi1.png", "/img/2025/mini/mi2.png", "/img/2025/mini/mi3.png"],
      };
      const images =
        currentYear === "2025" && imagesByClient2025[client]
          ? imagesByClient2025[client]
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
    const isRowExpanded = expandedRowKey === rowKey;
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
        role="button"
        tabIndex={0}
        onClick={() => {
          setExpandedRowKey((prev) => {
            const next = prev === rowKey ? null : rowKey;
            if (next) {
              setExpandedRowMedia(mediaList);
              setExpandedMediaIndex(0);
            } else {
              setExpandedRowMedia([]);
              setExpandedMediaIndex(0);
            }
            return next;
          });
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setExpandedRowKey((prev) => {
            const next = prev === rowKey ? null : rowKey;
            if (next) {
              setExpandedRowMedia(mediaList);
              setExpandedMediaIndex(0);
            } else {
              setExpandedRowMedia([]);
              setExpandedMediaIndex(0);
            }
            return next;
          });
        }}
        className={`group pt-0 pb-[32px] overflow-hidden transition-[max-height] duration-300 ease-out outline-none ${
          ""
        } cursor-pointer hover:opacity-[0.96] focus-visible:ring-1 focus-visible:ring-primaryB/50`}
        style={{
          maxHeight: isRowExpanded ? `${rowHHover}px` : `${rowH}px`,
        }}
      >
        <div
          className="flex flex-col lg:flex-row gap-y-4 lg:gap-y-0 lg:gap-x-8 items-stretch transition-[height] duration-300 ease-out"
          style={{ height: isRowExpanded ? `${contentHHover}px` : `${contentH}px` }}
        >
          {/* Left: Project name > Client > Year (all same size as project name) */}
          <div className="lg:basis-[296px] lg:flex-none min-w-0">
            <div className={`${pxGrotesk.className} tracking-[-0.03em] flex flex-col gap-[3px] text-[0.95rem] leading-[1.3] text-primaryB`}>
              {/* Project name */}
              <div className="font-medium">{p.description || p.project || ""}</div>
              {/* Client (발주처) */}
              <div className="font-medium">{p.client || ""}</div>
              {/* Year (연도) */}
              <div className="font-light">{p.year || ""}</div>
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
                <div className="text-[15px] leading-[1.3] tracking-[-0.01em] text-primaryB">
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
                p.tf &&
                String(p.tf).trim() !== "" && (
                  <div
                    className="opacity-70 text-[0.8rem] leading-[1.45] min-w-0 max-w-full"
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
              {String(p.images[0]).toLowerCase().endsWith(".mp4") ? (
                <video
                  src={p.images[0]}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={p.images[0]}
                  alt={`${p.client || "project"} image`}
                  className="w-full h-full object-cover"
                />
              )}
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
    const title = String(p?.client || p?.description || p?.title || "").trim();
    const year = String(p?.year || "").trim();

    return (
      <div
        key={`mcard-${year || "y"}-${idx}-${title || "t"}`}
        className="pb-6"
      >
        <div className="w-full overflow-hidden rounded-[3px] bg-[#F6F0FF] aspect-[16/9]">
          {img ? (
            <img src={img} alt={title || "project"} className="w-full h-full object-cover" />
          ) : (
            <GreyPlaceholder className="w-full h-full" />
          )}
        </div>
        <div className={`${pxGrotesk.className} pt-4 flex items-baseline justify-between gap-4`}>
          <div className="min-w-0 text-[18px] leading-[1.35] font-medium text-primaryB truncate">
            {title}
          </div>
          <div className="flex-none text-[14px] leading-[1.35] font-light text-primaryB/80">
            {year}
          </div>
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