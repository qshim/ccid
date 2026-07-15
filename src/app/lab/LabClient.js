"use client";

// cciD Lab — Research Operations shell.
// Top bar (identity, actions, zoom, search/filters) + timeline + detail drawer.
// Mobile (<lg) gets a simplified project/schedule list instead of a cramped
// timeline editor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { neuehaas, pxGrotesk } from "@/fonts/fonts";
import Timeline from "./components/Timeline";
import PeopleView from "./components/PeopleView";
import { TableView, BoardView } from "./components/Boards";
import Drawer from "./components/Drawer";
import { ArrowButton, BoxButton, GhostButton } from "./components/ui";
import { ZOOMS, EVENT_TYPE_META, PROJECT_STATUS_META, toDayStr } from "./lib/timelineMath";
import { formatSeoul } from "./lib/tz";

export default function LabClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selection, setSelection] = useState(null); // drawer state

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [researcherFilter, setResearcherFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(1); // week
  const [view, setView] = useState("timeline"); // timeline | table | board
  const timelineRef = useRef(null);

  const zoom = ZOOMS[zoomIdx];

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lab/data", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/lab/login");
        return;
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
      setLoadError("");
    } catch (err) {
      setLoadError(String(err?.message || "데이터를 불러오지 못했습니다."));
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Google OAuth round-trip feedback (?google_connected / ?google_error)
  useEffect(() => {
    const connected = searchParams.get("google_connected");
    const gerr = searchParams.get("google_error");
    if (connected) setNotice("Google Calendar가 연결되었습니다.");
    if (gerr) setNotice(`Google 연동 오류 — ${gerr}`);
    if (connected || gerr) {
      router.replace("/lab");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const api = useCallback(
    async (path, options) => {
      setBusy(true);
      try {
        const res = await fetch(path, {
          headers: { "Content-Type": "application/json" },
          ...options,
        });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.replace("/lab/login");
          return { ok: false, error: "세션이 만료되었습니다. 다시 로그인하세요." };
        }
        if (!json?.ok) return { ok: false, error: json?.error || `오류 (${res.status})` };
        await load();
        return json;
      } catch {
        return { ok: false, error: "네트워크 오류가 발생했습니다. 연결을 확인하세요." };
      } finally {
        setBusy(false);
      }
    },
    [load, router]
  );

  // ---- mutations ----
  const saveProject = async (id, fields) => {
    const res = id
      ? await api(`/api/lab/projects/${id}`, { method: "PATCH", body: JSON.stringify(fields) })
      : await api("/api/lab/projects", { method: "POST", body: JSON.stringify(fields) });
    if (res.ok) {
      setNotice(id ? "프로젝트가 저장되었습니다." : "프로젝트가 생성되었습니다.");
      if (!id && res.project) setSelection({ type: "project", id: res.project.id });
    }
    return res;
  };

  const archiveProject = async (id, isArchivedAlready) => {
    const msg = isArchivedAlready
      ? "아카이브된 프로젝트를 완전히 삭제할까요? 되돌릴 수 없습니다."
      : "프로젝트를 아카이브할까요? (일정 데이터는 유지됩니다)";
    if (!window.confirm(msg)) return;
    const res = await api(`/api/lab/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotice(res.mode === "deleted" ? "프로젝트가 삭제되었습니다." : "프로젝트가 아카이브되었습니다.");
      setSelection(null);
    } else {
      setNotice(res.error);
    }
  };

  const saveEvent = async (id, fields) => {
    const res = id
      ? await api(`/api/lab/events/${id}`, { method: "PATCH", body: JSON.stringify(fields) })
      : await api("/api/lab/events", { method: "POST", body: JSON.stringify(fields) });
    if (res.ok) {
      const ev = res.event;
      if (ev?.syncStatus === "error") {
        setNotice("일정은 저장되었지만 Google 동기화에 실패했습니다. 드로어에서 재시도할 수 있습니다.");
      } else {
        setNotice(id ? "일정이 저장되었습니다." : "일정이 추가되었습니다.");
      }
      if (!id && ev) setSelection({ type: "event", id: ev.id });
    }
    return res;
  };

  const deleteEvent = async (id, alsoGoogle) => {
    const res = await api(`/api/lab/events/${id}?google=${alsoGoogle ? "1" : "0"}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotice(res.googleWarning || "일정이 삭제되었습니다.");
      setSelection(null);
    } else {
      setNotice(res.error);
    }
  };

  const retrySync = async (id) => {
    setBusy(true);
    try {
      const res = await api(`/api/lab/events/${id}/sync`, { method: "POST" });
      setNotice(
        res.ok && res.event?.syncStatus === "synced"
          ? res.event?.notifiedAt
            ? "참석자에게 알림 메일을 발송했습니다."
            : "Google Calendar와 동기화되었습니다."
          : `동기화 실패 — ${res.event?.syncError || res.error || "알 수 없는 오류"}`
      );
      await load(); // notifiedAt/syncStatus 갱신을 드로어에 반영
    } finally {
      setBusy(false);
    }
  };

  // 미팅 목적·안건 초안을 서버(AI/템플릿)에서 받아 새 일정 폼으로 전환.
  // 저장은 사용자가 폼에서 확인한 뒤에만 — 그때 Calendar+Meet 동기화가 실행된다.
  const proposeMeeting = async (project) => {
    if (!project) return;
    setBusy(true);
    try {
      const res = await api(`/api/lab/projects/${project.id}/suggest-meeting`, { method: "POST" });
      if (!res.ok) {
        setNotice(res.error || "미팅 제안 생성에 실패했습니다.");
        return;
      }
      // 다음 영업일 14:00 시작안 (사용자가 폼에서 조정)
      const d = new Date();
      do d.setDate(d.getDate() + 1);
      while ([0, 6].includes(d.getDay()));
      const day = toDayStr(d);
      const startLocal = `${day}T14:00`;
      const endH = 14 + Math.floor((res.draft.durationMin || 60) / 60);
      const endM = (res.draft.durationMin || 60) % 60;
      const endLocal = `${day}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      setSelection({
        type: "new-event",
        prefill: {
          projectId: project.id,
          title: res.draft.title,
          description: res.draft.purpose,
          eventType: "meeting",
          startLocal,
          endLocal,
          wantCalendar: true,
          wantMeet: true,
        },
      });
      setNotice(
        res.source === "ai"
          ? "AI가 작성한 미팅 목적입니다. 내용을 확인·수정 후 저장하세요."
          : "미팅 초안입니다. 내용을 확인·수정 후 저장하세요."
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/lab/logout", { method: "POST" });
    router.replace("/lab/login");
  };

  // ---- derived ----
  const projects = data?.projects || [];
  const events = data?.events || [];
  const researchers = data?.researchers || [];
  const researcherById = useMemo(
    () => Object.fromEntries(researchers.map((r) => [r.id, r])),
    [researchers]
  );

  const filteredProjects = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects
      .filter((p) => (showArchived ? true : p.status !== "archived"))
      .filter((p) => (statusFilter ? p.status === statusFilter : true))
      .filter((p) =>
        researcherFilter
          ? p.members?.some((m) => m.researcherId === researcherFilter) ||
            String(p.projectLead || "")
              .split(/[,;]/)
              .map((s) => s.trim())
              .includes(researcherFilter)
          : true
      )
      .filter((p) =>
        needle
          ? [p.title, p.titleEn, p.shortName, p.clientOrPartner, p.category]
              .join(" ")
              .toLowerCase()
              .includes(needle)
          : true
      )
      // shortName의 번호("6. 현대차 산학 1/2")로 자연 정렬 → 분리한 프로젝트가 나란히.
      .sort((a, b) =>
        String(a.shortName || a.title || "").localeCompare(
          String(b.shortName || b.title || ""),
          "en",
          { numeric: true }
        )
      );
  }, [projects, q, statusFilter, researcherFilter, showArchived]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => (typeFilter ? e.eventType === typeFilter : true))
      .filter((e) =>
        researcherFilter ? (e.assignedResearchers || []).includes(researcherFilter) || true : true
      );
  }, [events, typeFilter, researcherFilter]);

  // ---- render ----
  if (loadError) {
    return (
      <Shell onLogout={logout}>
        <div className="px-6 py-16 text-[15px] text-primaryB/70">
          {loadError}{" "}
          <GhostButton onClick={load} className="ml-2">
            다시 시도
          </GhostButton>
        </div>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell onLogout={logout}>
        <div className="px-6 py-16 text-[14px] text-primaryB/50">Loading…</div>
      </Shell>
    );
  }

  // ---- roles ----
  // me.role: admin(모두) | leader(본인 리드 프로젝트만) | viewer(읽기 전용).
  // 서버가 최종 검증하므로 여기서는 UI 노출만 조정한다.
  const me = data.me || { role: "admin", person: "", name: "admin" };
  const leadsOf = (p) =>
    String(p?.projectLead || "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  const canEditProjectFn = (p) =>
    me.role === "admin" || (me.role === "leader" && !!p && leadsOf(p).includes(me.person));
  const canCreate = me.role !== "viewer";
  const drawerCanEdit = (() => {
    if (!selection) return true;
    if (selection.type === "new-project" || selection.type === "new-event") return canCreate;
    if (selection.type === "project")
      return canEditProjectFn(projects.find((p) => p.id === selection.id));
    if (selection.type === "event") {
      const ev = events.find((e) => e.id === selection.id);
      return canEditProjectFn(projects.find((p) => p.id === ev?.projectId));
    }
    return false;
  })();

  return (
    <Shell onLogout={logout} google={data.google} backend={data.backend} me={me}>
      {/* toolbar */}
      <div className="px-4 sm:px-6 flex flex-wrap items-center gap-x-4 gap-y-3 pb-4">
        {canCreate && (
          <>
            <ArrowButton onClick={() => setSelection({ type: "new-project" })}>New project</ArrowButton>
            <ArrowButton
              onClick={() => setSelection({ type: "new-event", prefill: { day: toDayStr(new Date()) } })}
              disabled={projects.length === 0}
            >
              New schedule
            </ArrowButton>
          </>
        )}

        <span className="hidden lg:flex items-center gap-1.5 ml-auto">
          {[
            { key: "timeline", label: "Timeline" },
            { key: "table", label: "Table" },
            { key: "board", label: "Board" },
          ].map((v) => (
            <BoxButton key={v.key} active={view === v.key} onClick={() => setView(v.key)} aria-label={`${v.label} 뷰`}>
              {v.label}
            </BoxButton>
          ))}
          {view === "timeline" && (
            <>
              <span aria-hidden="true" className="w-px h-[18px] bg-primaryB/15 mx-1" />
              <BoxButton onClick={() => timelineRef.current?.scrollToToday()}>Today</BoxButton>
              {ZOOMS.map((z, i) => (
                <BoxButton key={z.key} active={i === zoomIdx} onClick={() => setZoomIdx(i)} aria-label={`${z.label} 보기`}>
                  {z.label}
                </BoxButton>
              ))}
            </>
          )}
        </span>

        <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="프로젝트 검색"
            aria-label="프로젝트 검색"
            className="w-[180px] bg-transparent text-[13px] py-1 border-0 border-b border-primaryB/20 focus:outline-none focus:border-primaryB placeholder:text-primaryB/30"
          />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} label="상태">
            <option value="">모든 상태</option>
            {Object.entries(PROJECT_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={researcherFilter} onChange={setResearcherFilter} label="연구원">
            <option value="">모든 연구원</option>
            {researchers
              .filter((r) => r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </FilterSelect>
          <FilterSelect value={typeFilter} onChange={setTypeFilter} label="일정 유형">
            <option value="">모든 유형</option>
            {Object.entries(EVENT_TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.tag} — {k}
              </option>
            ))}
          </FilterSelect>
          <label className="inline-flex items-center gap-1.5 text-[12px] text-primaryB/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="appearance-none w-[12px] h-[12px] border border-primaryB/40 checked:bg-[#4E22D6] checked:border-[#4E22D6]"
            />
            아카이브 포함
          </label>
        </div>
      </div>

      {/* notice */}
      {notice && (
        <div role="status" className="px-4 sm:px-6 pb-3">
          <p className="text-[13px] text-[#5D009C]">{notice}</p>
        </div>
      )}

      {/* desktop main view: timeline | table | board */}
      <div className="hidden lg:block px-6 pb-8">
        {view === "timeline" && (
          <>
            <Timeline
              projects={filteredProjects}
              events={filteredEvents}
              researchers={researchers}
              pxPerDay={zoom.pxPerDay}
              zoomKey={zoom.key}
              scrollRef={timelineRef}
              onOpenProject={(id) => setSelection({ type: "project", id })}
              onOpenEvent={(id) => setSelection({ type: "event", id })}
              onCreateEventAt={(projectId, day, hour) =>
                setSelection({ type: "new-event", prefill: { projectId, day, hour } })
              }
            />
            <p className="mt-2 text-[11px] text-primaryB/35">
              빈 타임라인 영역 클릭 → 해당 날짜에 새 일정 · 블록 클릭 → 상세 편집
            </p>
          </>
        )}
        {view === "table" && (
          <TableView
            projects={filteredProjects}
            researchers={researchers}
            onOpenProject={(id) => setSelection({ type: "project", id })}
          />
        )}
        {view === "board" && (
          <BoardView
            projects={filteredProjects}
            events={filteredEvents}
            researchers={researchers}
            onOpenProject={(id) => setSelection({ type: "project", id })}
          />
        )}
      </div>

      {/* desktop: people — who's on what, independent of the project filters above */}
      <div className="hidden lg:block px-6 pb-10">
        <PeopleView researchers={researchers} projects={projects} selectedProjectId={selection?.type === "project" ? selection.id : null} onOpenProject={(id) => setSelection({ type: "project", id })} />
      </div>

      {/* mobile: simplified list */}
      <div className="lg:hidden px-4 pb-10 flex flex-col gap-6">
        {filteredProjects.length === 0 && (
          <p className="text-[14px] text-primaryB/50">표시할 프로젝트가 없습니다.</p>
        )}
        {filteredProjects.map((p) => {
          const status = PROJECT_STATUS_META[p.status] || PROJECT_STATUS_META.planning;
          const upcoming = filteredEvents
            .filter((e) => e.projectId === p.id && (e.end || e.start) >= new Date().toISOString())
            .sort((a, b) => String(a.start).localeCompare(String(b.start)))
            .slice(0, 3);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelection({ type: "project", id: p.id })}
              className="text-left border-b border-primaryB/10 pb-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C]"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-[15px] font-medium">{p.title}</span>
              </div>
              <p className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888] mt-0.5">
                {status.label}
                {p.startDate ? ` · ${p.startDate.slice(0, 10)} → ${p.endDate ? p.endDate.slice(0, 10) : ""}` : ""}
              </p>
              {p.projectLead && (
                <p className="text-[12px] font-medium text-primaryB/85 mt-0.5">
                  <span className="font-light uppercase text-[10px] tracking-[0.05em] text-[#888] mr-1.5">Lead</span>
                  {String(p.projectLead)
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((id) => researcherById[id]?.name || id)
                    .join(", ")}
                </p>
              )}
              {upcoming.map((e) => (
                <p key={e.id} className="text-[12px] text-primaryB/60 mt-1">
                  {(EVENT_TYPE_META[e.eventType] || EVENT_TYPE_META.other).tag} · {e.title} ·{" "}
                  {formatSeoul(e.start)}
                </p>
              ))}
            </button>
          );
        })}
      </div>

      {/* mobile: people */}
      <div className="lg:hidden px-4 pb-10">
        <PeopleView researchers={researchers} projects={projects} selectedProjectId={selection?.type === "project" ? selection.id : null} onOpenProject={(id) => setSelection({ type: "project", id })} />
      </div>

      {/* drawer */}
      {selection && (
        <Drawer
          selection={selection}
          projects={projects}
          events={events}
          researchers={researchers}
          activity={data.activity || []}
          google={data.google}
          busy={busy}
          canEdit={drawerCanEdit}
          onClose={() => setSelection(null)}
          onSaveProject={saveProject}
          onArchiveProject={archiveProject}
          onSaveEvent={saveEvent}
          onDeleteEvent={deleteEvent}
          onRetrySync={retrySync}
          onProposeMeeting={proposeMeeting}
        />
      )}
    </Shell>
  );
}

function FilterSelect({ value, onChange, label, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="bg-transparent text-[13px] py-1 border-0 border-b border-primaryB/20 focus:outline-none focus:border-primaryB cursor-pointer max-w-[150px]"
    >
      {children}
    </select>
  );
}

function Shell({ children, onLogout, google, backend, me }) {
  return (
    <div className={`${pxGrotesk.className} min-h-[100dvh] bg-[#F0F0EC] text-primaryB`}>
      <header className="px-4 sm:px-6 pt-5 pb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <a
              href="/"
              className={`${neuehaas.className} select-none text-[#5D009C] leading-none tracking-[-0.04em] text-[2rem] hover:opacity-80 transition-opacity`}
              aria-label="cciD 홈으로"
            >
              cciD
            </a>
          </div>
          <p className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888] mt-1">
            Research Operations
            {backend ? ` · ${backend === "sheets" ? "Sheets store" : "Local store"}` : ""}
            {google?.connected ? ` · Google 연결됨 (${google.email})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          {me?.role === "admin" && (
            <a
              href="/api/lab/google/connect"
              className="hidden sm:inline text-[13px] text-[#5D009C] hover:text-[#7a1fc0] transition-colors"
            >
              {google?.connected ? "Google 재연결" : "Google Calendar 연결"}
            </a>
          )}
          <span className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888]">
            {me ? `${me.name} · ${me.role}` : "admin"}
          </span>
          <GhostButton onClick={onLogout}>Logout</GhostButton>
        </div>
      </header>
      {children}
    </div>
  );
}
