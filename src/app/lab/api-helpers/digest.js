// Lab Ops — weekly digest composer: given a project + events, build the
// "지난주·이번주·다음주" schedule HTML anchored on a Monday.

import { toDayStr, addDays, dayOfWeek } from "@/app/lab/lib/timelineMath";
import { formatSeoul } from "@/app/lab/lib/tz";

// Monday (KST) of the week containing `dayStr`.
export function mondayOf(dayStr) {
  const dow = dayOfWeek(dayStr); // 0=Sun..6=Sat
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(dayStr, -back);
}

// "다음주까지의 목표" 섹션용 간결 포맷: 타입 태그·구분선(—) 없이.
//  · 시간이 있는 일정(미팅/마감/마일스톤): "M월 D일 HH:MM  제목"
//  · 워크숍 등 기간 일정: 날짜 없이 제목만. "W2 · UX 구조 — 설명" → "W2 설명"으로 축약.
function fmtGoal(ev) {
  const timed = ["meeting", "deadline", "milestone"].includes(ev.eventType);
  let title = String(ev.title || "").replace(/^#\d+\s*/, "");
  title = title.replace(/^(W\d+)\s*·[^—]*—\s*/, "$1 ");
  const meet = ev.googleMeetUrl ? ` · <a href="${ev.googleMeetUrl}">Meet</a>` : "";
  // 워크숍 등 기간 일정은 날짜 없이 제목만. 미팅/마감/마일스톤만 날짜 표기하되,
  // 종일이면 시간 없이 날짜만(혼동 방지), 아니면 날짜+시간.
  let when = "";
  if (timed) {
    if (ev.allDay) {
      const [, mm, dd] = toDayStr(ev.start).split("-");
      when = `<span style="color:#555">${Number(mm)}월 ${Number(dd)}일</span> `;
    } else {
      when = `<span style="color:#555">${formatSeoul(ev.start, {})}</span> `;
    }
  }
  return `<div style="margin:3px 0">${when}${escapeHtml(title)}${meet}</div>`;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Returns { subject, html } for the digest. anchorDay defaults to this week.
export function composeDigest(project, allEvents, anchorDay, nameOverride) {
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

  // 프로젝트명 앞 번호("2. ")는 공지 제목·본문 모두에서 제거.
  const rawName = (nameOverride && String(nameOverride).trim()) || project.shortName || project.title;
  const name = rawName.replace(/^\d+\.\s*/, "");

  // 컨테이너 안: 액션 아이템(digestNote) + 하단에 "다음주까지의 목표"(다음주 일정) 동봉.
  // 박스 안 텍스트는 모두 13px로 통일. digestNote 첫 줄(⏰ …)은 볼드.
  const note = String(project.digestNote || "").trim();
  const nl = note.indexOf("\n");
  const noteHtmlInner = nl === -1
    ? `<b>${escapeHtml(note)}</b>`
    : `<b>${escapeHtml(note.slice(0, nl))}</b>${escapeHtml(note.slice(nl))}`;
  const noteInner = note
    ? `<div style="font-size:13px;line-height:1.55;white-space:pre-wrap">${noteHtmlInner}</div>`
    : "";
  const goalsInner =
    `<h3 style="margin:0 0 6px;font-size:13px">다음주까지의 목표</h3>` +
    (groups.next.length
      ? `<div style="font-size:13px;line-height:1.5">${groups.next.map(fmtGoal).join("")}</div>`
      : `<p style="margin:0;color:#5f8b80">일정 없음</p>`);

  // 피그마 링크(있으면): 클릭 가능한 라벨 링크로. 라벨에 pw 등 메모 포함 가능.
  const figmaLinks = Array.isArray(project.figmaLinks) ? project.figmaLinks.filter((f) => f && f.url) : [];
  const figmaInner = figmaLinks.length
    ? `<h3 style="margin:0 0 6px;font-size:13px">🔗 피그마</h3>` +
      figmaLinks
        .map((f) => `<div style="margin:2px 0;font-size:13px"><a href="${escapeHtml(f.url)}" style="color:#1f7a63">${escapeHtml(f.label || f.url)}</a></div>`)
        .join("")
    : "";

  // 밝은 jade/청록 컨테이너. 섹션 사이는 얇은 구분선으로.
  const boxParts = [noteInner, goalsInner, figmaInner].filter(Boolean);
  const boxHtml = boxParts.length
    ? `<div style="margin:14px 0 4px;padding:14px 16px;background:#E4F5EF;border-radius:8px">` +
      boxParts.join(`<div style="height:1px;background:#BFE3D8;margin:12px 0"></div>`) +
      `</div>`
    : "";

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#1a1a1a;max-width:560px">` +
    `<h2 style="margin:0 0 2px;font-size:17px;font-weight:700">🗓 프로젝트 일정 공지 <span style="color:#888;font-weight:400;font-size:14px">(${thisMon} 기준)</span></h2>` +
    `<p style="margin:0 0 10px;color:#5f8b80;font-size:13px;font-weight:600">${escapeHtml(name)}</p>` +
    boxHtml +
    `</div>`;

  return { subject: `${name} 프로젝트 공지`, html };
}
