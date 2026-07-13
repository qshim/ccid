import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/app/lab/lib/session";

// NOTE:
// - Vercel/Edge 환경에서 middleware가 모든 경로에 적용되면 내부 경로까지 타면서
//   예기치 않은 실패(MIDDLEWARE_INVOCATION_FAILED)가 발생할 수 있어 API 경로와
//   비공개 /lab 영역으로만 제한합니다.
// - CORS가 필요할 때는 API 라우트에서만 처리하는 게 안전합니다.
// - /lab (비공개 연구 운영)과 /api/lab은 서버측 세션 검증으로 보호합니다.
//   숨겨진 URL이 아니라 이 검증이 접근 제어입니다.

const LAB_PUBLIC_PATHS = new Set(["/lab/login", "/api/lab/login"]);

function isLabPath(pathname) {
  return pathname === "/lab" || pathname.startsWith("/lab/") || pathname.startsWith("/api/lab");
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ---- private Lab Ops gate ----
  if (isLabPath(pathname)) {
    if (LAB_PUBLIC_PATHS.has(pathname)) return NextResponse.next();

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(process.env.SESSION_SECRET, token);
    if (session) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/lab/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // ---- existing public-API CORS behavior (unchanged) ----
  const origin = request.headers.get("origin") || "*";

  // Preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/lab", "/lab/:path*"],
};
