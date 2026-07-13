// Lab Ops — create event/schedule. The internal save always succeeds first;
// Google Calendar sync (if requested) runs after and NEVER blocks or loses the
// internal event — failures are recorded on the event's syncStatus.

import { NextResponse } from "next/server";
import { updateDoc, logActivity } from "@/app/lab/lib/store";
import { buildEvent, validateEventInput } from "@/app/lab/lib/model";
import { attemptEventSync } from "@/app/lab/lib/google";
import { getSession, denyProjectWrite } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getSession(request);
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const errors = validateEventInput(input);
  if (errors.length) {
    return NextResponse.json({ ok: false, error: errors.join(" ") }, { status: 400 });
  }

  try {
    const event = buildEvent(input);
    if (event.wantCalendar) event.syncStatus = "pending";
    await updateDoc((doc) => {
      const project = (doc.projects || []).find((p) => p.id === event.projectId && !p.deletedAt);
      if (!project) {
        throw Object.assign(new Error("프로젝트를 찾을 수 없습니다."), { code: 404 });
      }
      const deny = denyProjectWrite(session, project);
      if (deny) throw Object.assign(new Error(deny.error), { code: deny.status });
      doc.events = doc.events || [];
      doc.events.push(event);
      logActivity(doc, {
        type: "event_created",
        projectId: event.projectId,
        eventId: event.id,
        title: event.title,
      });
      return doc;
    });

    // Post-save external sync (best effort).
    let synced = null;
    if (event.wantCalendar) synced = await attemptEventSync(event.id);

    return NextResponse.json({ ok: true, event: synced || event });
  } catch (err) {
    const status = err?.code === 404 || err?.code === 403 || err?.code === 401 ? err.code : 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "일정 저장에 실패했습니다." },
      { status }
    );
  }
}
