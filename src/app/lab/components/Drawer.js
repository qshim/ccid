"use client";

// cciD Lab — right-side detail drawer. One component, four modes:
// project view/edit, new project, event view/edit, new event.
// Click-based editing (accessible without drag), Esc to close.

import { useEffect, useMemo, useState } from "react";
import { pxGrotesk } from "@/fonts/fonts";
import { resolvePhoto } from "@/app/components/members";
import { utcIsoToSeoulLocal, seoulLocalToUtcIso, formatSeoul } from "../lib/tz";
import { EVENT_TYPE_META, PROJECT_STATUS_META, dateProgress } from "../lib/timelineMath";
import { COMM_CHANNELS, newId } from "../lib/model";
import {
  TextField,
  TextArea,
  SelectField,
  CheckField,
  ArrowButton,
  BoxButton,
  GhostButton,
  SectionHeading,
  Tag,
  FieldLabel,
} from "./ui";

const EVENT_TYPES = Object.keys(EVENT_TYPE_META);
const STATUSES = Object.keys(PROJECT_STATUS_META);
const VISIBILITIES = ["internal", "private", "public_candidate"];

// 반복 일정: 드롭다운 선택 ↔ Google RRULE 문자열. 요일/일자는 일정 시작(start)이
// 결정하므로(예: 월요일 22:30 시작 + 매주 → 매주 월요일), FREQ만 다룬다.
// untilDay(프로젝트 종료일)가 있으면 그때까지만 반복.
const RECUR_RULE = { weekly: "FREQ=WEEKLY", biweekly: "FREQ=WEEKLY;INTERVAL=2", monthly: "FREQ=MONTHLY" };
function buildRRule(freq, untilDay) {
  const base = RECUR_RULE[freq];
  if (!base) return "";
  if (untilDay && /^\d{4}-\d{2}-\d{2}$/.test(untilDay)) {
    return `RRULE:${base};UNTIL=${untilDay.replace(/-/g, "")}T145959Z`; // 23:59:59 KST
  }
  return `RRULE:${base}`;
}
function parseFreq(rrule) {
  const r = String(rrule || "").toUpperCase();
  if (r.includes("MONTHLY")) return "monthly";
  if (r.includes("INTERVAL=2")) return "biweekly";
  if (r.includes("WEEKLY")) return "weekly";
  return "none";
}

const ACTIVITY_LABELS = {
  project_created: "프로젝트 생성",
  project_updated: "프로젝트 수정",
  project_status_changed: "상태 변경",
  project_members_changed: "연구원 배정 변경",
  project_archived: "프로젝트 아카이브",
  project_deleted: "프로젝트 삭제",
  event_created: "일정 추가",
  event_updated: "일정 수정",
  event_deleted: "일정 삭제",
  calendar_synced: "캘린더 동기화",
  calendar_sync_failed: "캘린더 동기화 실패",
  google_connected: "Google 연결",
  google_disconnected: "Google 연결 해제",
};

