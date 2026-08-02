// Lab Ops — update / delete an event.
// Updates re-sync to Google when the event is calendar-linked. Deletes ask the
// caller whether to also remove the Google event (?google=1) — internal delete
// never depends on the external call succeeding.

import { NextResponse } from "next/server";
import { updateDoc, logActivity } from "@/app/lab/lib/store";
import { applyEventPatch, validateEventInput } from "@/app/lab/lib/model";
import { attemptEventSync, deleteGoogleEvent } from "@/app/lab/lib/google";
import { getSession, denyProjectWrite } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

// The event's write permission follows its project's.
function denyEventWrite(doc, event, session) {
  const project = (doc.projects || []).find((p) => p.id === event.projectId && !p.deletedAt);
  return denyProjectWrite(session, project || null);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const errors = validateEventInput(input, { partial: true });
  if (errors.length) {
    return NextResponse.json({ ok: false, error: errors.join(" ") }, { status: 400 });
  }

  try {
    let updated = null;
    await updateDoc((doc) => {
      const event = (doc.events || []).find((e) => e.id === id);
      if (!event) throw Object.assign(new Error("일정을 찾을 수 없습니다."), { code: 404 });
      const deny = denyEventWrite(doc, event, session);
      if (deny) throw Object.assign(new Error(deny.error), { code: deny.status });
      applyEventPatch(event, input);
      if (event.wantCalendar && event.syncStatus !== "none") event.syncStatus = "pending";
      if (event.wantCalendar && event.syncStatus === "none") event.syncStatus = "pending";
      logActivity(doc, { type: "event_updated", projectId: event.projectId, eventId: id });
      updated = event;
      return doc;
    });

    let synced = null;
    if (updated?.wantCalendar) synced = await attemptEventSync(id);

    return NextResponse.json({ ok: true, event: synced || updated });
  } catch (err) {
    const status = err?.code === 404 || err?.code === 403 || err?.code === 401 ? err.code : 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "일정 저장에 실패했습니다." },
      { status }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const alsoGoogle = new URL(request.url).searchParams.get("google") === "1";
  const session = await getSession(request);

  try {
    let removed = null;
    await updateDoc((doc) => {
      const idx = (doc.events || []).findIndex((e) => e.id === id);
      if (idx === -1) throw Object.assign(new Error("일정을 찾을 수 없습니다."), { code: 404 });
      const deny = denyEventWrite(doc, doc.events[idx], session);
      if (deny) throw Object.assign(new Error(deny.error), { code: deny.status });
      removed = doc.events[idx];
      doc.events.splice(idx, 1);
      logActivity(doc, {
        type: "event_deleted",
        projectId: removed.projectId,
        eventId: id,
        title: removed.title,
      });
      return doc;
    });

    let googleWarning = "";
    if (alsoGoogle && removed?.googleCalendarEventId) {
      try {
        await deleteGoogleEvent(removed);
      } catch (err) {
        googleWarning =
          "내부 일정은 삭제되었지만 Google Calendar 이벤트 삭제에 실패했습니다. Google Calendar에서 직접 확인하세요.";
      }
    }

    return NextResponse.json({ ok: true, googleWarning });
  } catch (err) {
    const status = err?.code === 404 || err?.code === 403 || err?.code === 401 ? err.code : 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "삭제에 실패했습니다." },
      { status }
    );
  }
}
