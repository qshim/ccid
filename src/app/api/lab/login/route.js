// Lab Ops — login endpoint. Compares credentials against server env vars only
// (never bundled to the client), rate-limits repeated failures per IP, and on
// success sets an HMAC-signed httpOnly session cookie.

import { NextResponse } from "next/server";
import { signSession, safeEqual, sessionCookieOptions } from "@/app/lab/lib/session";
import { labUsers, sessionClaims } from "@/app/lab/lib/authz";
import { isBlocked, recordFailure, clearFailures, retryAfterSeconds } from "@/app/lab/lib/ratelimit";

export const dynamic = "force-dynamic";

const GENERIC_FAIL = "아이디 또는 비밀번호가 올바르지 않습니다.";

function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "").trim() || "unknown";
}

export async function POST(request) {
  const adminId = process.env.ADMIN_LOGIN_ID;
  const adminPw = process.env.ADMIN_LOGIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!adminId || !adminPw || !secret) {
    return NextResponse.json(
      { ok: false, error: "서버 인증 설정이 완료되지 않았습니다. 관리자에게 문의하세요." },
      { status: 503 }
    );
  }

  const ip = clientIp(request);
  if (isBlocked(ip)) {
    return NextResponse.json(
      {
        ok: false,
        error: `로그인 시도가 너무 많습니다. ${Math.ceil(retryAfterSeconds(ip) / 60)}분 후 다시 시도하세요.`,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: GENERIC_FAIL }, { status: 400 });
  }

  const inputId = String(body?.id ?? "");
  const inputPw = String(body?.password ?? "");

  // Admin (env pair) first, then extra accounts from LAB_USERS.
  let claims = null;
  const adminIdOk = await safeEqual(secret, inputId, adminId);
  const adminPwOk = await safeEqual(secret, inputPw, adminPw);
  if (adminIdOk && adminPwOk) {
    claims = sessionClaims("admin");
  } else {
    for (const u of labUsers()) {
      const uIdOk = await safeEqual(secret, inputId, u.id);
      const uPwOk = await safeEqual(secret, inputPw, u.password);
      if (uIdOk && uPwOk) {
        claims = sessionClaims(u);
        break;
      }
    }
  }

  if (!claims) {
    recordFailure(ip);
    return NextResponse.json({ ok: false, error: GENERIC_FAIL }, { status: 401 });
  }

  clearFailures(ip);
  const token = await signSession(secret, claims);
  const res = NextResponse.json({ ok: true });
  const { name, ...opts } = sessionCookieOptions();
  res.cookies.set(name, token, opts);
  return res;
}
