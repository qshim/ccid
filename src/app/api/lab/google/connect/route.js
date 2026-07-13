// Lab Ops — start Google OAuth. Redirects to Google's consent screen.
// A signed state (reusing the session HMAC) protects the callback from CSRF.

import { NextResponse } from "next/server";
import { buildAuthUrl, googleConfigured } from "@/app/lab/lib/google";
import { signSession } from "@/app/lab/lib/session";
import { getSession, denyAdminOnly } from "@/app/lab/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const deny = denyAdminOnly(await getSession(request));
  if (deny) {
    const url = request.nextUrl.clone();
    url.pathname = "/lab";
    url.search = "?google_error=" + encodeURIComponent(deny.error);
    return NextResponse.redirect(url);
  }
  if (!googleConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = "/lab";
    url.search = "?google_error=" + encodeURIComponent("Google 연동 환경변수가 설정되지 않았습니다.");
    return NextResponse.redirect(url);
  }
  const state = await signSession(process.env.SESSION_SECRET, "google-oauth-state");
  return NextResponse.redirect(buildAuthUrl(state));
}
