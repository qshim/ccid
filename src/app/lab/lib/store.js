// Lab Ops — data store.
// The app works against one in-memory document (projects, events, settings,
// activity) behind a tiny get/put interface, so routes and UI never care where
// the data lives.
//
// Backends (LAB_DATA_BACKEND):
//   "json"   (default) — local file .labops-data/labops.json. Real persistence in
//            dev / self-hosted; NOT persistent on Vercel serverless.
//   "sheets" — HUMAN-READABLE rows in the lab's Google Spreadsheet via the Apps
//            Script bridge: ops_projects / ops_events / ops_activity tabs (one row
//            per item, editable directly in the sheet) + ops_settings (key/value).
//            Writes are computed as a diff (append / update / delete by id) so a
//            /lab edit touches only the rows it changed, and rows added or edited
//            by hand in the sheet flow back on the next load.
//            Requires the labops actions merged into the bridge script — see
//            google-apps-script/labops-bridge-extension.gs.
//
// Server-only module — never import from client components.

import { promises as fs } from "fs";
import path from "path";
import { getResearchers } from "./researchers";

const EMPTY_DOC = () => ({
  version: 0,
  projects: [],
  events: [],
  settings: {},
  activity: [],
});

// ---------- json file backend ----------

const DATA_DIR = path.join(process.cwd(), ".labops-data");
const DATA_FILE = path.join(DATA_DIR, "labops.json");

async function jsonGet() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return EMPTY_DOC();
  }
}

async function jsonPut(doc, expectedVersion) {
  const current = await jsonGet();
  if ((current.version || 0) !== expectedVersion) {
    return { ok: false, conflict: true, current };
  }
  const next = { ...doc, version: expectedVersion + 1 };
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
  return { ok: true, doc: next };
}

// ---------- sheets (row-based) backend ----------

function bridgeConfig() {
  const url = process.env.SHEETS_BRIDGE_URL;
  const secret = process.env.SHEETS_BRIDGE_SECRET;
  if (!url || !secret) {
    throw new Error(
      "sheets backend requires SHEETS_BRIDGE_URL and SHEETS_BRIDGE_SECRET env vars"
    );
  }
  return { url, secret };
}

// Apps Script /exec는 간헐적으로 실패한다 — 5xx를 주거나, HTTP 200에 JSON 대신
// HTML 오류 페이지를 실어 보내기도 하고(그 경우 data가 null이라 "bridge error: 200"),
// 아예 응답 없이 멈추기도 한다.
//
// 그래서 시도마다 반드시 타임아웃을 건다. 타임아웃이 없으면 멈춘 호출이 그대로
// 쌓여 재시도가 오히려 함수 전체를 잡아먹는다(재시도만 넣었을 때 60초 한도에
// 걸려 504가 늘었다).
//
// `retries`는 멱등한 호출(읽기)에만 쓴다. 쓰기는 재시도하면 중복 적용될 수 있다.
async function bridgeCall(payload, { retries = 0, timeoutMs = 12000 } = {}) {
  const { url, secret } = bridgeConfig();
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        redirect: "follow", // Apps Script /exec answers via 302
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ secret, ...payload }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error(`bridge error: ${data?.error || res.status}`);
      return data;
    } catch (err) {
      lastErr =
        err?.name === "AbortError"
          ? new Error(`bridge timeout (${timeoutMs}ms)`)
          : err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// Column orders — must match ensureSheet_ headers in the Apps Script extension.
export const PROJECT_COLS = [
  "id", "title", "titleEn", "shortName", "status", "visibility",
  "startDate", "endDate", "projectLead", "members", "clientOrPartner",
  "category", "color", "emphasis", "progress", "description", "notes", "commLog",
  "archivedAt", "deletedAt", "createdAt", "updatedAt", "createdBy",
  // 신규 컬럼은 스키마 시프트 손상을 피하려 반드시 맨 뒤에 append.
  "siteUrl", "figmaLinks", "digestNote",
];
export const EVENT_COLS = [
  "id", "projectId", "title", "eventType", "start", "end", "allDay",
  "location", "assignedResearchers", "attendees", "status", "description",
  "notes", "wantCalendar", "wantMeet", "calendarProvider",
  "externalCalendarId", "googleCalendarEventId", "googleMeetUrl",
  "syncStatus", "syncError", "lastSyncAt", "recurrence", "reminder",
  "createdAt", "updatedAt",
  "notifiedAt", // append at end (스키마 시프트 방지)
];
export const ACTIVITY_COLS = [
  "id", "at", "by", "type", "projectId", "eventId", "title", "from", "to", "email",
];

// Human-friendly cell encodings:
//   project.members         [{researcherId, role}] ↔ "yeju-chung: UX; heeyun-sul: Proto"
//   event.assignedResearchers [ids]                ↔ "yeju-chung, heeyun-sul"
//   booleans                                        ↔ TRUE / FALSE
export function encodeMembers(members) {
  return (Array.isArray(members) ? members : [])
    .filter((m) => m && m.researcherId)
    .map((m) => (m.role ? `${m.researcherId}: ${m.role}` : m.researcherId))
    .join("; ");
}
export function decodeMembers(cell) {
  return String(cell || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(":");
      if (idx === -1) return { researcherId: entry.trim(), role: "" };
      return {
        researcherId: entry.slice(0, idx).trim(),
        role: entry.slice(idx + 1).trim(),
      };
    })
    .filter((m) => m.researcherId);
}

