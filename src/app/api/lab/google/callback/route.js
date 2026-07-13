// Lab Ops — Google OAuth callback: verifies state, exchanges the code, stores
// tokens server-side, then returns to /lab.

import { NextResponse } from "next/server";
import { exchangeCode, saveTokens } from "@/app/lab/lib/google";
import { verifySession } from "@/app/lab/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = url.clone();
  back.pathname = "/lab";
  back.search = "";

  const statePayload = await verifySession(process.env.SESSION_SECRET, state);
  if (!statePayload || statePayload.sub !== "google-oauth-state") {
    back.search = "?google_error=" + encodeURIComponent("잘못된 OAuth 상태값입니다. 다시 시도하세요.");
    return NextResponse.redirect(back);
  }
  if (!code) {
    back.search = "?google_error=" + encodeURIComponent("Google 인증이 취소되었습니다.");
    return NextResponse.redirect(back);
  }

  try {
    const tokens = await exchangeCode(code);
    await saveTokens(tokens);
    back.search = "?google_connected=1";
  } catch (err) {
    back.search = "?google_error=" + encodeURIComponent(String(err?.message || err));
  }
  return NextResponse.redirect(back);
}
