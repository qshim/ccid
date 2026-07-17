"use client";

// cciD Lab — Table & Board views. Alternatives to the timeline for fast
// scanning / sorting (table) and status-flow overview (board / kanban).
// Both open the same detail drawer on click, so they're read+navigate views
// layered on the existing project data — no separate edit path.

import { useMemo, useState } from "react";
import { PROJECT_STATUS_META, dateProgress } from "../lib/timelineMath";
import { resolvePhoto } from "@/app/components/members";
import { researcherKo } from "@/app/lab/data/researcherNamesKo";
import { Tag } from "./ui";

const splitLeads = (v) =>
  String(v || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

const statusMeta = (s) => PROJECT_STATUS_META[s] || { label: s || "—", color: "#888" };

function fmtDate(d) {
  if (!d) return "";
  return String(d).slice(5, 10).replace("-", "/");
}

function leadNames(project, byId) {
  return splitLeads(project.projectLead)
    .map((id) => (byId[id] ? researcherKo(byId[id]) : id))
    .join(", ");
}

function ProgressBar({ value, color }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-2 w-full">
      <span className="relative block h-[4px] flex-1 min-w-[40px] rounded-full bg-primaryB/10 overflow-hidden">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </span>
      <span className="text-[11px] tabular-nums text-primaryB/50 w-[30px] text-right">{pct}%</span>
    </span>
  );
}

// ---------------------------------------------------------------- Table view

const COLUMNS = [
  { key: "shortName", label: "프로젝트", sortable: true, width: "minmax(180px,1.4fr)" },
  { key: "status", label: "상태", sortable: true, width: "110px" },
  { key: "lead", label: "리드", sortable: true, width: "minmax(120px,1fr)" },
  { key: "members", label: "인원", sortable: true, width: "60px" },
  { key: "startDate", label: "기간", sortable: true, width: "130px" },
  { key: "progress", label: "진행", sortable: true, width: "130px" },
  { key: "clientOrPartner", label: "클라이언트", sortable: true, width: "minmax(100px,0.8fr)" },
];

const STATUS_RANK = Object.keys(PROJECT_STATUS_META);

function sortValue(p, key, byId) {
  switch (key) {
    case "status":
      return STATUS_RANK.indexOf(p.status);
    case "lead":
      return leadNames(p, byId).toLowerCase();
    case "members":
      return (p.members || []).length;
    case "progress":
      return dateProgress(p);
    case "startDate":
      return p.startDate || "";
    default:
      return String(p[key] || "").toLowerCase();
  }
}