const encodeBool = (v) => (v ? "TRUE" : "FALSE");
const decodeBool = (v) => String(v).trim().toUpperCase() === "TRUE";

// figmaLinks: 여러 개의 피그마(또는 임의 링크). 한 줄에 하나, "라벨 | url" 형식
// (라벨 생략 시 url만). 시트에서 그대로 읽고 편집하기 쉽게 줄 단위로 저장.
export function encodeFigmaLinks(links) {
  return (Array.isArray(links) ? links : [])
    .map((l) => ({ label: (l?.label || "").trim(), url: (l?.url || "").trim() }))
    .filter((l) => l.url)
    .map((l) => (l.label ? `${l.label} | ${l.url}` : l.url))
    .join("\n");
}
export function decodeFigmaLinks(cell) {
  return String(cell || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line, i) => {
      const sep = line.indexOf(" | ");
      if (sep === -1) return { id: `fl_${i}`, label: "", url: line };
      return { id: `fl_${i}`, label: line.slice(0, sep).trim(), url: line.slice(sep + 3).trim() };
    })
    .filter((l) => l.url);
}

// commLog: manual external-communication log (KakaoTalk/email/call updates),
// one line per entry so it stays directly readable/editable in the sheet cell.
//   [{id, at, channel, note}] ↔ "2026-07-15 14:00 [kakao] 지도교수님 피드백: ..."
const COMM_LINE_RE = /^(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\[([^\]]*)\]\s*(.*)$/;
export function encodeCommLog(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => e && (e.note || "").trim())
    .map((e) => {
      const at = e.at ? e.at.replace("T", " ").slice(0, 16) : "";
      return `${at} [${e.channel || "기타"}] ${e.note}`.trim();
    })
    .join("\n");
}
export function decodeCommLog(cell) {
  return String(cell || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(COMM_LINE_RE);
      if (m) return { id: `cl_${i}`, at: m[1], channel: m[2] || "기타", note: m[3] };
      // 시트에서 형식 없이 그냥 타이핑한 줄도 버리지 않고 메모로 보존.
      return { id: `cl_${i}`, at: "", channel: "기타", note: line };
    });
}

