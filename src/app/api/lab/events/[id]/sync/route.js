// Lab Ops — manual re-sync of one event to Google Calendar (retry button).

import { NextResponse } from "next/server";
import { attemptEventSync } from "@/app/lab/lib/google";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

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