export function TableView({ projects, researchers, onOpenProject }) {
  const byId = useMemo(
    () => Object.fromEntries(researchers.map((r) => [r.id, r])),
    [researchers]
  );
  const [sort, setSort] = useState({ key: "status", dir: 1 });

  const rows = useMemo(() => {
    const arr = [...projects];
    arr.sort((a, b) => {
      const va = sortValue(a, sort.key, byId);
      const vb = sortValue(b, sort.key, byId);
      if (va < vb) return -1 * sort.dir;
      if (va > vb) return 1 * sort.dir;
      return (a.shortName || "").localeCompare(b.shortName || "", "ko");
    });
    return arr;
  }, [projects, sort, byId]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  const grid = COLUMNS.map((c) => c.width).join(" ");

  if (projects.length === 0)
    return <p className="text-[13px] text-primaryB/40 py-8">표시할 프로젝트가 없습니다.</p>;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[820px]">
        {/* header */}
        <div
          className="grid items-center gap-x-4 px-3 pb-2 border-b border-primaryB/15"
          style={{ gridTemplateColumns: grid }}
        >
          {COLUMNS.map((c) => {
            const activeCol = sort.key === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => c.sortable && toggleSort(c.key)}
                className={`flex items-center gap-1 font-light uppercase text-[10px] tracking-[0.06em] text-left ${
                  c.sortable ? "hover:text-primaryB cursor-pointer" : "cursor-default"
                } ${activeCol ? "text-primaryB" : "text-[#888]"}`}
              >
                {c.label}
                {activeCol && <span aria-hidden="true">{sort.dir === 1 ? "↑" : "↓"}</span>}
              </button>
            );
          })}
        </div>
        {/* rows */}
        {rows.map((p) => {
          const sm = statusMeta(p.status);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenProject(p.id)}
              className="grid items-center gap-x-4 px-3 py-2.5 w-full text-left border-b border-primaryB/8 hover:bg-primaryB/[0.03] transition-colors"
              style={{ gridTemplateColumns: grid }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ backgroundColor: p.color || sm.color }}
                />
                <span className="text-[13px] text-primaryB truncate">{p.shortName || p.title}</span>
              </span>
              <span>
                <Tag color={sm.color}>{sm.label}</Tag>
              </span>
              <span className="text-[12px] text-primaryB/70 truncate">{leadNames(p, byId) || "—"}</span>
              <span className="text-[12px] text-primaryB/60 tabular-nums">{(p.members || []).length}</span>
              <span className="text-[12px] text-primaryB/60 tabular-nums whitespace-nowrap">
                {p.startDate ? `${fmtDate(p.startDate)}–${fmtDate(p.endDate)}` : "—"}
              </span>
              <span className="min-w-0">
                <ProgressBar value={dateProgress(p)} color={p.color || sm.color} />
              </span>
              <span className="text-[12px] text-primaryB/60 truncate">{p.clientOrPartner || "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Board view

// Kanban columns follow the project lifecycle. Archived is only shown when it
// has cards (i.e. the parent already opted into "아카이브 포함").
const BOARD_STATUSES = ["planning", "active", "on_hold", "reviewing", "completed", "archived"];

function BoardCard({ project, byId, nextEvent, onOpenProject }) {
  const sm = statusMeta(project.status);
  const members = project.members || [];
  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="block w-full text-left rounded-[3px] border border-primaryB/12 bg-[#FBFBF9] p-3 hover:border-primaryB/35 transition-colors"
    >
      <span className="flex items-center gap-2 mb-1.5">
        <span
          aria-hidden="true"
          className="w-[8px] h-[8px] rounded-full shrink-0"
          style={{ backgroundColor: project.color || sm.color }}
        />
        <span className="text-[13px] text-primaryB leading-tight">{project.shortName || project.title}</span>
      </span>
      {leadNames(project, byId) && (
        <span className="block text-[11px] text-primaryB/55 mb-2">Lead · {leadNames(project, byId)}</span>
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center -space-x-1.5">
          {members.slice(0, 5).map((m) => {
            const r = byId[m.researcherId];
            const photo = r ? resolvePhoto(r.name, r.image) : resolvePhoto(m.researcherId, "");
            return (
              <span
                key={m.researcherId}
                className="w-[18px] h-[18px] rounded-full overflow-hidden ring-1 ring-[#FBFBF9] bg-[#F6F0FF] shrink-0"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="w-full h-full object-cover filter grayscale" referrerPolicy="no-referrer" />
                ) : (
                  <span className="block w-full h-full bg-[#E0E0FF]" />
                )}
              </span>
            );
          })}
          {members.length > 5 && (
            <span className="text-[10px] text-primaryB/45 pl-2.5">+{members.length - 5}</span>
          )}
        </span>
        <span className="text-[11px] tabular-nums text-primaryB/45">{dateProgress(project)}%</span>
      </span>
      {(project.siteUrl || project.figmaLinks?.length > 0) && (
        <span className="flex flex-wrap gap-1 mt-2">
          {project.siteUrl && (
            <a
              href={project.siteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] uppercase tracking-[0.05em] px-1.5 py-[2px] rounded-full border border-primaryB/25 text-primaryB/70 hover:border-primaryB/60"
            >
              Site ↗
            </a>
          )}
          {(project.figmaLinks || []).map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={l.url}
              className="text-[10px] uppercase tracking-[0.05em] px-1.5 py-[2px] rounded-full border border-primaryB/25 text-primaryB/70 hover:border-primaryB/60"
            >
              {l.label || `Figma${project.figmaLinks.length > 1 ? " " + (i + 1) : ""}`} ↗
            </a>
          ))}
        </span>
      )}
      {nextEvent && (
        <span className="block mt-2 pt-2 border-t border-primaryB/8 text-[11px] text-primaryB/50 truncate">
          다음 · {fmtDate(nextEvent.start)} {nextEvent.title}
        </span>
      )}
    </button>
  );
}

export function BoardView({ projects, events, researchers, onOpenProject }) {
  const byId = useMemo(
    () => Object.fromEntries(researchers.map((r) => [r.id, r])),
    [researchers]
  );

  // next upcoming event per project (for the card footer)
  const nextByProject = useMemo(() => {
    const now = new Date().toISOString();
    const map = {};
    for (const e of events) {
      const when = e.start || "";
      if (when < now) continue;
      const cur = map[e.projectId];
      if (!cur || when < cur.start) map[e.projectId] = e;
    }
    return map;
  }, [events]);

  const columns = useMemo(() => {
    const byStatus = Object.fromEntries(BOARD_STATUSES.map((s) => [s, []]));
    for (const p of projects) (byStatus[p.status] || (byStatus[p.status] = [])).push(p);
    return BOARD_STATUSES.map((s) => ({ status: s, items: byStatus[s] || [] })).filter(
      (c) => c.items.length > 0 || c.status !== "archived"
    );
  }, [projects]);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-3 min-w-min pb-2">
        {columns.map((col) => {
          const sm = statusMeta(col.status);
          return (
            <div key={col.status} className="w-[230px] shrink-0">
              <div className="flex items-center gap-2 px-1 pb-2 mb-2 border-b border-primaryB/12">
                <span aria-hidden="true" className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: sm.color }} />
                <span className="font-light uppercase text-[10px] tracking-[0.06em] text-primaryB">{sm.label}</span>
                <span className="text-[10px] tabular-nums text-primaryB/40 ml-auto">{col.items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {col.items.map((p) => (
                  <BoardCard
                    key={p.id}
                    project={p}
                    byId={byId}
                    nextEvent={nextByProject[p.id]}
                    onOpenProject={onOpenProject}
                  />
                ))}
                {col.items.length === 0 && (
                  <p className="text-[11px] text-primaryB/25 px-1 py-3">비어 있음</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
