// Lab Ops — update / archive / delete a project.
// DELETE performs a soft delete (archive first, deletedAt on second pass) —
// nothing is permanently destroyed by a single click.

import { NextResponse } from "next/server";
import { updateDoc, logActivity } from "@/app/lab/lib/store";
import { applyProjectPatch, validateProjectInput } from "@/app/lab/lib/model";
import { getSession, denyProjectWrite } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  // Leaders may not reassign leadership — that stays admin-only.
  if (session?.role === "leader" && input.projectLead !== undefined) {
    delete input.projectLead;
  }

  const errors = validateProjectInput(input, { partial: true });
  if (errors.length) {
    return NextResponse.json({ ok: false, error: errors.join(" ") }, { status: 400 });
  }

  try {
    let updated = null;
    await updateDoc((doc) => {
      const project = (doc.projects || []).find((p) => p.id === id && !p.deletedAt);
      if (!project) throw Object.assign(new Error("프로젝트를 찾을 수 없습니다."), { code: 404 });
      const deny = denyProjectWrite(session, project);
      if (deny) throw Object.assign(new Error(deny.error), { code: deny.status });
      const prevStatus = project.status;
      applyProjectPatch(project, input);
      if (input.status && input.status !== prevStatus) {
        logActivity(doc, {
          type: "project_status_changed",
          projectId: id,
          from: prevStatus,
          to: input.status,
        });
      } else if (input.members !== undefined) {
        logActivity(doc, { type: "project_members_changed", projectId: id });
      } else {
        logActivity(doc, { type: "project_updated", projectId: id });
      }
      updated = project;
      return doc;
    });
    return NextResponse.json({ ok: true, project: updated });
  } catch (err) {
    const status = err?.code === 404 || err?.code === 403 || err?.code === 401 ? err.code : 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "프로젝트 저장에 실패했습니다." },
      { status }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  try {
    let mode = "archived";
    await updateDoc((doc) => {
      const project = (doc.projects || []).find((p) => p.id === id && !p.deletedAt);
      if (!project) throw Object.assign(new Error("프로젝트를 찾을 수 없습니다."), { code: 404 });
      const deny = denyProjectWrite(session, project);
      if (deny) throw Object.assign(new Error(deny.error), { code: deny.status });
      if (project.status !== "archived") {
        project.status = "archived";
        project.archivedAt = new Date().toISOString();
        project.updatedAt = project.archivedAt;
        logActivity(doc, { type: "project_archived", projectId: id, title: project.title });
      } else {
        project.deletedAt = new Date().toISOString();
        mode = "deleted";
        logActivity(doc, { type: "project_deleted", projectId: id, title: project.title });
      }
      return doc;
    });
    return NextResponse.json({ ok: true, mode });
  } catch (err) {
    const status = err?.code === 404 || err?.code === 403 || err?.code === 401 ? err.code : 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "삭제에 실패했습니다." },
      { status }
    );
  }
}