export function encodeProjectRow(p) {
  const row = {};
  for (const k of PROJECT_COLS) {
    if (k === "members") row[k] = encodeMembers(p.members);
    else if (k === "commLog") row[k] = encodeCommLog(p.commLog);
    else if (k === "figmaLinks") row[k] = encodeFigmaLinks(p.figmaLinks);
    else if (k === "emphasis") row[k] = encodeBool(p.emphasis);
    else row[k] = p[k] == null ? "" : String(p[k]);
  }
  return row;
}
// Sheet date cells come back as full ISO datetimes at KST midnight
// ("2026-07-12T15:00:00.000Z" = 7/13 00:00 KST). Date-only fields must be
// normalized to the KST calendar date or every .slice(0, 10) is off by one.
function toKstDate(v) {
  const s = String(v || "").trim();
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function decodeProjectRow(row) {
  const p = { ...row };
  p.members = decodeMembers(row.members);
  p.commLog = decodeCommLog(row.commLog);
  p.figmaLinks = decodeFigmaLinks(row.figmaLinks);
  p.siteUrl = String(row.siteUrl || "").trim();
  p.digestNote = String(row.digestNote || "");
  p.emphasis = decodeBool(row.emphasis);
  p.progress = Number(row.progress) || 0;
  p.startDate = toKstDate(row.startDate);
  p.endDate = toKstDate(row.endDate);
  p.archivedAt = row.archivedAt || null;
  if (!row.deletedAt) delete p.deletedAt;
  return p;
}

export function encodeEventRow(e) {
  const row = {};
  for (const k of EVENT_COLS) {
    if (k === "assignedResearchers")
      row[k] = (Array.isArray(e.assignedResearchers) ? e.assignedResearchers : []).join(", ");
    else if (k === "allDay" || k === "wantCalendar" || k === "wantMeet")
      row[k] = encodeBool(e[k]);
    else row[k] = e[k] == null ? "" : String(e[k]);
  }
  return row;
}
export function decodeEventRow(row) {
  const e = { ...row };
  e.assignedResearchers = String(row.assignedResearchers || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  e.allDay = decodeBool(row.allDay);
  e.wantCalendar = decodeBool(row.wantCalendar);
  e.wantMeet = decodeBool(row.wantMeet);
  return e;
}

function encodeActivityRow(a) {
  const row = {};
  for (const k of ACTIVITY_COLS) row[k] = a[k] == null ? "" : String(a[k]);
  return row;
}

// Diff two documents into row-level ops for the bridge. Ordering matters only
// within a tab; the script applies sequentially under a lock.
export function diffDocs(before, after) {
  const ops = [];
  const tabs = [
    { sheet: "ops_projects", key: "projects", cols: PROJECT_COLS, encode: encodeProjectRow },
    { sheet: "ops_events", key: "events", cols: EVENT_COLS, encode: encodeEventRow },
  ];
  for (const { sheet, key, cols, encode } of tabs) {
    const a = new Map((before[key] || []).map((x) => [x.id, x]));
    const b = new Map((after[key] || []).map((x) => [x.id, x]));
    for (const [id, item] of b) {
      if (!a.has(id)) ops.push({ op: "append", sheet, cols, row: encode(item) });
      else if (JSON.stringify(a.get(id)) !== JSON.stringify(item))
        ops.push({ op: "updateById", sheet, cols, id, row: encode(item) });
    }
    for (const id of a.keys()) {
      if (!b.has(id)) ops.push({ op: "deleteById", sheet, id });
    }
  }
  if (JSON.stringify(before.settings || {}) !== JSON.stringify(after.settings || {})) {
    ops.push({ op: "putSetting", key: "settings", value: JSON.stringify(after.settings || {}) });
  }
  const seen = new Set((before.activity || []).map((x) => x.id));
  for (const entry of after.activity || []) {
    if (!seen.has(entry.id))
      ops.push({ op: "append", sheet: "ops_activity", cols: ACTIVITY_COLS, row: encodeActivityRow(entry) });
  }
  return ops;
}

// 브리지가 몇 분씩 죽는 구간이 있어서, 마지막으로 성공한 문서를 들고 있다가
// 조회가 실패하면 그걸 대신 돌려준다(에러 화면 대신 보던 화면이 유지되도록).
// 쓰기는 절대 이 값을 쓰면 안 된다 — 낡은 문서로 diff를 뜨면 남의 수정을 되돌린다.
// 그래서 allowStale은 표시용 읽기(getDoc)에서만 켠다.
let lastGoodDoc = null; // { doc, at }
const STALE_MAX_MS = 10 * 60 * 1000;

async function sheetsGet({ allowStale = false } = {}) {
  let data;
  try {
    // 읽기는 멱등하므로 브리지가 흔들릴 때 조용히 재시도한다.
    data = await bridgeCall({ action: "opsGetAll" }, { retries: 2 });
  } catch (err) {
    if (allowStale && lastGoodDoc && Date.now() - lastGoodDoc.at < STALE_MAX_MS) {
      return { ...lastGoodDoc.doc, stale: true, staleAt: lastGoodDoc.at };
    }
    throw err;
  }
  let settings = {};
  try {
    settings = JSON.parse(data.settings || "{}") || {};
  } catch {}
  const doc = {
    version: 0, // row-level last-write; no doc version on this backend
    projects: (data.projects || []).map(decodeProjectRow).filter((p) => p.id),
    events: (data.events || []).map(decodeEventRow).filter((e) => e.id),
    settings,
    // ops_people 탭: id, name, email (비공개 — 캘린더 초대용). 브리지 구버전이면 undefined → [].
    people: (data.people || []).filter((p) => p.id),
    // newest first (the sheet appends; the app expects recent-first)
    activity: (data.activity || []).filter((a) => a.id).reverse(),
  };
  lastGoodDoc = { doc, at: Date.now() };
  return doc;
}

async function sheetsPut(nextDoc, _expectedVersion, beforeDoc) {
  const ops = diffDocs(beforeDoc || EMPTY_DOC(), nextDoc);
  if (ops.length > 0) {
    // Roster rides along so the Apps Script can rebuild the People overview and
    // per-project view tabs without depending on the content spreadsheet —
    // the ops sheet can live under any account (e.g. hello.ccid@gmail.com).
    // 쓰기는 뷰 재생성까지 하느라 읽기보다 훨씬 오래 걸린다. 재시도는 하지 않되
    // (중복 적용 위험) 함수 한도(60초) 안에서 최대한 기다린다.
    await bridgeCall(
      { action: "opsApply", ops, roster: rosterPayload() },
      { timeoutMs: 45000 }
    );
  }
  return { ok: true, doc: nextDoc };
}

function rosterPayload() {
  return getResearchers().map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    active: r.active,
  }));
}

