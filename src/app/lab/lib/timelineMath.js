// Lab Ops — client-safe date math + visual coding for the timeline.
// All "days" are Seoul wall-clock dates (YYYY-MM-DD), so the grid never shifts
// with the viewer's local timezone.

import { LAB_TZ } from "./tz";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: LAB_TZ });

export function toDayStr(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return dayFmt.format(d);
}

export function todayStr() {
  return dayFmt.format(new Date());
}

// Day arithmetic on YYYY-MM-DD strings (UTC-noon trick avoids DST edges).
function toUtcNoon(dayStr) {
  const [y, m, d] = dayStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}
export function addDays(dayStr, n) {
  return new Date(toUtcNoon(dayStr) + n * 86400000).toISOString().slice(0, 10);
}
export function diffDays(a, b) {
  return Math.round((toUtcNoon(a) - toUtcNoon(b)) / 86400000);
}
export function dayOfWeek(dayStr) {
  return new Date(toUtcNoon(dayStr)).getUTCDay(); // 0=Sun
}

// Date-based progress: how far today sits inside [startDate, endDate], 0–100.
// Progress is derived, not stored — the manual % field is no longer used.
export function dateProgress(project) {
  const start = project?.startDate ? String(project.startDate).slice(0, 10) : "";
  const end = project?.endDate ? String(project.endDate).slice(0, 10) : "";
  if (!start || !end) return 0;
  const total = diffDays(end, start);
  if (total <= 0) return todayStr() >= end ? 100 : 0;
  const done = diffDays(todayStr(), start);
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

// Zoom levels — real cell-width changes, not just labels.
export const ZOOMS = [
  { key: "month", label: "Month", pxPerDay: 6 },
  { key: "week", label: "Week", pxPerDay: 16 },
  { key: "day", label: "Day", pxPerDay: 44 },
];

export function computeRange(projects, events) {
  const today = todayStr();
  let min = addDays(today, -30);
  let max = addDays(today, 90);
  for (const p of projects) {
    if (p.startDate) {
      const s = toDayStr(p.startDate);
      if (s && s < min) min = s;
    }
    if (p.endDate) {
      const e = toDayStr(p.endDate);
      if (e && e > max) max = e;
    }
  }
  for (const ev of events) {
    const s = ev.start ? toDayStr(ev.start) : "";
    const e = ev.end ? toDayStr(ev.end) : s;
    if (s && s < min) min = s;
    if (e && e > max) max = e;
  }
  min = addDays(min, -14);
  max = addDays(max, 21);
  // Hard cap ~3 years so a typo'd date can't explode the grid.
  if (diffDays(max, min) > 1100) max = addDays(min, 1100);
  return { start: min, end: max, totalDays: diffDays(max, min) + 1 };
}

export function monthSegments(start, totalDays) {
  const segs = [];
  let cursor = start;
  let remaining = totalDays;
  while (remaining > 0) {
    const [y, m] = cursor.split("-").map(Number);
    const monthEnd = toDayStr(new Date(Date.UTC(y, m, 0, 12))); // last day of month
    const span = Math.min(remaining, diffDays(monthEnd, cursor) + 1);
    segs.push({
      key: `${y}-${m}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
        new Date(Date.UTC(y, m - 1, 1, 12))
      ),
      startIndex: diffDays(cursor, start),
      days: span,
    });
    cursor = addDays(monthEnd, 1);
    remaining -= span;
  }
  return segs;
}

// Greedy interval lane assignment so overlapping events inside one project row
// stack into sub-lanes instead of hiding each other.
export function assignLanes(items) {
  const lanes = []; // laneEndIndex[]
  const placed = [];
  const sorted = [...items].sort((a, b) => a.startIndex - b.startIndex || b.span - a.span);
  for (const it of sorted) {
    let lane = lanes.findIndex((end) => end < it.startIndex);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(-1);
    }
    lanes[lane] = it.startIndex + it.span - 1;
    placed.push({ ...it, lane });
  }
  return { items: placed, laneCount: lanes.length };
}

// Visual coding: color + 3-letter tag per event type (never color alone).
export const EVENT_TYPE_META = {
  meeting: { tag: "MTG", color: "#4E22D6" },
  milestone: { tag: "MST", color: "#5D009C" },
  deadline: { tag: "DDL", color: "#9F2F2D" },
  research: { tag: "RES", color: "#1F6C9F" },
  design: { tag: "DSG", color: "#7A6BB0" },
  development: { tag: "DEV", color: "#346538" },
  review: { tag: "REV", color: "#956400" },
  presentation: { tag: "PRS", color: "#4E22D6" },
  exhibition: { tag: "EXH", color: "#B04A98" },
  workshop: { tag: "WKS", color: "#2F6B5E" },
  travel: { tag: "TRV", color: "#6B5B2F" },
  critique: { tag: "CRT", color: "#8A3B12" },
  other: { tag: "ETC", color: "#5c5c66" },
};

// 아직 본격적으로 굴러가지 않는 프로젝트는 타임라인 아래쪽에 따로 묶어 본다.
// 시작일이 아니라 상태로 판단한다 — 시작일이 지났어도 준비 단계인 경우가 있다
// (예: 삼성 두 건은 8/1 시작이지만 아직 planning).
export const isFutureProject = (p) => p?.status === "planning";

export const PROJECT_STATUS_META = {
  planning: { label: "Planning", color: "#7A6BB0" },
  active: { label: "Active", color: "#4E22D6" },
  on_hold: { label: "On hold", color: "#956400" },
  reviewing: { label: "Reviewing", color: "#1F6C9F" },
  completed: { label: "Completed", color: "#346538" },
  archived: { label: "Archived", color: "#888888" },
};
