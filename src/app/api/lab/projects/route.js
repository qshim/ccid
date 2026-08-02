// Lab Ops — create project.

import { NextResponse } from "next/server";
import { updateDoc, logActivity } from "@/app/lab/lib/store";
import { buildProject, validateProjectInput } from "@/app/lab/lib/model";
import { getSession } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

export async function POST(request) {
  const session = await getSession(request);
  if (session?.role === "viewer") {
    return NextResponse.json({ ok: false, error: "보기 전용 계정입니다." }, { status: 403 });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  // Leaders create projects they lead — force themselves into projectLead.
  if (session?.role === "leader" && session.person) {
    const leads = String(input.projectLead || "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!leads.includes(session.person)) leads.unshift(session.person);
    input.projectLead = leads.join(", ");
  }

  const errors = validateProjectInput(input);
  if (errors.length) {
    return NextResponse.json({ ok: false, error: errors.join(" ") }, { status: 400 });
  }

  try {
    const project = buildProject(input);
    await updateDoc((doc) => {
      doc.projects = doc.projects || [];
      doc.projects.push(project);
      logActivity(doc, { type: "project_created", projectId: project.id, title: project.title });
      return doc;
    });
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "프로젝트 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