// ---------- public interface ----------

function backend() {
  return process.env.LAB_DATA_BACKEND === "sheets"
    ? { get: sheetsGet, put: sheetsPut }
    : { get: jsonGet, put: jsonPut };
}

// 표시용 읽기. 브리지가 죽어 있으면 마지막으로 성공한 문서를 stale 표시와 함께
// 돌려준다(수정 경로인 updateDoc은 항상 최신만 쓴다 — 아래 참고).
export async function getDoc({ allowStale = true } = {}) {
  return backend().get({ allowStale });
}

// Read-modify-write; `mutate` receives a deep copy and must return the mutated
// doc. json backend retries on version conflicts; sheets backend applies a
// row-level diff (last write per row wins — single-admin assumption).
export async function updateDoc(mutate, { retries = 3 } = {}) {
  const b = backend();
  for (let attempt = 0; attempt <= retries; attempt++) {
    // 반드시 최신 문서로 diff를 떠야 한다. 캐시된 문서로 쓰면 그 사이 다른 곳에서
    // 바뀐 행을 옛 값으로 덮어쓴다.
    const current = await b.get({ allowStale: false });
    const draft = JSON.parse(JSON.stringify(current));
    const mutated = await mutate(draft);
    if (!mutated) throw new Error("mutate must return the document");
    const res = await b.put(mutated, current.version || 0, current);
    if (res.ok) return res.doc;
    // conflict → retry against the fresh document
  }
  throw new Error("동시 수정 충돌이 계속 발생합니다. 잠시 후 다시 시도하세요.");
}

export function logActivity(doc, entry) {
  doc.activity = doc.activity || [];
  doc.activity.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    by: "admin",
    ...entry,
  });
  // Keep the in-memory log bounded (the sheet keeps full history).
  if (doc.activity.length > 500) doc.activity.length = 500;
}
