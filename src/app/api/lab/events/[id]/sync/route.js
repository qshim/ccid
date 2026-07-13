// Lab Ops — manual re-sync of one event to Google Calendar (retry button).

import { NextResponse } from "next/server";
import { attemptEventSync } from "@/app/lab/lib/google";

export const dynamic = "force-dynamic";

export async function POST(_request, { params }) {
  const { id } = await params;
  try {
    const event = await attemptEventSync(id, { force: true });
    if (!event) {
      return NextResponse.json({ ok: false, error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "동기화에 실패했습니다." },
      { status: 500 }
    );
  }
}
