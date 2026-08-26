"use client";

// cciD Lab — People view: renders below the project timeline, same visual
// language (sticky left column, date header, colored bars) but one row per
// PERSON instead of per project. Shows official roster researchers AND
// people who only appear inside project data — ad hoc team members not yet
// in the public roster, and project leads (often external advisors/
// professors who are never roster entries at all).
//
// Per-project bars use the member's role text as a date-range hint when it
// matches "N–M월" (the convention used for ad hoc time-boxed assignments,
// e.g. "7–8월"); otherwise the bar falls back to the project's own
// start/end dates.

import { useMemo, useState } from "react";
import { resolvePhoto } from "@/app/components/members";
import { categoryRowBg } from "@/app/lab/data/researcherCategories";
import { badgeOf } from "@/app/lab/data/researcherBadges";
import {
  toDayStr,
  todayStr,
  diffDays,
  computeRange,
  monthSegments,
  assignLanes,
} from "../lib/timelineMath";

const LEFT_W = 200;
const PX_PER_DAY = 5;
const ROW_H = 40;

// People are grouped/sorted by category so ad hoc project leads (지도교수 →
// labeled "Advisory Board") sit with the roster's Advisory Board members up
// top, and not-yet-registered team members ("미등록 팀원") fall to the bottom.
// Stable sort preserves the original order within each group.
const CATEGORY_ORDER = [
  "Director",
  "Advisory Board",
  "Research Interns",
  "Student Researchers",
  "Former Advisors",
  "Alumni",
  "미등록 팀원",
];
const categoryRank = (c) => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