export default function Drawer({
  selection, // { type: 'project'|'event'|'new-project'|'new-event', id?, prefill? }
  projects,
  events,
  researchers,
  activity,
  google,
  onClose,
  onSaveProject, // (id|null, fields) -> Promise<{ok,error}>
  onArchiveProject,
  onSaveEvent, // (id|null, fields) -> Promise<{ok,error}>
  onDeleteEvent, // (id, alsoGoogle)
  onRetrySync,
  onProposeMeeting, // (project) → 미팅 목적 초안 생성 후 새 일정 폼으로 전환
  busy,
  canEdit = true, // false → read-only: inputs & buttons disabled (viewer / not my project)
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const project =
    selection.type === "project" ? projects.find((p) => p.id === selection.id) : null;
  const event = selection.type === "event" ? events.find((e) => e.id === selection.id) : null;

  return (
    <>
      {/* scrim (mobile emphasis) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-primaryB/20 lg:bg-transparent lg:pointer-events-none"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={
          selection.type.startsWith("new")
            ? selection.type === "new-project"
              ? "새 프로젝트"
              : "새 일정"
            : selection.type === "project"
            ? "프로젝트 상세"
            : "일정 상세"
        }
        className={`${pxGrotesk.className} fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] bg-[#F0F0EC] border-l border-primaryB/15 overflow-y-auto scrollbar-hide text-primaryB`}
        style={{ boxShadow: "-12px 0 32px rgba(15,15,19,0.06)" }}
      >
        <div className="px-5 pt-5 pb-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 className="tracking-[-0.03em] leading-[1.22] text-[1.25rem]">
              {selection.type === "new-project" && "New project"}
              {selection.type === "new-project" ? "" : null}
              {selection.type === "new-event" && "New schedule"}
              {selection.type === "project" && (project?.title || "Project")}
              {selection.type === "event" && (event?.title || "Schedule")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="text-[20px] leading-none text-primaryB/50 hover:text-primaryB transition-colors px-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C]"
            >
              ×
            </button>
          </div>

          {!canEdit && (
            <p className="mb-4 -mt-2 text-[11px] uppercase tracking-[0.05em] text-[#956400]">
              읽기 전용 — 수정 권한이 없습니다
            </p>
          )}
          <fieldset disabled={!canEdit} className="min-w-0 border-0 p-0 m-0">
          {(selection.type === "project" || selection.type === "new-project") && (
            <ProjectPanel
              // key: force a fresh mount (and fresh internal form state) whenever
              // the selected project changes — otherwise React reuses the same
              // instance and useState's initializer (which only runs once) keeps
              // showing the FIRST project's members/fields even after the title
              // prop updates.
              key={`project:${project?.id || "new"}`}
              project={project}
              prefill={selection.prefill}
              projects={projects}
              events={events}
              researchers={researchers}
              activity={activity}
              google={google}
              onSave={onSaveProject}
              onArchive={onArchiveProject}
              onRetrySync={onRetrySync}
              onProposeMeeting={onProposeMeeting}
              busy={busy}
            />
          )}
          {(selection.type === "event" || selection.type === "new-event") && (
            <EventPanel
              key={`event:${event?.id || "new"}:${selection.prefill?.projectId || ""}:${selection.prefill?.day || ""}:${selection.prefill?.hour ?? ""}`}
              event={event}
              prefill={selection.prefill}
              projects={projects}
              researchers={researchers}
              google={google}
              onSave={onSaveEvent}
              onDelete={onDeleteEvent}
              onRetrySync={onRetrySync}
              busy={busy}
            />
          )}
          </fieldset>
        </div>
      </aside>
    </>
  );
}

// ---------------- project panel ----------------

function ProjectPanel({
  project,
  prefill,
  events,
  researchers,
  activity,
  google,
  onSave,
  onArchive,
  onRetrySync,
  onProposeMeeting,
  busy,
}) {
  const isNew = !project;
  const [f, setF] = useState(() => ({
    title: project?.title || "",
    titleEn: project?.titleEn || "",
    shortName: project?.shortName || "",
    description: project?.description || "",
    status: project?.status || "planning",
    visibility: project?.visibility || "internal",
    startDate: project?.startDate ? project.startDate.slice(0, 10) : prefill?.startDate || "",
    endDate: project?.endDate ? project.endDate.slice(0, 10) : "",
    projectLead: project?.projectLead || "",
    clientOrPartner: project?.clientOrPartner || "",
    category: project?.category || "",
    color: project?.color || "#4E22D6",
    emphasis: project?.emphasis || false,
    progress: project?.progress ?? 0,
    notes: project?.notes || "",
    commLog: project?.commLog || [],
    members: project?.members || [],
    siteUrl: project?.siteUrl || "",
    figmaLinks: project?.figmaLinks?.length ? project.figmaLinks : [],
  }));
  const [error, setError] = useState("");
  const [addId, setAddId] = useState("");
  const [addName, setAddName] = useState("");

  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  const projectEvents = useMemo(
    () =>
      project
        ? events
            .filter((e) => e.projectId === project.id)
            .sort((a, b) => String(a.start).localeCompare(String(b.start)))
        : [],
    [events, project]
  );
  const nowIso = new Date().toISOString();
  const upcoming = projectEvents.filter((e) => (e.end || e.start) >= nowIso);
  const past = projectEvents.filter((e) => (e.end || e.start) < nowIso);

  const projectActivity = useMemo(
    () => (project ? activity.filter((a) => a.projectId === project.id).slice(0, 12) : []),
    [activity, project]
  );

  const availableToAdd = researchers.filter(
    (r) => r.active && !f.members.some((m) => m.researcherId === r.id)
  );

  const save = async () => {
    setError("");
    // progress is date-derived now — strip it so the stored value stays untouched.
    const { progress: _progress, ...fields } = f;
    const res = await onSave(project?.id || null, fields);
    if (!res.ok) setError(res.error || "저장에 실패했습니다.");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* overview */}
      <section>
        <SectionHeading>Overview</SectionHeading>
        <div className="flex flex-col gap-4">
          <TextField label="프로젝트명 *" value={f.title} onChange={set("title")} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="영문명" value={f.titleEn} onChange={set("titleEn")} />
            <TextField label="짧은 이름" value={f.shortName} onChange={set("shortName")} />
          </div>
          <TextArea label="설명" value={f.description} onChange={set("description")} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="상태" value={f.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </SelectField>
            <SelectField label="공개 범위" value={f.visibility} onChange={set("visibility")}>
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="시작일" type="date" value={f.startDate} onChange={set("startDate")} />
            <TextField label="종료일" type="date" value={f.endDate} onChange={set("endDate")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="리딩 (지도교수)"
              value={f.projectLead}
              onChange={set("projectLead")}
              placeholder="예: 윤선빈 선생님"
            />
            <TextField
              label="클라이언트 / 파트너"
              value={f.clientOrPartner}
              onChange={set("clientOrPartner")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="카테고리" value={f.category} onChange={set("category")} />
            <label className="block">
              <FieldLabel>컬러</FieldLabel>
              <input
                type="color"
                value={f.color}
                onChange={set("color")}
                aria-label="프로젝트 컬러"
                className="w-full h-[26px] bg-transparent border-b border-primaryB/20 cursor-pointer"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={f.emphasis}
              onChange={(e) => setF((s) => ({ ...s, emphasis: e.target.checked }))}
              className="accent-[#4E22D6]"
            />
            <span className="text-[13px] text-primaryB/80">
              강조 표시 — 타임라인·People에서 진한 배경 + 밝은 텍스트
            </span>
          </label>
          {/* 진행률은 수동 입력이 아니라 날짜 기반 자동 계산 (오늘이 기간의 어디쯤인지) */}
          <div>
            <FieldLabel>
              진행률 — {dateProgress({ startDate: f.startDate, endDate: f.endDate })}% (날짜 기반 자동)
            </FieldLabel>
            <span className="relative block h-[4px] w-full rounded-full bg-primaryB/10 overflow-hidden">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${dateProgress({ startDate: f.startDate, endDate: f.endDate })}%`,
                  backgroundColor: f.color || "#4E22D6",
                }}
              />
            </span>
          </div>
        </div>
      </section>

      {/* researchers */}
      <section>
        <SectionHeading>Researchers</SectionHeading>
        {f.members.length === 0 && (
          <p className="text-[13px] text-primaryB/50 mb-3">아직 배정된 연구원이 없습니다.</p>
        )}
        <ul className="flex flex-col gap-2.5 mb-3">
          {f.members.map((m, idx) => {
            const r = researchers.find((x) => x.id === m.researcherId);
            // Ad hoc names can still resolve via a local photo override by exact
            // name match (members.js LOCAL_PHOTOS/SHEET_PHOTOS).
            const photo = r ? resolvePhoto(r.name, r.image) : resolvePhoto(m.researcherId, "");
            return (
              <li key={m.researcherId} className="flex items-center gap-2.5 min-w-0">
                <span className="w-[26px] h-[26px] rounded-full overflow-hidden bg-[#E0E0FF] shrink-0">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="w-full h-full object-cover filter grayscale"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </span>
                <span className="text-[13px] truncate">{r?.name || m.researcherId}</span>
                <input
                  type="text"
                  value={m.role || ""}
                  onChange={(e) =>
                    setF((s) => {
                      const members = [...s.members];
                      members[idx] = { ...members[idx], role: e.target.value };
                      return { ...s, members };
                    })
                  }
                  placeholder="역할"
                  aria-label={`${r?.name || m.researcherId} 역할`}
                  className="flex-1 min-w-0 bg-transparent text-[12px] py-0.5 border-0 border-b border-primaryB/15 focus:outline-none focus:border-primaryB/50 placeholder:text-primaryB/25"
                />
                <GhostButton
                  onClick={() =>
                    setF((s) => ({
                      ...s,
                      members: s.members.filter((x) => x.researcherId !== m.researcherId),
                    }))
                  }
                  aria-label={`${r?.name || m.researcherId} 제거`}
                >
                  제거
                </GhostButton>
              </li>
            );
          })}
        </ul>
        <div className="flex items-end gap-2">
          <SelectField label="연구원 추가" value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">선택…</option>
            {availableToAdd.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.category}
              </option>
            ))}
          </SelectField>
          <BoxButton
            onClick={() => {
              if (!addId) return;
              setF((s) => ({
                ...s,
                members: [...s.members, { researcherId: addId, role: "" }],
              }));
              setAddId("");
            }}
            disabled={!addId}
          >
            추가
          </BoxButton>
        </div>
        {/* 명단(공개 People 시트)에 없는 인원도 이름으로 바로 추가할 수 있음 — 사진은
            빈 컬러로 대체되고, 시트에 정식 등록되면 자동으로 사진·정보가 연결된다. */}
        <div className="flex items-end gap-2 mt-2">
          <TextField
            label="명단에 없는 인원 — 이름으로 추가"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="예: 이채영"
          />
          <BoxButton
            onClick={() => {
              const name = addName.trim();
              if (!name) return;
              const dup = f.members.some(
                (m) => m.researcherId.toLowerCase() === name.toLowerCase()
              );
              if (dup) { setAddName(""); return; }
              setF((s) => ({ ...s, members: [...s.members, { researcherId: name, role: "" }] }));
              setAddName("");
            }}
            disabled={!addName.trim()}
          >
            추가
          </BoxButton>
        </div>
      </section>

      {/* links: 프로젝트 사이트(단일) + 피그마(여러 개) */}
      <section>
        <SectionHeading>Links</SectionHeading>
        <div className="mb-4">
          <TextField
            label="프로젝트 사이트 / 데모 URL"
            type="url"
            value={f.siteUrl}
            onChange={set("siteUrl")}
            placeholder="https://…"
          />
        </div>
        <FieldLabel>Figma (여러 개 가능)</FieldLabel>
        <ul className="flex flex-col gap-2 mb-2">
          {f.figmaLinks.map((link, idx) => (
            <li key={idx} className="flex items-end gap-2">
              <div className="w-[110px] shrink-0">
                <input
                  value={link.label || ""}
                  onChange={(e) =>
                    setF((s) => {
                      const next = [...s.figmaLinks];
                      next[idx] = { ...next[idx], label: e.target.value };
                      return { ...s, figmaLinks: next };
                    })
                  }
                  placeholder="라벨"
                  aria-label={`Figma ${idx + 1} 라벨`}
                  className="w-full bg-transparent text-[13px] py-1 border-0 border-b border-primaryB/20 focus:outline-none focus:border-primaryB placeholder:text-primaryB/30"
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  value={link.url || ""}
                  onChange={(e) =>
                    setF((s) => {
                      const next = [...s.figmaLinks];
                      next[idx] = { ...next[idx], url: e.target.value };
                      return { ...s, figmaLinks: next };
                    })
                  }
                  placeholder="https://figma.com/…"
                  aria-label={`Figma ${idx + 1} URL`}
                  className="w-full bg-transparent text-[13px] py-1 border-0 border-b border-primaryB/20 focus:outline-none focus:border-primaryB placeholder:text-primaryB/30"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setF((s) => ({ ...s, figmaLinks: s.figmaLinks.filter((_, i) => i !== idx) }))
                }
                aria-label={`Figma ${idx + 1} 삭제`}
                className="text-[16px] leading-none text-primaryB/40 hover:text-primaryB px-1 pb-1"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <GhostButton
          onClick={() => setF((s) => ({ ...s, figmaLinks: [...s.figmaLinks, { label: "", url: "" }] }))}
        >
          + Figma 링크 추가
        </GhostButton>
      </section>

      {/* schedules (existing project only) */}
      {!isNew && (
        <section>
          <SectionHeading>Schedules</SectionHeading>
          {/* 미팅 목적을 프로젝트 컨텍스트로 초안 생성 → 새 일정 폼에서 확인 후 저장
              (저장 시 Google Calendar + Meet 생성은 기존 동기화 경로를 그대로 탄다) */}
          <div className="mb-3">
            <ArrowButton onClick={() => onProposeMeeting(project)} disabled={busy}>
              {busy ? "미팅 제안 생성 중…" : "미팅 제안 (목적·안건 자동 작성)"}
            </ArrowButton>
          </div>
          {projectEvents.length === 0 && (
            <p className="text-[13px] text-primaryB/50">
              등록된 일정이 없습니다. 타임라인의 빈 영역을 클릭해 추가하세요.
            </p>
          )}
          {upcoming.length > 0 && (
            <EventMiniList title="예정" list={upcoming} onRetrySync={onRetrySync} />
          )}
          {past.length > 0 && <EventMiniList title="지난 일정" list={past.slice(-5)} dim />}
        </section>
      )}

      {/* calendar */}
      {!isNew && (
        <section>
          <SectionHeading>Calendar</SectionHeading>
          <GoogleSummary google={google} />
        </section>
      )}

      {/* communication — manual log of updates from KakaoTalk/email/calls with
          the lead/partner. There is no live chat integration; this is a place
          to jot down what was discussed, so progress stays visible over time. */}
      <section>
        <SectionHeading>Communication</SectionHeading>
        <CommLogEditor value={f.commLog} onChange={(next) => setF((s) => ({ ...s, commLog: next }))} />
      </section>

      {/* notes */}
      <section>
        <SectionHeading>Notes</SectionHeading>
        <TextArea label="내부 메모" value={f.notes} onChange={set("notes")} />
        {project && (
          <p className="mt-2 text-[11px] text-primaryB/40">
            마지막 수정 {formatSeoul(project.updatedAt)} · admin
          </p>
        )}
      </section>

      {/* activity */}
      {!isNew && projectActivity.length > 0 && (
        <section>
          <SectionHeading>Activity</SectionHeading>
          <ul className="flex flex-col gap-1.5">
            {projectActivity.map((a) => (
              <li key={a.id} className="text-[12px] text-primaryB/60 flex justify-between gap-3">
                <span>{ACTIVITY_LABELS[a.type] || a.type}</span>
                <span className="text-primaryB/40 shrink-0">{formatSeoul(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-[#9F2F2D]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-primaryB/10">
        <ArrowButton onClick={save} disabled={busy}>
          {isNew ? "프로젝트 생성" : "저장"}
        </ArrowButton>
        {!isNew && (
          <GhostButton onClick={() => onArchive(project.id, project.status === "archived")}>
            {project.status === "archived" ? "완전 삭제" : "아카이브"}
          </GhostButton>
        )}
      </div>
    </div>
  );
}

function EventMiniList({ title, list, dim = false, onRetrySync }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] uppercase tracking-[0.05em] text-primaryB/40 mb-1.5">{title}</p>
      <ul className={`flex flex-col gap-1.5 ${dim ? "opacity-55" : ""}`}>
        {list.map((e) => {
          const meta = EVENT_TYPE_META[e.eventType] || EVENT_TYPE_META.other;
          // 종일 이벤트는 시간 없이 날짜만 — 다일(주차 블록)이면 시작~종료 범위.
          const dateOnly = (iso) => formatSeoul(iso, { hour: undefined, minute: undefined });
          let when;
          if (e.allDay) {
            const s = dateOnly(e.start);
            const en = e.end ? dateOnly(e.end) : "";
            when = en && en !== s ? `${s} – ${en}` : s;
          } else {
            when = formatSeoul(e.start);
          }
          return (
            <li key={e.id} className="flex items-center gap-2 text-[13px] min-w-0">
              <Tag color={meta.color}>{meta.tag}</Tag>
              <span className="truncate">{e.title}</span>
              <span className="text-primaryB/40 text-[11px] shrink-0 ml-auto">
                {when}
              </span>
              {e.googleMeetUrl && (
                <a
                  href={e.googleMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#5D009C] hover:underline shrink-0"
                >
                  Meet
                </a>
              )}
              {e.syncStatus === "error" && onRetrySync && (
                <GhostButton onClick={() => onRetrySync(e.id)} aria-label="동기화 재시도">
                  재동기화
                </GhostButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GoogleSummary({ google }) {
  if (!google?.connected) {
    return (
      <div className="text-[13px] text-primaryB/60 flex items-center justify-between gap-3">
        <span>Google Calendar 미연결</span>
        <a
          href="/api/lab/google/connect"
          className="text-[#5D009C] font-medium hover:text-[#7a1fc0] transition-colors"
        >
          연결하기 →
        </a>
      </div>
    );
  }
  return (
    <div className="text-[13px] text-primaryB/70 flex flex-col gap-1">
      <span>
        연결됨 — {google.email || "Google 계정"} · 캘린더 {google.calendarId}
      </span>
      {google.lastSyncAt && (
        <span className="text-[11px] text-primaryB/40">
          마지막 동기화 {formatSeoul(google.lastSyncAt)}
        </span>
      )}
    </div>
  );
}

// ---------------- communication log ----------------
// Manual timeline of external updates (KakaoTalk, email, calls) — there's no
// live chat integration, so this is where progress gets written down after the
// fact. Newest first; add-only from the UI (entries aren't editable in place —
// fix typos directly in the sheet if using the sheets backend).

const CHANNEL_LABEL = Object.fromEntries(COMM_CHANNELS.map((c) => [c.key, c.label]));

function CommLogEditor({ value, onChange }) {
  const [channel, setChannel] = useState(COMM_CHANNELS[0].key);
  const [note, setNote] = useState("");
  const entries = Array.isArray(value) ? value : [];
  const ordered = [...entries].reverse(); // newest first for display

  const add = () => {
    const text = note.trim();
    if (!text) return;
    onChange([...entries, { id: newId("cl"), at: new Date().toISOString(), channel, note: text }]);
    setNote("");
  };

  return (
    <div className="flex flex-col gap-3">
      {ordered.length === 0 && (
        <p className="text-[13px] text-primaryB/50">
          아직 기록이 없습니다. 카카오톡·이메일·통화 등에서 있었던 논의를 적어두세요.
        </p>
      )}
      {ordered.length > 0 && (
        <ul className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
          {ordered.map((e) => (
            <li key={e.id} className="text-[13px] leading-[1.5]">
              <div className="flex items-center gap-2 mb-0.5">
                <Tag color="#7A6BB0">{CHANNEL_LABEL[e.channel] || e.channel}</Tag>
                {e.at && <span className="text-[11px] text-primaryB/40">{formatSeoul(e.at)}</span>}
              </div>
              <p className="text-primaryB/80 whitespace-pre-wrap">{e.note}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <SelectField label="채널" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {COMM_CHANNELS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </SelectField>
        </div>
        <TextArea
          label="내용"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 지도교수님께 중간 점검 일정 공유, 8/31로 확정"
        />
        <div>
          <BoxButton onClick={add} disabled={!note.trim()}>
            기록 추가
          </BoxButton>
        </div>
      </div>
      <p className="text-[11px] text-primaryB/35">
        저장 버튼을 눌러야 최종 반영됩니다. 실시간 채팅 연동은 없어 수동 기록만 지원합니다.
      </p>
    </div>
  );
}

// ---------------- event panel ----------------

function EventPanel({
  event,
  prefill,
  projects,
  researchers,
  google,
  onSave,
  onDelete,
  onRetrySync,
  busy,
}) {
  const isNew = !event;
  const [f, setF] = useState(() => ({
    projectId: event?.projectId || prefill?.projectId || projects[0]?.id || "",
    title: event?.title || prefill?.title || "",
    description: event?.description || prefill?.description || "",
    eventType: event?.eventType || prefill?.eventType || "meeting",
    startLocal: event?.start
      ? utcIsoToSeoulLocal(event.start)
      : prefill?.startLocal ||
        (prefill?.day ? `${prefill.day}T${String(prefill.hour ?? 10).padStart(2, "0")}:00` : ""),
    endLocal: event?.end ? utcIsoToSeoulLocal(event.end) : prefill?.endLocal || "",
    allDay: event?.allDay || false,
    location: event?.location || prefill?.location || "",
    attendees: event?.attendees || prefill?.attendees || "",
    assignedResearchers: event?.assignedResearchers || [],
    reminder: event?.reminder || "",
    recurrence: event?.recurrence || "",
    notes: event?.notes || "",
    wantCalendar: event?.wantCalendar || prefill?.wantCalendar || false,
    wantMeet: event?.wantMeet || prefill?.wantMeet || false,
  }));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [addName, setAddName] = useState("");
  const [addId, setAddId] = useState("");

  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const save = async () => {
    setError("");
    if (f.endLocal && f.startLocal && f.endLocal < f.startLocal) {
      setError("종료 일시가 시작 일시보다 빠를 수 없습니다.");
      return;
    }
    const res = await onSave(event?.id || null, {
      projectId: f.projectId,
      title: f.title,
      description: f.description,
      eventType: f.eventType,
      start: seoulLocalToUtcIso(f.startLocal),
      end: f.endLocal ? seoulLocalToUtcIso(f.endLocal) : "",
      allDay: f.allDay,
      location: f.location,
      attendees: f.attendees,
      assignedResearchers: f.assignedResearchers,
      reminder: f.reminder,
      recurrence: f.recurrence,
      notes: f.notes,
      wantCalendar: f.wantCalendar,
      wantMeet: f.wantMeet,
    });
    if (!res.ok) setError(res.error || "저장에 실패했습니다.");
  };

  const meta = EVENT_TYPE_META[f.eventType] || EVENT_TYPE_META.other;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeading>Schedule</SectionHeading>
        <div className="flex flex-col gap-4">
          <TextField label="일정 제목 *" value={f.title} onChange={set("title")} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="프로젝트 *" value={f.projectId} onChange={set("projectId")}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName || p.title}
                </option>
              ))}
            </SelectField>
            <SelectField label="유형" value={f.eventType} onChange={set("eventType")}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_META[t].tag} — {t}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="시작 (KST) *"
              type="datetime-local"
              value={f.startLocal}
              onChange={set("startLocal")}
            />
            <TextField
              label="종료 (KST)"
              type="datetime-local"
              value={f.endLocal}
              onChange={set("endLocal")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <SelectField
                label="반복"
                value={parseFreq(f.recurrence)}
                onChange={(e) => {
                  const proj = projects.find((p) => p.id === f.projectId);
                  const untilDay = proj?.endDate ? String(proj.endDate).slice(0, 10) : "";
                  setF((s) => ({ ...s, recurrence: buildRRule(e.target.value, untilDay) }));
                }}
              >
                <option value="none">반복 없음</option>
                <option value="weekly">매주</option>
                <option value="biweekly">격주</option>
                <option value="monthly">매월</option>
              </SelectField>
              {f.recurrence && (
                <p className="text-[11px] text-primaryB/45 mt-1">
                  {(() => {
                    const proj = projects.find((p) => p.id === f.projectId);
                    return proj?.endDate
                      ? `프로젝트 종료일(${String(proj.endDate).slice(0, 10)})까지 반복`
                      : "종료일 없이 반복";
                  })()}
                </p>
              )}
            </div>
            <CheckField label="종일 일정" checked={f.allDay} onChange={set("allDay")} />
          </div>
          <TextField label="장소" value={f.location} onChange={set("location")} />
          <TextArea label="설명" value={f.description} onChange={set("description")} />
        </div>
      </section>

      <section>
        <SectionHeading>People</SectionHeading>
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>담당 연구원</FieldLabel>
            {/* 배정된 사람만 칩으로 표시 (전체 명단 나열 안 함). 추가는 아래 드롭다운/이름 입력. */}
            {f.assignedResearchers.length === 0 ? (
              <p className="text-[13px] text-primaryB/40">아직 배정된 연구원이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {f.assignedResearchers.map((id) => {
                  const r = researchers.find((x) => x.id === id);
                  const name = r?.name || id;
                  const photo = r ? resolvePhoto(r.name, r.image) : resolvePhoto(id, "");
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${name} 제거`}
                      onClick={() =>
                        setF((s) => ({
                          ...s,
                          assignedResearchers: s.assignedResearchers.filter((x) => x !== id),
                        }))
                      }
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-[3px] text-[11px] leading-none rounded-full border border-[#4E22D6] bg-[#4E22D6]/10 text-[#4E22D6] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C]"
                    >
                      <span className="w-[20px] h-[20px] rounded-full overflow-hidden bg-[#E0E0FF] shrink-0">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover filter grayscale" referrerPolicy="no-referrer" />
                        )}
                      </span>
                      {name}
                      <span aria-hidden="true" className="text-[13px] leading-none opacity-60">×</span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* 명단에서 드롭다운으로 추가 */}
            <div className="mt-2">
              <SelectField
                label="연구원 추가"
                value={addId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) setF((s) => ({ ...s, assignedResearchers: [...s.assignedResearchers, id] }));
                  setAddId("");
                }}
              >
                <option value="">연구원 선택…</option>
                {researchers
                  .filter((r) => r.active && !f.assignedResearchers.includes(r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </SelectField>
            </div>
            {/* 명단에 없는 인원도 이름으로 추가 */}
            <div className="flex items-end gap-2 mt-2">
              <TextField
                label="명단에 없는 인원 — 이름으로 추가"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="예: 이채영"
              />
              <BoxButton
                onClick={() => {
                  const name = addName.trim();
                  if (!name) return;
                  if (f.assignedResearchers.some((x) => x.toLowerCase() === name.toLowerCase())) {
                    setAddName("");
                    return;
                  }
                  setF((s) => ({ ...s, assignedResearchers: [...s.assignedResearchers, name] }));
                  setAddName("");
                }}
                disabled={!addName.trim()}
              >
                추가
              </BoxButton>
            </div>
          </div>
          <TextField
            label="참석자 이메일 (쉼표 구분)"
            value={f.attendees}
            onChange={set("attendees")}
            placeholder="name@example.com, …"
          />
          {(() => {
            // 배정된 연구원 중 이메일이 등록된 사람 → 참석자 칸에 자동 추가.
            const emails = f.assignedResearchers
              .map((id) => researchers.find((r) => r.id === id)?.email)
              .filter(Boolean);
            const have = new Set(
              f.attendees.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
            );
            const missing = emails.filter((e) => !have.has(e.toLowerCase()));
            const noEmailCount = f.assignedResearchers.length - emails.length;
            if (f.assignedResearchers.length === 0) return null;
            return (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GhostButton
                  onClick={() =>
                    setF((s) => {
                      const cur = s.attendees
                        .split(/[,\s]+/)
                        .map((x) => x.trim())
                        .filter(Boolean);
                      const set2 = new Set(cur.map((x) => x.toLowerCase()));
                      for (const e of emails) if (!set2.has(e.toLowerCase())) cur.push(e);
                      return { ...s, attendees: cur.join(", ") };
                    })
                  }
                  disabled={missing.length === 0}
                >
                  배정 연구원 이메일 채우기{missing.length ? ` (+${missing.length})` : ""}
                </GhostButton>
                {noEmailCount > 0 && (
                  <span className="text-[11px] text-primaryB/40">
                    {noEmailCount}명 이메일 미등록
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      <section>
        <SectionHeading>Google</SectionHeading>
        <div className="flex flex-col gap-2.5">
          <GoogleSummary google={google} />
          <CheckField
            label="Google Calendar에 추가"
            checked={f.wantCalendar}
            onChange={set("wantCalendar")}
            disabled={!google?.connected}
          />
          <CheckField
            label="Google Meet 링크 생성"
            checked={f.wantMeet}
            onChange={set("wantMeet")}
            disabled={!google?.connected || !f.wantCalendar}
          />
          {f.wantCalendar && (
            <SelectField label="이메일·팝업 알림 (참석자 전원)" value={f.reminder} onChange={set("reminder")}>
              <option value="">캘린더 기본값</option>
              <option value="10">10분 전</option>
              <option value="30">30분 전</option>
              <option value="60">1시간 전</option>
              <option value="1440">1일 전</option>
            </SelectField>
          )}
          {event?.googleMeetUrl && (
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-primaryB/60 truncate">{event.googleMeetUrl}</span>
              <GhostButton
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(event.googleMeetUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
              >
                {copied ? "복사됨" : "복사"}
              </GhostButton>
              <a
                href={event.googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#5D009C] hover:underline shrink-0"
              >
                열기
              </a>
            </div>
          )}
          {event?.syncStatus === "synced" && (
            <p className="text-[11px] text-[#346538]">
              Google Calendar 동기화됨 · {formatSeoul(event.lastSyncAt)}
            </p>
          )}
          {event?.syncStatus === "error" && (
            <div className="text-[12px] text-[#9F2F2D] flex items-center justify-between gap-2">
              <span className="min-w-0">동기화 실패 — {event.syncError}</span>
              <BoxButton onClick={() => onRetrySync(event.id)} disabled={busy}>
                재시도
              </BoxButton>
            </div>
          )}
          {/* 참석자 알림(초대/변경 메일) 발송 상태 + 수동 발송. 저장/동기화 시
              sendUpdates=all로 자동 발송되며, 그 시점을 notifiedAt에 기록해 표시한다. */}
          {f.wantCalendar && String(f.attendees || "").includes("@") && (
            <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-primaryB/10">
              <span className="text-[12px] min-w-0">
                {event?.notifiedAt ? (
                  <span className="text-[#346538]">✉ 참석자에게 알림 발송됨 · {formatSeoul(event.notifiedAt)}</span>
                ) : (
                  <span className="text-primaryB/50">
                    {isNew ? "저장하면 참석자에게 알림 메일이 발송됩니다" : "아직 알림 미발송"}
                  </span>
                )}
              </span>
              {!isNew && event?.googleCalendarEventId && (
                <BoxButton onClick={() => onRetrySync(event.id)} disabled={busy}>
                  {busy ? "발송 중…" : event?.notifiedAt ? "알림 다시 보내기" : "알림 메일 발송"}
                </BoxButton>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeading>Notes</SectionHeading>
        <TextArea label="내부 메모" value={f.notes} onChange={set("notes")} />
      </section>

      {error && (
        <p role="alert" className="text-[13px] text-[#9F2F2D]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-primaryB/10">
        <ArrowButton onClick={save} disabled={busy}>
          {isNew ? "일정 추가" : "저장"}
        </ArrowButton>
        {!isNew && (
          <GhostButton
            onClick={() => {
              const alsoGoogle = event.googleCalendarEventId
                ? window.confirm("Google Calendar의 이벤트도 함께 삭제할까요? (취소 = 내부만 삭제)")
                : false;
              if (window.confirm(`"${event.title}" 일정을 삭제할까요?`)) {
                onDelete(event.id, alsoGoogle);
              }
            }}
          >
            삭제
          </GhostButton>
        )}
      </div>

      <p className="text-[11px] text-primaryB/35">
        <Tag color={meta.color}>{meta.tag}</Tag>{" "}
        <span className="align-middle">시간대: Asia/Seoul · 저장은 UTC 기준</span>
      </p>
    </div>
  );
}
