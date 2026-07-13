// Lab Ops — logout: clears the session cookie.

import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/app/lab/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const { name, ...opts } = sessionCookieOptions();
  res.cookies.set(name, "", { ...opts, maxAge: 0 });
  return res;
}