// projectLead can hold co-leads as a comma-separated list ("kiryung-nam, 안예윤").
const splitLeads = (v) =>
  String(v || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

// How many live projects a person is on (member or lead) — used to rank busier
// people higher within each category in the default (no-selection) sort.
function assignmentCount(person, activeProjects) {
  let n = 0;
  for (const p of activeProjects) {
    if (splitLeads(p.projectLead).includes(person.id)) n++;
    else if (p.members?.some((m) => m.researcherId === person.id)) n++;
  }
  return n;
}

// When a project is selected in the timeline above, its members float to the
// top in the project's own member order (lead first). Otherwise: category
// order → most projects first → name A–Z.
function sortPeople(people, projects, selectedProjectId) {
  const activeProjects = projects.filter((p) => p.status !== "archived");
  const count = new Map(people.map((p) => [p.id, assignmentCount(p, activeProjects)]));
  const byDefault = (a, b) =>
    categoryRank(a.category) - categoryRank(b.category) ||
    count.get(b.id) - count.get(a.id) ||
    a.name.localeCompare(b.name, "ko");

  if (selectedProjectId) {
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (proj) {
      const order = new Map();
      splitLeads(proj.projectLead).forEach((id) => order.set(id, -1));
      (proj.members || []).forEach((m, i) => {
        if (!order.has(m.researcherId)) order.set(m.researcherId, i);
      });
      return [...people].sort((a, b) => {
        const ia = order.has(a.id) ? order.get(a.id) : Infinity;
        const ib = order.has(b.id) ? order.get(b.id) : Infinity;
        if (ia !== ib) return ia - ib;
        return byDefault(a, b);
      });
    }
  }
  return [...people].sort(byDefault);
}
// Multi-project people: bars stack into parallel lanes instead of overlapping.
const BAR_H = 9;
const LANE_PITCH = 11; // bar height + 2px gap
const LANE_PAD = 5; // top/bottom padding inside a row

function parseMonthRange(role, projectStartDate) {
  const t = String(role || "").trim();
  const baseYear = projectStartDate ? new Date(projectStartDate).getFullYear() : new Date().getFullYear();
  // "UX ~8/9" — 트랙명 뒤에 종료일만 지정 (프로젝트 시작 ~ 해당 날짜까지)
  const until = /~\s*(\d{1,2})\s*\/\s*(\d{1,2})/.exec(t);
  if (until && projectStartDate) {
    const mo = Number(until[1]);
    const day = Number(until[2]);
    return {
      start: projectStartDate.slice(0, 10),
      end: `${baseYear}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  }
  // "8월" — single month
  const single = /^(\d{1,2})\s*월$/.exec(t);
  if (single) {
    const mo = Number(single[1]);
    return {
      start: `${baseYear}-${String(mo).padStart(2, "0")}-01`,
      end: new Date(Date.UTC(baseYear, mo, 0)).toISOString().slice(0, 10),
    };
  }
  // "7–12월" — month range
  const m = /^(\d{1,2})\s*[–\-~]\s*(\d{1,2})\s*월$/.exec(t);
  if (!m) return null;
  const startMonth = Number(m[1]);
  const endMonth = Number(m[2]);
  const endYear = endMonth < startMonth ? baseYear + 1 : baseYear;
  const start = `${baseYear}-${String(startMonth).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(endYear, endMonth, 0)).toISOString().slice(0, 10);
  return { start, end };
}

// Build the full person list: roster (with .adhoc=false) + anyone referenced
// only inside project.members / project.projectLead (.adhoc=true). De-duped
// by id (roster) or exact name (ad hoc), so a roster member referenced by
// name as a lead elsewhere doesn't get a duplicate ghost row.
function buildPeople(researchers, projects) {
  const activeProjects = projects.filter((p) => p.status !== "archived");

  // Inactive-category roster people (Alumni, Former Advisors) are normally
  // hidden to avoid clutter, but if one is actually assigned to a live
  // project (e.g. an alum brought back in) they must resolve to their real
  // roster entry — not fall through and get duplicated as an ad hoc ghost row.
  const assignedIds = new Set();
  const assignedNames = new Set();
  for (const p of activeProjects) {
    for (const m of p.members || []) if (m.researcherId) assignedIds.add(m.researcherId);
    for (const l of splitLeads(p.projectLead)) assignedNames.add(l);
  }

  const byId = new Map();
  const nameTaken = new Set();
  for (const r of researchers) {
    if (!r.active && !assignedIds.has(r.id) && !assignedNames.has(r.name)) continue;
    byId.set(r.id, { ...r, adhoc: false });
    nameTaken.add(r.name);
  }

  for (const p of activeProjects) {
    for (const m of p.members || []) {
      const key = m.researcherId;
      if (!key || byId.has(key) || nameTaken.has(key)) continue;
      byId.set(key, {
        id: key,
        name: key,
        // 이름이 "…선생님"이면 지도/자문 인력으로 보고 Advisory Board로 분류.
        category: /선생님\s*$/.test(key) ? "Advisory Board" : "미등록 팀원",
        image: "",
        active: true,
        adhoc: true,
      });
      nameTaken.add(key);
    }
    for (const lead of splitLeads(p.projectLead)) {
      if (byId.has(lead) || nameTaken.has(lead)) continue;
      byId.set(lead, {
        id: lead,
        name: lead,
        // 지도교수/외부 리딩은 로스터의 Advisory Board와 같은 카테고리 라벨로 통일.
        category: "Advisory Board",
        image: "",
        active: true,
        adhoc: true,
      });
      nameTaken.add(lead);
    }
  }
  return [...byId.values()];
}

function personAssignments(person, projects) {
  const activeProjects = projects.filter((p) => p.status !== "archived");
  const out = [];
  for (const p of activeProjects) {
    const isLead = splitLeads(p.projectLead).includes(person.id);
    const member = p.members?.find((m) => m.researcherId === person.id);
    if (!isLead && !member) continue;
    const role = isLead ? "Lead" : member.role || "";
    const range =
      parseMonthRange(isLead ? "" : role, p.startDate) ||
      (p.startDate ? { start: p.startDate, end: p.endDate || p.startDate } : null);
    out.push({ project: p, role, range });
  }
  return out;
}

export default function PeopleView({ researchers, projects, onOpenProject, selectedProjectId }) {
  const [q, setQ] = useState("");

  const people = useMemo(
    () => sortPeople(buildPeople(researchers, projects), projects, selectedProjectId),
    [researchers, projects, selectedProjectId]
  );

  const range = useMemo(() => computeRange(projects, []), [projects]);

  const rows = useMemo(
    () =>
      people.map((person) => {
        const assignments = personAssignments(person, projects);
        // Lane-stack overlapping assignment bars (same greedy packing as the
        // project timeline) so concurrent projects sit side by side.
        const laneItems = assignments
          .filter((a) => a.range)
          .map((a) => {
            const s = toDayStr(a.range.start);
            const e = toDayStr(a.range.end);
            const startIndex = Math.max(0, diffDays(s, range.start));
            const span = Math.max(1, diffDays(toDayStr(a.range.end), s) + 1);
            return { assignment: a, startIndex, span, end: e };
          });
        const { items, laneCount } = assignLanes(laneItems);
        const rowH = Math.max(ROW_H, LANE_PAD * 2 + Math.max(1, laneCount) * LANE_PITCH);
        return { person, assignments, items, laneCount, rowH };
      }),
    [people, projects, range.start]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.person.name.toLowerCase().includes(needle) ||
        row.assignments.some((a) =>
          (a.project.shortName || a.project.title || "").toLowerCase().includes(needle)
        )
    );
  }, [rows, q]);

  const months = useMemo(() => monthSegments(range.start, range.totalDays), [range]);
  const today = todayStr();
  const todayIdx = diffDays(today, range.start);
  const gridW = range.totalDays * PX_PER_DAY;

  const occupiedCount = rows.filter((r) => r.assignments.length > 0).length;

  return (
    <section aria-label="People — 프로젝트 배정 현황">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="tracking-[-0.03em] leading-[1.22] text-[1.125rem]">People</h2>
          <p className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888] mt-0.5">
            OCCUPIED {occupiedCount} / {rows.length} · 팀원 외 지도교수·미등록 인원 포함
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 프로젝트 검색"
          aria-label="People 검색"
          className="w-[200px] bg-transparent text-[13px] py-1 border-0 border-b border-primaryB/20 focus:outline-none focus:border-primaryB placeholder:text-primaryB/30"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-[13px] text-primaryB/50">검색 결과가 없습니다.</p>
      )}

      {filtered.length > 0 && (
        <div className="relative w-full overflow-x-auto border border-primaryB/10 bg-[#FBFBF8] scrollbar-hide">
          <div style={{ width: LEFT_W + gridW, minWidth: "100%" }}>
            {/* date header */}
            <div className="sticky top-0 z-20 flex bg-[#F0F0EC] border-b border-primaryB/15 h-[24px]">
              <div
                className="sticky left-0 z-30 shrink-0 bg-[#F0F0EC] border-r border-primaryB/15"
                style={{ width: LEFT_W }}
              />
              {months.map((m) => (
                <div
                  key={m.key}
                  className="border-r border-primaryB/15 px-2 flex items-center overflow-hidden shrink-0"
                  style={{ width: m.days * PX_PER_DAY }}
                >
                  <span className="font-light uppercase text-[10px] tracking-[0.01em] text-primaryB/60 whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* rows */}
            {filtered.map(({ person, assignments, items, rowH }) => {
              const photo = resolvePhoto(person.name, person.image);
              const catBg = categoryRowBg(person.id);
              return (
                <div key={person.id} className="flex border-b border-primaryB/[0.06]">
                  <div
                    className="sticky left-0 z-10 shrink-0 bg-[#FBFBF8] border-r border-primaryB/10 px-3 flex items-center gap-2 min-w-0"
                    style={{ width: LEFT_W, height: rowH, backgroundImage: catBg || undefined }}
                  >
                    <span className="w-[22px] h-[22px] rounded-full overflow-hidden bg-[#E0E0FF] shrink-0">
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={person.name}
                          className="w-full h-full object-cover filter grayscale"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-primaryB truncate">
                        {badgeOf(person.id) && (
                          <span aria-label="성실 근무" className="mr-0.5">
                            {badgeOf(person.id)}
                          </span>
                        )}
                        {person.name}
                      </div>
                      <div className="font-light uppercase text-[9px] tracking-[0.05em] text-[#888] truncate">
                        {assignments.length > 0 ? (
                          <span className="text-[#5D009C] font-semibold">OCCUPIED</span>
                        ) : (
                          person.category
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0" style={{ width: gridW, height: rowH }}>
                    {todayIdx >= 0 && todayIdx < range.totalDays && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0 bottom-0 w-px bg-[#4E22D6]/40 pointer-events-none"
                        style={{ left: todayIdx * PX_PER_DAY }}
                      />
                    )}
                    {items.map(({ assignment: a, startIndex, span, lane }, idx) => {
                      const color = a.project.color || "#4E22D6";
                      const em = Boolean(a.project.emphasis);
                      const label = `${a.project.shortName || a.project.title}${a.role ? ` — ${a.role}` : ""}`;
                      return (
                        <button
                          key={a.project.id + idx}
                          type="button"
                          onClick={() => onOpenProject?.(a.project.id)}
                          title={label}
                          aria-label={label}
                          className="absolute rounded-[2px] px-1 flex items-center overflow-hidden text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] hover:brightness-95 transition-[filter]"
                          style={{
                            top: LANE_PAD + lane * LANE_PITCH,
                            height: BAR_H,
                            left: startIndex * PX_PER_DAY,
                            width: Math.max(span * PX_PER_DAY, 10),
                            backgroundColor: em ? color : `${color}33`,
                            borderLeft: `2px solid ${color}`,
                          }}
                        >
                          <span
                            className={`text-[9px] leading-none truncate ${
                              em ? "text-white" : "text-primaryB/75"
                            }`}
                          >
                            {a.project.shortName || a.project.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
