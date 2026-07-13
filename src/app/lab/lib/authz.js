// Lab Ops — roles & authorization.
//
// Three roles:
//   admin  — everything (existing ADMIN_LOGIN_ID/PASSWORD account)
//   leader — can edit only projects they lead (projectLead contains their
//            person id or exact name) and those projects' events
//   viewer — read-only
//
// Extra accounts live in the LAB_USERS env var (JSON array, never bundled):
//   [{ "id": "chanwoo", "password": "…", "role": "leader",
//      "person": "chanwoo-lee", "name": "Chanwoo Lee" },
//    { "id": "guest", "password": "…", "role": "viewer", "name": "Guest" }]
// "person" is the roster id (or exact ad hoc name) used to match projectLead.

import { verifySession, SESSION_COOKIE } from "./session";

export const ROLES = ["admin", "leader", "viewer"];

export function labUsers() {
  try {
    const arr = JSON.parse(process.env.LAB_USERS || "[]");
    return Array.isArray(arr)
      ? arr.filter((u) => u && u.id && u.password && ROLES.includes(u.role))
      : [];
  } catch {
    return [];
  }
}

// Session payload for the signed cookie. sub stays the login id for
// backwards-compat ("admin" for the env admin).
export function sessionClaims(user) {
  if (user === "admin") return { sub: "admin", role: "admin", person: "", name: "Admin" };
  return { sub: user.id, role: user.role, person: user.person || "", name: user.name || user.id };
}

export async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = await verifySession(process.env.SESSION_SECRET, token);
  if (!payload) return null;
  // Pre-role tokens carry only { sub: "admin" } — treat as admin.
  return { ...payload, role: payload.role || (payload.sub === "admin" ? "admin" : "viewer") };
}

const splitLeads = (v) =>
  String(v || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function isProjectLeader(session, project) {
  if (!session?.person) return false;
  return splitLeads(project?.projectLead).includes(session.person);
}

export function canEditProject(session, project) {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role === "leader") return isProjectLeader(session, project);
  return false;
}

// Route helper: returns a { status, error } object when the session may not
// mutate the given project, or null when allowed.
export function denyProjectWrite(session, project) {
  if (!session) return { status: 401, error: "로그인이 필요합니다." };
  if (canEditProject(session, project)) return null;
  if (session.role === "leader")
    return { status: 403, error: "본인이 리드하는 프로젝트만 수정할 수 있습니다." };
  return { status: 403, error: "보기 전용 계정입니다." };
}

export function denyAdminOnly(session) {
  if (!session) return { status: 401, error: "로그인이 필요합니다." };
  if (session.role !== "admin") return { status: 403, error: "관리자만 수행할 수 있습니다." };
  return null;
}
