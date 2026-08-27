"use client";

// cciD Lab — custom zoomable project timeline.
// Vertical axis: projects (sticky left column). Horizontal axis: time.
// Month/Week/Day zooms change real px-per-day. Sticky date header, today line,
// weekend shading, month boundaries, lane-stacked overlapping events.
// v1 editing is click-based (empty area → new event; block → drawer);
// drag interactions can layer on later without changing the data flow.

import { Fragment, useMemo, useRef, useEffect, useCallback } from "react";
import {
  toDayStr,
  todayStr,
  addDays,
  diffDays,
  dayOfWeek,
  computeRange,
  monthSegments,
  assignLanes,
  EVENT_TYPE_META,
  PROJECT_STATUS_META,
  isFutureProject,
  isPastProject,
} from "../lib/timelineMath";
import { formatSeoul, utcIsoToSeoulLocal } from "../lib/tz";
import { resolvePhoto } from "@/app/components/members";
import { researcherKo } from "@/app/lab/data/researcherNamesKo";
import { projectBadgeOf } from "@/app/lab/data/projectBadges";

const LEFT_W = 232; // sticky project column width
const ROW_BASE = 27; // px per event lane
const ROW_PAD = 18; // project bar area height

// Day view: split each day cell into 3 horizontal zones by time of day, so
// same-day events land in different columns instead of only stacking
// vertically. Week/month views stay single-slot (1 slot = 1 day), unaffected.
const DAY_BUCKETS = [
  { key: "am", label: "오전", hour: 9 }, // 00:00–11:59
  { key: "pm", label: "오후", hour: 14 }, // 12:00–17:59
  { key: "eve", label: "저녁/밤", hour: 19 }, // 18:00–23:59
];
function kstHour(iso) {
  const local = utcIsoToSeoulLocal(iso);
  return local ? Number(local.slice(11, 13)) : 9;
}
function timeBucketIndex(hour) {
  if (hour < 12) return 0;
  if (hour < 18) return 1;
  return 2;
}

