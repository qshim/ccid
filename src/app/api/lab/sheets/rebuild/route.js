// Lab Ops — rebuild the spreadsheet view tabs (People + per-project) on demand.
// Useful after hand-editing ops_* rows directly in the sheet.

import { NextResponse } from "next/server";
import { getResearchers } from "@/app/lab/lib/researchers";
import { getSession, denyAdminOnly } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

export async function POST(request) {
  const deny = denyAdminOnly(await getSession(request));
  if (deny) return NextResponse.json({ ok: false, error: deny.error }, { status: deny.status });
  if (process.env.LAB_DATA_BACKEND !== "sheets") {
    return NextResponse.json(
      { ok: false, error: "sheets 백엔드가 아닙니다 (LAB_DATA_BACKEND=sheets 필요)." },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(process.env.SHEETS_BRIDGE_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        secret: process.env.SHEETS_BRIDGE_SECRET,
        action: "opsRebuildViews",
        roster: getResearchers().map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          active: r.active,
        })),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw new Error(data?.error || `bridge ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
