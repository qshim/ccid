// Lab Ops — data model: defaults + validation for projects and events.

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "reviewing",
  "completed",
  "archived",
];

export const VISIBILITIES = ["internal", "private", "public_candidate"];

export const EVENT_TYPES = [
  "meeting",
  "milestone",
  "deadline",
  "research",
  "design",
  "development",
  "review",
  "presentation",
  "exhibition",
  "workshop",
  "travel",
  "critique",
  "other",
];

export const COMM_CHANNELS = [
  { key: "kakao", label: "카카오톡" },
  { key: "email", label: "이메일" },
  { key: "call", label: "전화" },
  { key: "meeting", label: "대면/화상" },
  { key: "other", label: "기타" },
];

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const isDateStr = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s));

// ---------- projects ----------

export function validateProjectInput(input, { partial = false } = {}) {
  const errors = [];
  const has = (k) => input[k] !== undefined;

  if (!partial || has("title")) {
    if (!String(input.title || "").trim()) errors.push("프로젝트명을 입력하세요.");
  }
  if (has("status") && !PROJECT_STATUSES.includes(input.status))
    errors.push("올바르지 않은 상태값입니다.");
  if (has("visibility") && !VISIBILITIES.includes(input.visibility))
    errors.push("올바르지 않은 공개 범위입니다.");
  if (has("startDate") && input.startDate && !isDateStr(input.startDate))
    errors.push("시작일 형식이 올바르지 않습니다.");
  if (has("endDate") && input.endDate && !isDateStr(input.endDate))
    errors.push("종료일 형식이 올바르지 않습니다.");
  const s = has("startDate") ? input.startDate : undefined;
  const e = has("endDate") ? input.endDate : undefined;
  if (s && e && Date.parse(e) < Date.parse(s))
    errors.push("종료일이 시작일보다 빠를 수 없습니다.");
  if (has("progress")) {
    const p = Number(input.progress);
    if (Number.isNaN(p) || p < 0 || p > 100) errors.push("진행률은 0-100 사이여야 합니다.");
  }
  if (has("members") && !Array.isArray(input.members))
    errors.push("연구원 배정 형식이 올바르지 않습니다.");
  return errors;
}

const PROJECT_FIELDS = [
  "title",
  "titleEn",
  "shortName",
  "description",
  "status",
  "visibility",
  "startDate",
  "endDate",
  "projectLead",
  "members", // [{ researcherId, role, from, to }]
  "clientOrPartner",
  "category",
  "color",
  "emphasis", // boolean — dark solid bars + light text (강조 표시)
  "progress",
  "notes",
  "commLog", // [{ id, at, channel, note }] — manual external-communication log (KakaoTalk, email, calls...)
  "siteUrl", // 프로젝트 사이트/데모 URL (단일)
  "figmaLinks", // [{ id, label, url }] — 여러 개의 피그마 링크
  "digestNote", // 주간 다이제스트 이메일에 포함할 액션 아이템/메모 (여러 줄)
];

export function buildProject(input) {
  const now = new Date().toISOString();
  const p = {
    id: newId("prj"),
    title: "",
    titleEn: "",
    shortName: "",
    description: "",
    status: "planning",
    visibility: "internal",
    startDate: "",
    endDate: "",
    projectLead: "",
    members: [],
    clientOrPartner: "",
    category: "",
    color: "#4E22D6",
    emphasis: false,
    progress: 0,
    notes: "",
    commLog: [],
    siteUrl: "",
    figmaLinks: [],
    digestNote: "",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: "admin",
  };
  for (const k of PROJECT_FIELDS) if (input[k] !== undefined) p[k] = input[k];
  return p;
}

export function applyProjectPatch(project, input) {
  for (const k of PROJECT_FIELDS) if (input[k] !== undefined) project[k] = input[k];
  project.updatedAt = new Date().toISOString();
  return project;
}

// ---------- events ----------

export function validateEventInput(input, { partial = false } = {}) {
  const errors = [];
  const has = (k) => input[k] !== undefined;

  if (!partial || has("title")) {
    if (!String(input.title || "").trim()) errors.push("일정 제목을 입력하세요.");
  }
  if (!partial || has("projectId")) {
    if (!String(input.projectId || "").trim()) errors.push("프로젝트를 선택하세요.");
  }
  if (has("eventType") && !EVENT_TYPES.includes(input.eventType))
    errors.push("올바르지 않은 일정 유형입니다.");
  if (!partial || has("start")) {
    if (!isDateStr(input.start)) errors.push("시작 일시가 올바르지 않습니다.");
  }
  if (has("end") && input.end && !isDateStr(input.end))
    errors.push("종료 일시가 올바르지 않습니다.");
  const s = has("start") ? input.start : undefined;
  const e = has("end") ? input.end : undefined;
  if (s && e && Date.parse(e) < Date.parse(s))
    errors.push("종료 일시가 시작 일시보다 빠를 수 없습니다.");
  return errors;
}

const EVENT_FIELDS = [
  "projectId",
  "title",
  "description",
  "eventType",
  "start", // UTC ISO
  "end", // UTC ISO ("" for point events like milestones)
  "allDay",
  "location",
  "attendees", // string (comma emails) — kept simple
  "assignedResearchers", // [researcherId]
  "status",
  "recurrence",
  "reminder",
  "notes",
  "wantCalendar",
  "wantMeet",
];

export function buildEvent(input) {
  const now = new Date().toISOString();
  const ev = {
    id: newId("evt"),
    projectId: "",
    title: "",
    description: "",
    eventType: "meeting",
    start: "",
    end: "",
    allDay: false,
    location: "",
    attendees: "",
    assignedResearchers: [],
    status: "confirmed",
    recurrence: "",
    reminder: "",
    notes: "",
    // External calendar linkage — internal save is never blocked by sync.
    wantCalendar: false,
    wantMeet: false,
    calendarProvider: "",
    externalCalendarId: "",
    googleCalendarEventId: "",
    googleMeetUrl: "",
    syncStatus: "none", // none | pending | synced | error
    syncError: "",
    lastSyncAt: "",
    notifiedAt: "", // 참석자에게 초대/변경 알림 메일이 실제 발송된 시점 (서버 설정)
    createdAt: now,
    updatedAt: now,
  };
  for (const k of EVENT_FIELDS) if (input[k] !== undefined) ev[k] = input[k];
  return ev;
}

export function applyEventPatch(event, input) {
  for (const k of EVENT_FIELDS) if (input[k] !== undefined) event[k] = input[k];
  event.updatedAt = new Date().toISOString();
  return event;
}
