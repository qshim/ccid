// Lab Ops — weekly digest composer: given a project + events, build the
// "지난주·이번주·다음주" schedule HTML anchored on a Monday.

import { toDayStr, addDays, dayOfWeek } from "@/app/lab/lib/timelineMath";
import { formatSeoul } from "@/app/lab/lib/tz";
import { EVENT_TYPE_META } from "@/app/lab/lib/timelineMath";

// Monday (KST) of the week containing `dayStr`.
export function mondayOf(dayStr) {
  const dow = dayOfWeek(dayStr); // 0=Sun..6=Sat
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(dayStr, -back);
}

function fmtEvent(ev) {
  const meta = EVENT_TYPE_META[ev.eventType] || EVENT_TYPE_META.other;
  const timed = ["meeting", "deadline", "milestone"].includes(ev.eventType);
  const start = ev.allDay || !timed ? toDayStr(ev.start) : formatSeoul(ev.start, {});
  const endDay = ev.end ? toDayStr(ev.end) : "";
  const range = !timed && endDay && endDay !== toDayStr(ev.start) ? `${start} ~ ${endDay}` : start;
  const meet = ev.googleMeetUrl ? ` · <a href="${ev.googleMeetUrl}">Meet</a>` : "";
  return `<li style="margin:2px 0"><b>${meta.tag}</b> ${range} — ${escapeHtml(ev.title)}${meet}</li>`;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Returns { subject, html } for the digest. anchorDay defaults to this week.
export function composeDigest(project, allEvents, anchorDay) {
  const thisMon = mondayOf(anchorDay);
  const prevMon = addDays(thisMon, -7);
  const nextMon = addDays(thisMon, 7);
  const nextSun = addDays(thisMon, 13);

  const evs = (allEvents || [])
    .filter((e) => e.projectId === project.id && e.start)
    .filter((e) => {
      const d = toDayStr(e.start);
      return d >= prevMon && d <= nextSun;
    })
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));

  const weekOf = (e) => {
    const d = toDayStr(e.start);
    if (d < thisMon) return "prev";
    if (d >= nextMon) return "next";
    return "this";
  };
  const groups = { prev: [], this: [], next: [] };
  for (const e of evs) groups[weekOf(e)].push(e);

  const name = project.shortName || project.title;
  const section = (label, mon, list) =>
    `<h3 style="margin:14px 0 4px;font-size:14px">${label} <span style="color:#888;font-weight:400">(${mon} ~ ${addDays(mon, 6)})</span></h3>` +
    (list.length ? `<ul style="margin:0;padding-left:18px">${list.map(fmtEvent).join("")}</ul>` : `<p style="margin:0;color:#aaa">일정 없음</p>`);

  // 액션 아이템(digestNote): 줄바꿈/불릿을 살려서 렌더.
  const noteHtml = String(project.digestNote || "").trim()
    ? `<div style="margin:14px 0 4px;padding:12px 14px;background:#FFF9DB;border-radius:8px">` +
      `<h3 style="margin:0 0 6px;font-size:14px">📌 차주까지 해야 할 일</h3>` +
      `<div style="font-size:13px;line-height:1.55;white-space:pre-wrap">${escapeHtml(project.digestNote.trim())}</div>` +
      `</div>`
    : "";

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#1a1a1a;max-width:560px">` +
    `<h2 style="margin:0 0 2px;font-size:16px">${escapeHtml(name)} · 주간 일정</h2>` +
    `<p style="margin:0;color:#888;font-size:12px">이번 주 ${thisMon} 기준 · 전주·이번주·다음주</p>` +
    noteHtml +
    section("지난주", prevMon, groups.prev) +
    section("이번주", thisMon, groups.this) +
    section("다음주", nextMon, groups.next) +
    `</div>`;

  return { subject: `[${name}] 주간 일정 (${thisMon} 주차)`, html };
}
