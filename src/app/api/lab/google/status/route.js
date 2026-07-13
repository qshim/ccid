// Lab Ops — Google connection status + calendar list / default calendar /
// disconnect, in one small route group.

import { NextResponse } from "next/server";
import { getDoc } from "@/app/lab/lib/store";
import {
  googleConfigured,
  listCalendars,
  setDefaultCalendar,
  disconnectGoogle,
} from "@/app/lab/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const withCalendars = new URL(request.url).searchParams.get("calendars") === "1";
  const doc = await getDoc();
  const g = doc.settings?.google || {};
  const payload = {
    ok: true,
    configured: googleConfigured(),
    connected: Boolean(g.refreshToken),
    email: g.email || "",
    calendarId: g.calendarId || "primary",
    lastSyncAt: g.lastSyncAt || "",
  };
  if (withCalendars && payload.connected) {
    try {
      payload.calendars = await listCalendars();
    } catch (err) {
      payload.calendarsError = String(err?.message || err);
    }
  }
  return NextResponse.json(payload);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    if (body.action === "disconnect") {
      await disconnectGoogle();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "setCalendar") {
      await setDefaultCalendar(String(body.calendarId || "primary"));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "알 수 없는 동작입니다." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