export default function Timeline({
  projects,
  events,
  researchers,
  pxPerDay,
  zoomKey,
  onOpenProject,
  onOpenEvent,
  onCreateEventAt,
  scrollRef,
}) {
  const range = useMemo(() => computeRange(projects, events), [projects, events]);
  const months = useMemo(() => monthSegments(range.start, range.totalDays), [range]);
  const today = todayStr();
  const todayIdx = diffDays(today, range.start);
  const gridW = range.totalDays * pxPerDay;
  const researcherById = useMemo(
    () => Object.fromEntries(researchers.map((r) => [r.id, r])),
    [researchers]
  );

  // 참여 아바타: 디렉터·어드바이저는 제외(실무 참여인원만), PM을 맨 앞에.
  // 애드혹 "…선생님"도 어드바이저로 취급해 제외. PM 외에는 등록 순서 유지.
  const memberCategory = (m) => {
    const r = researcherById[m.researcherId];
    return r?.category || (/선생님\s*$/.test(m.researcherId) ? "Advisory Board" : "");
  };
  const isDirectorOrAdvisor = (m) => {
    const cat = memberCategory(m);
    if (cat === "Director" || cat === "Advisory Board") return true;
    // 역할에 "어드바이저/advisor/자문"이 있으면 어드바이저로 보고 참여 아바타에서 제외.
    return /어드바이저|advisor|자문/i.test(String(m.role || ""));
  };
  const isPM = (m) => String(m.role || "").toUpperCase().includes("PM");
  // 역할에서 트랙명 추출 ("PM · 2D to 3D" → "2D to 3D", "PM" → "", "Website" → "Website").
  const trackOf = (m) =>
    String(m.role || "").replace(/^\s*PM\b\s*[·:∙・\-]*\s*/i, "").trim();
  // 필터(디렉터·어드바이저 제외) → 트랙별 그룹핑(빈 트랙=단일 PM/미지정 먼저,
  // 그 외 트랙은 첫 등장 순), 각 트랙 안에서는 PM 먼저.
  const avatarMembers = (members) => {
    const list = (members || []).filter((m) => !isDirectorOrAdvisor(m));
    const order = [""];
    list.forEach((m) => {
      const t = trackOf(m);
      if (t && !order.includes(t)) order.push(t);
    });
    return list
      .map((m, i) => ({ m, i }))
      .sort((a, b) => {
        const ta = order.indexOf(trackOf(a.m));
        const tb = order.indexOf(trackOf(b.m));
        if (ta !== tb) return ta - tb;
        const pa = isPM(a.m) ? 0 : 1;
        const pb = isPM(b.m) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.i - b.i;
      })
      .map((x) => x.m);
  };

  const containerRef = useRef(null);
  useEffect(() => {
    if (scrollRef) scrollRef.current = { scrollToToday };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, pxPerDay]);

  const scrollToToday = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, todayIdx * pxPerDay - (el.clientWidth - LEFT_W) / 2),
      behavior: "smooth",
    });
  }, [todayIdx, pxPerDay]);

  useEffect(() => {
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pxPerDay]);

  // Day view only: faint 1px dividers at the 1/3 and 2/3 marks of each day
  // cell, so the 오전/오후/저녁 zones read as distinct columns even before an
  // event lands in them.
  const dayBucketBg = useMemo(() => {
    if (zoomKey !== "day") return null;
    const u = pxPerDay / 3;
    return {
      backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${u - 1}px, rgba(15,15,19,0.06) ${u - 1}px, rgba(15,15,19,0.06) ${u}px, transparent ${u}px, transparent ${2 * u - 1}px, rgba(15,15,19,0.06) ${2 * u - 1}px, rgba(15,15,19,0.06) ${2 * u}px, transparent ${2 * u}px, transparent ${pxPerDay}px)`,
    };
  }, [zoomKey, pxPerDay]);

  // Weekend shading aligned to the range's first day (only useful when zoomed in).
  const weekendBg = useMemo(() => {
    if (pxPerDay < 12) return null;
    const dow = dayOfWeek(range.start); // 0=Sun
    const satOffset = ((6 - dow + 7) % 7) * pxPerDay;
    const week = 7 * pxPerDay;
    return {
      backgroundImage: `repeating-linear-gradient(to right, rgba(15,15,19,0.035) 0, rgba(15,15,19,0.035) ${2 * pxPerDay}px, transparent ${2 * pxPerDay}px, transparent ${week}px)`,
      backgroundPosition: `${satOffset}px 0`,
    };
  }, [range.start, pxPerDay]);

  // Day view: 3 slots/day (오전·오후·저녁). Other views: 1 slot/day (unchanged
  // behavior) — this makes multi-day bars fall out naturally too, since their
  // slot span is just slotsPerDay × day-span either way.
  const slotsPerDay = zoomKey === "day" ? 3 : 1;
  const unitPx = pxPerDay / slotsPerDay;

  const rows = useMemo(() => {
    return projects.map((p) => {
      const pStart = p.startDate ? toDayStr(p.startDate) : "";
      const pEnd = p.endDate ? toDayStr(p.endDate) : "";
      const evItems = events
        .filter((e) => e.projectId === p.id && e.start)
        .map((e) => {
          const s = toDayStr(e.start);
          const eEnd = e.end ? toDayStr(e.end) : s;
          const dayIndex = Math.max(0, diffDays(s, range.start));
          const daySpan = Math.max(1, diffDays(eEnd, s) + 1);
          const singleDay = daySpan === 1;
          const bucket = slotsPerDay > 1 && singleDay ? timeBucketIndex(kstHour(e.start)) : 0;
          const startIndex = dayIndex * slotsPerDay + bucket;
          const span = singleDay ? 1 : daySpan * slotsPerDay;
          return { event: e, startIndex, span };
        });
      const { items, laneCount } = assignLanes(evItems);
      return {
        project: p,
        barStart: pStart ? diffDays(pStart, range.start) : null,
        barSpan: pStart ? Math.max(1, diffDays(pEnd || pStart, pStart) + 1) : null,
        items,
        height: ROW_PAD + Math.max(1, laneCount) * ROW_BASE + 6,
      };
    });
  }, [projects, events, range.start, slotsPerDay]);

  const handleRowClick = (e, project) => {
    // Clicks on empty timeline area → create an event prefilled at that date
    // (and, in day view, at the clicked 오전/오후/저녁 zone's default hour).
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dayIndex = Math.floor(x / pxPerDay);
    const day = addDays(range.start, dayIndex);
    const bucketInDay = slotsPerDay > 1 ? Math.floor((x - dayIndex * pxPerDay) / unitPx) : 0;
    const hour = DAY_BUCKETS[Math.min(bucketInDay, 2)]?.hour ?? 10;
    onCreateEventAt(project.id, day, hour);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto overflow-y-auto max-h-[calc(100dvh-190px)] border border-primaryB/10 bg-[#FBFBF8] scrollbar-hide"
      role="region"
      aria-label="Project timeline"
    >
      <div style={{ width: LEFT_W + gridW, minWidth: "100%" }}>
        {/* ---- date header (sticky top) ---- */}
        <div className="sticky top-0 z-30 flex bg-[#F0F0EC] border-b border-primaryB/15">
          <div
            className="sticky left-0 z-40 shrink-0 bg-[#F0F0EC] border-r border-primaryB/15 flex items-end px-3 pb-1.5"
            style={{ width: LEFT_W }}
          >
            <span className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888]">
              Projects · {projects.length}
            </span>
          </div>
          <div className="relative" style={{ width: gridW }}>
            <div className="flex h-[26px]">
              {months.map((m) => (
                <div
                  key={m.key}
                  className="border-r border-primaryB/15 px-2 flex items-center overflow-hidden"
                  style={{ width: m.days * pxPerDay }}
                >
                  <span className="font-light uppercase text-[11px] tracking-[0.01em] text-primaryB/70 whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            {zoomKey !== "month" && (
              <div className="flex h-[20px] border-t border-primaryB/10">
                {Array.from({ length: range.totalDays }, (_, i) => {
                  const day = addDays(range.start, i);
                  const dow = dayOfWeek(day);
                  if (zoomKey === "week" && dow !== 1) return null;
                  const w = zoomKey === "week" ? pxPerDay * 7 : pxPerDay;
                  return (
                    <div
                      key={day}
                      className="shrink-0 border-r border-primaryB/[0.07] px-[3px] flex items-center"
                      style={{ width: w }}
                    >
                      <span
                        className={`text-[10px] leading-none whitespace-nowrap ${
                          day === today ? "text-[#4E22D6] font-medium" : "text-primaryB/45"
                        }`}
                      >
                        {Number(day.slice(8, 10))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---- rows ---- */}
        {rows.length === 0 && (
          <div className="px-4 py-10 text-[14px] text-primaryB/50">
            표시할 프로젝트가 없습니다. 위의 +Project로 첫 프로젝트를 추가하세요.
          </div>
        )}
        {rows.map(({ project: p, barStart, barSpan, items, height }, rowIdx) => {
          const status = PROJECT_STATUS_META[p.status] || PROJECT_STATUS_META.planning;
          // 예정 프로젝트는 정렬로 아래에 모여 있다. 그 첫 행 앞에 구분 머리글을 넣어
          // "여기부터는 아직 시작 전"이라는 걸 드러낸다.
          const startsFutureGroup =
            isFutureProject(p) && (rowIdx === 0 || !isFutureProject(rows[rowIdx - 1].project));
          // 강조 프로젝트: 진한 프로젝트 색 배경 + 밝은 텍스트 (색만으로 구분하지
          // 않도록 텍스트/구성은 동일하게 유지).
          // 끝난 프로젝트는 강조색을 쓰지 않고 밝은 회색 위 옅은 회색 글씨로 낮춘다.
          const past = isPastProject(p);
          const em = Boolean(p.emphasis) && !past;
          const emColor = p.color || "#4E22D6";
          return (
            <Fragment key={p.id}>
              {startsFutureGroup && (
                <div className="flex border-b border-primaryB/[0.08]">
                  <div
                    className="sticky left-0 z-30 shrink-0 border-r border-primaryB/15 bg-[#E8E8E2] px-3 py-1.5"
                    style={{ width: LEFT_W }}
                  >
                    <span className="font-light uppercase text-[10px] tracking-[0.05em] text-[#888]">
                      예정 · Upcoming
                    </span>
                  </div>
                  <div className="shrink-0 bg-[#E8E8E2]" style={{ width: gridW }} />
                </div>
              )}
            <div className="flex border-b border-primaryB/[0.08]">
              {/* sticky left: project info */}
              <div
                className={`sticky left-0 z-20 shrink-0 border-r border-primaryB/15 px-3 py-2.5 flex flex-col gap-0.5 min-w-0 ${
                  em ? "" : past ? "bg-[#E9E9E5]" : "bg-[#F0F0EC]"
                }`}
                style={{ width: LEFT_W, minHeight: height, ...(em ? { backgroundColor: emColor } : {}) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProject(p.id)}
                    className="text-left min-w-0 flex-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] group"
                  >
                    <span
                      className={`block text-[14px] font-medium leading-[1.25] transition-colors truncate ${
                        em
                          ? "text-white group-hover:text-white/80"
                          : past
                            ? "text-[#96968F] group-hover:text-[#6d6d67]"
                            : "text-primaryB group-hover:text-[#5D009C]"
                      }`}
                    >
                      {projectBadgeOf(p.id) && (
                        <span aria-hidden="true" className="mr-1">
                          {projectBadgeOf(p.id)}
                        </span>
                      )}
                      {p.shortName || p.title}
                    </span>
                    {/* 도트·클라이언트·기본 상태(active/planning)는 숨김.
                        주목이 필요한 상태(on hold/reviewing/completed/archived)만 라벨 노출. */}
                    {p.status !== "active" && p.status !== "planning" && (
                      <span
                        className={`mt-0.5 block font-light uppercase text-[10px] tracking-[0.05em] ${
                          em ? "text-white/75" : "text-[#888]"
                        }`}
                      >
                        {status.label}
                      </span>
                    )}
                  </button>
                  {/* 우측 상단: 프로젝트 링크 — 피그마는 피그마 아이콘, 사이트는 글로브 아이콘.
                      22px 버튼 안 아이콘이 중앙 정렬이라 타이틀 텍스트 상단(cap)과 맞도록 위로 당김. */}
                  {(p.siteUrl || p.figmaLinks?.length > 0) && (
                    <div className="flex items-center gap-0.5 shrink-0 -mt-[2px]">
                      {p.siteUrl && (
                        <a
                          href={p.siteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="프로젝트 사이트 열기"
                          className={`group/lnk relative inline-flex items-center justify-center w-[22px] h-[22px] rounded transition-colors ${
                            em ? "text-white/80 hover:text-white hover:bg-white/10" : "text-primaryB/55 hover:text-primaryB hover:bg-primaryB/5"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[14px] h-[14px]">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M3 12h18" />
                            <path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
                          </svg>
                          <span role="tooltip" className="pointer-events-none absolute right-0 top-[calc(100%+4px)] z-50 hidden group-hover/lnk:block whitespace-nowrap rounded bg-primaryB px-1.5 py-0.5 text-[10px] leading-none text-white shadow-md">
                            Site
                          </span>
                        </a>
                      )}
                      {(p.figmaLinks || []).map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Figma${l.label ? ` — ${l.label}` : ""} 열기`}
                          className={`group/fig relative inline-flex items-center justify-center w-[22px] h-[22px] rounded transition-colors ${
                            em ? "text-white/80 hover:text-white hover:bg-white/10" : "text-primaryB/55 hover:text-primaryB hover:bg-primaryB/5"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[13px] h-[13px]">
                            <path d="M8.148 24c-2.476 0-4.49-2.014-4.49-4.49v-.05c0-2.476 2.014-4.49 4.49-4.49h4.588v4.54c0 2.476-2.014 4.49-4.49 4.49h-.098zm-.05-7.53c-1.664 0-3.018 1.355-3.018 3.02s1.354 3.019 3.019 3.019h.098c1.665 0 3.019-1.354 3.019-3.019v-3.02H8.098zM15.852 16.49c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49 4.49 2.014 4.49 4.49-2.014 4.49-4.49 4.49zm0-7.51c-1.665 0-3.019 1.355-3.019 3.02s1.354 3.019 3.019 3.019 3.019-1.354 3.019-3.019-1.354-3.02-3.019-3.02zM8.148 16.49c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98H8.148zm0-7.51c-1.665 0-3.019 1.355-3.019 3.02s1.354 3.019 3.019 3.019h3.117V8.98H8.148zM8.148 8.98c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.98H8.148zm0-7.509c-1.665 0-3.019 1.355-3.019 3.02s1.354 3.019 3.019 3.019h3.117V1.471H8.148zM15.803 8.98h-4.539V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49h-.049zm-3.068-1.47h3.117c1.639-.027 2.97-1.371 2.97-3.02s-1.354-3.019-3.019-3.019h-3.068V7.51z" />
                          </svg>
                          {l.label && (
                            <span role="tooltip" className="pointer-events-none absolute right-0 top-[calc(100%+4px)] z-50 hidden group-hover/fig:block whitespace-nowrap rounded bg-primaryB px-1.5 py-0.5 text-[10px] leading-none text-white shadow-md">
                              {l.label}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {p.projectLead && (
                  <span
                    className={`text-[12px] leading-[1.25] font-medium ${
                      em ? "text-white/90" : "text-primaryB/85"
                    }`}
                  >
                    <span
                      className={`font-light uppercase text-[10px] tracking-[0.05em] mr-1.5 ${
                        em ? "text-white/70" : "text-[#888]"
                      }`}
                    >
                      Lead
                    </span>
                    {String(p.projectLead)
                      .split(/[,;]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((id) => (researcherById[id] ? researcherKo(researcherById[id]) : id))
                      .join(", ")}
                  </span>
                )}
                {(() => {
                  const avatars = avatarMembers(p.members);
                  if (avatars.length === 0) return null;
                  return (
                  <div className="flex items-end flex-wrap gap-[3px] mt-1.5" aria-label={`참여 연구원 ${avatars.length}명`}>
                    {avatars.slice(0, 8).map((m) => {
                      const r = researcherById[m.researcherId];
                      // Ad hoc (not-yet-in-roster) names can still resolve to a
                      // local photo override by exact name match (see members.js
                      // LOCAL_PHOTOS/SHEET_PHOTOS) — useful for people hidden from
                      // the public site or not yet added as a sheet row.
                      const photo = r ? resolvePhoto(r.name, r.image) : resolvePhoto(m.researcherId, "");
                      const name = r ? researcherKo(r) : m.researcherId;
                      const pm = isPM(m);
                      const label = `${name}${m.role ? ` — ${m.role}` : ""}`;
                      return (
                        <span
                          key={m.researcherId}
                          className={`group/av relative rounded-full overflow-visible shrink-0 ${
                            pm ? "w-[24px] h-[24px]" : "w-[20px] h-[20px]"
                          }`}
                        >
                          <span className={`block w-full h-full rounded-full overflow-hidden bg-[#F6F0FF] ${pm ? "ring-2 ring-[#5D009C]" : "ring-1 ring-[#F0F0EC]"}`}>
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photo}
                                alt={label}
                                className="w-full h-full object-cover filter grayscale"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              // 사진이 없거나 명단에 없는 이름 → 빈 컬러 원
                              <span aria-hidden="true" className="block w-full h-full bg-[#E0E0FF]" />
                            )}
                          </span>
                          {/* hover 플로팅 이름표 */}
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+4px)] z-50 hidden group-hover/av:block whitespace-nowrap rounded bg-primaryB px-1.5 py-0.5 text-[10px] leading-none text-white shadow-md"
                          >
                            {label}
                          </span>
                        </span>
                      );
                    })}
                    {avatars.length > 8 && (
                      <span className="text-[10px] text-primaryB/40 leading-none">
                        +{avatars.length - 8}
                      </span>
                    )}
                  </div>
                  );
                })()}
              </div>

              {/* timeline lane area */}
              <div
                className="relative cursor-crosshair"
                style={{ width: gridW, minHeight: height, ...(weekendBg || {}) }}
                onClick={(e) => handleRowClick(e, p)}
                aria-label={`${p.title} — 빈 영역을 클릭하면 해당 날짜에 새 일정을 추가합니다`}
              >
                {dayBucketBg && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={dayBucketBg}
                  />
                )}
                {/* month boundary lines */}
                {months.slice(1).map((m) => (
                  <span
                    key={m.key}
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-px bg-primaryB/[0.08] pointer-events-none"
                    style={{ left: m.startIndex * pxPerDay }}
                  />
                ))}
                {/* today line */}
                {todayIdx >= 0 && todayIdx < range.totalDays && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-px bg-[#4E22D6] pointer-events-none"
                    style={{ left: todayIdx * pxPerDay + Math.floor(pxPerDay / 2) }}
                  />
                )}
                {/* project span bar */}
                {barStart !== null && (
                  <button
                    type="button"
                    onClick={() => onOpenProject(p.id)}
                    aria-label={`${p.title} 기간, 진행률 ${p.progress || 0}%`}
                    className="absolute h-[10px] rounded-[2px] overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] hover:opacity-90 transition-opacity"
                    style={{
                      top: 8,
                      left: Math.max(0, barStart) * pxPerDay,
                      width: Math.max(pxPerDay, barSpan * pxPerDay),
                      backgroundColor: past ? "#DEDED8" : em ? emColor : `${emColor}26`,
                      border: `1px solid ${past ? "#CFCFC8" : em ? emColor : `${emColor}55`}`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.max(0, Math.min(100, p.progress || 0))}%`,
                        backgroundColor: em ? "rgba(255,255,255,0.35)" : `${emColor}59`,
                      }}
                    />
                  </button>
                )}
                {/* event blocks */}
                {items.map(({ event: ev, startIndex, span, lane }) => {
                  const meta = EVENT_TYPE_META[ev.eventType] || EVENT_TYPE_META.other;
                  const top = ROW_PAD + lane * ROW_BASE;
                  const isMilestone = ev.eventType === "milestone";
                  const isMeeting = ev.eventType === "meeting";
                  const bucketLabel =
                    slotsPerDay > 1 && span === 1 ? ` (${DAY_BUCKETS[startIndex % 3].label})` : "";
                  const label = `${ev.title} — ${meta.tag} ${formatSeoul(ev.start, { hour: undefined, minute: undefined })}${bucketLabel}${ev.syncStatus === "error" ? " (동기화 오류)" : ""}`;
                  if (isMilestone) {
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onOpenEvent(ev.id)}
                        title={label}
                        aria-label={label}
                        className="absolute flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] group"
                        style={{ top: top + 4, left: startIndex * unitPx + unitPx / 2 - 5 }}
                      >
                        <span
                          aria-hidden="true"
                          className="block w-[9px] h-[9px] rotate-45 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: meta.color }}
                        />
                        {unitPx >= 12 && (
                          <span className="text-[10px] leading-none whitespace-nowrap text-primaryB/70">
                            {ev.title}
                          </span>
                        )}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onOpenEvent(ev.id)}
                      title={label}
                      aria-label={label}
                      className={`absolute rounded-[2px] flex items-center gap-1 px-1.5 overflow-hidden text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] hover:brightness-95 transition-[filter] ${
                        isMeeting ? "h-[11px]" : "h-[20px]"
                      }`}
                      style={{
                        top,
                        left: startIndex * unitPx,
                        width: Math.max(unitPx * span - (slotsPerDay > 1 ? 3 : 0), 46),
                        backgroundColor: isMeeting ? meta.color : `${meta.color}1c`,
                        borderLeft: isMeeting ? "none" : `3px solid ${meta.color}`,
                        // Deadlines get a stripe pattern — never color alone.
                        ...(ev.eventType === "deadline"
                          ? {
                              backgroundImage: `repeating-linear-gradient(135deg, ${meta.color}30 0 3px, transparent 3px 7px)`,
                            }
                          : {}),
                      }}
                    >
                      <span
                        className={`font-medium tracking-[0.08em] leading-none shrink-0 ${
                          isMeeting ? "text-[8px] text-white/90" : "text-[9px]"
                        }`}
                        style={isMeeting ? undefined : { color: meta.color }}
                      >
                        {meta.tag}
                      </span>
                      <span
                        className={`leading-none truncate ${
                          isMeeting ? "text-[9px] text-white" : "text-[11px] text-primaryB/80"
                        }`}
                      >
                        {ev.title}
                      </span>
                      {ev.googleMeetUrl && (
                        <span aria-hidden="true" className="text-[9px] shrink-0" style={{ color: isMeeting ? "#FFFFFF" : meta.color }}>
                          ⌁
                        </span>
                      )}
                      {ev.syncStatus === "error" && (
                        <span className="text-[10px] shrink-0 text-[#9F2F2D]" aria-hidden="true">
                          !
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
