// Lab Ops — send a project's weekly schedule digest via Gmail.
// admin/leader only. Body: { to?: string, anchor?: "YYYY-MM-DD" }.
// Uses the connected Google account (gmail.send scope required).

import { NextResponse } from "next/server";
import { getDoc } from "@/app/lab/lib/store";
import { sendGmail } from "@/app/lab/lib/google";
import { getSession, canEditProject } from "@/app/lab/lib/authz";
import { composeDigest } from "@/app/lab/api-helpers/digest";
import { todayStr } from "@/app/lab/lib/timelineMath";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  if (!session || session.role === "viewer") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {}

  try {
    const doc = await getDoc();
    const project = (doc.projects || []).find((p) => p.id === id && !p.deletedAt);
    if (!project) return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    if (session.role === "leader" && !canEditProject(session, project)) {
      return NextResponse.json({ ok: false, error: "본인 프로젝트만 발송할 수 있습니다." }, { status: 403 });
    }

    const to = String(body.to || doc.settings?.google?.email || "").trim();
    if (!to) return NextResponse.json({ ok: false, error: "받는 주소가 없습니다." }, { status: 400 });

    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(body.anchor || "") ? body.anchor : todayStr();
    const nameOverride = typeof body.displayName === "string" ? body.displayName : undefined;
    const { subject, html } = composeDigest(project, doc.events || [], anchor, nameOverride);
    // preview: 발송 없이 내용만 반환 (미리보기/검증용)
    if (body.preview) return NextResponse.json({ ok: true, preview: true, to, subject, html });
    const sent = await sendGmail(to, subject, html);
    return NextResponse.json({ ok: true, to, subject, id: sent.id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || "발송에 실패했습니다." }, { status: 500 });
  }
}
