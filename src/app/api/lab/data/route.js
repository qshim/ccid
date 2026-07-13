// Lab Ops — full dataset for the client shell: projects, events, researchers,
// settings summary, recent activity. Auth is enforced by src/proxy.js.

import { NextResponse } from "next/server";
import { getDoc } from "@/app/lab/lib/store";
import { getResearchers } from "@/app/lab/lib/researchers";
import { getSession } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const doc = await getDoc();
    const session = await getSession(request);
    // 이메일 병합: ops_people 시트 탭(비공개) 우선, 없으면 코드 오버레이(researchers.js) 값.
    const opsEmail = Object.fromEntries(
      (doc.people || [])
        .filter((p) => p.id && p.email)
        .map((p) => [p.id, String(p.email).trim()])
    );
    const researchers = getResearchers().map((r) => ({
      ...r,
      email: opsEmail[r.id] || r.email || "",
    }));
    return NextResponse.json({
      ok: true,
      me: session
        ? { id: session.sub, role: session.role, person: session.person || "", name: session.name || session.sub }
        : null,
      projects: (doc.projects || []).filter((p) => !p.deletedAt),
      events: doc.events || [],
      researchers,
      activity: (doc.activity || []).slice(0, 100),
      google: {
        connected: Boolean(doc.settings?.google?.refreshToken),
        email: doc.settings?.google?.email || "",
        calendarId: doc.settings?.google?.calendarId || "primary",
        lastSyncAt: doc.settings?.google?.lastSyncAt || "",
      },
      backend: process.env.LAB_DATA_BACKEND === "sheets" ? "sheets" : "json",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요." },
      { status: 500 }
    );
  }
}
