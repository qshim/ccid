// Lab Ops — session module.
// Single-admin auth for now, but kept as a separate module (sign/verify/cookie
// policy only) so a future multi-admin or Google OAuth login can swap in
// without touching route protection or pages.
//
// Token format: base64url(payload).base64url(hmacSha256(payload, SESSION_SECRET))
// payload = JSON { sub, iat, exp }
// Web Crypto only — the same code runs in the proxy (edge) and route handlers.

const COOKIE_NAME = "lab_session";
const SESSION_TTL_S = 60 * 60 * 24 * 7; // 7 days

function b64url(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecodeToString(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return b;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// claims: a string (legacy — becomes sub) or an object of extra claims
// ({ sub, role, person, name }) merged into the payload.
export async function signSession(secret, claims = "admin") {
  const now = Math.floor(Date.now() / 1000);
  const extra = typeof claims === "string" ? { sub: claims } : claims;
  const payload = JSON.stringify({ ...extra, iat: now, exp: now + SESSION_TTL_S });
  const payloadB64 = b64url(new TextEncoder().encode(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(sig)}`;
}

export async function verifySession(secret, token) {
  try {
    if (!secret || !token || typeof token !== "string") return null;
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const key = await hmacKey(secret);
    const sigStr = b64urlDecodeToString(sigB64);
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return null;
    const payload = JSON.parse(b64urlDecodeToString(payloadB64));
    if (!payload?.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Constant-time-ish string comparison (HMAC both sides so length leaks nothing).
export async function safeEqual(secret, a, b) {
  const key = await hmacKey(secret || "lab-safe-equal");
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(String(a))),
    crypto.subtle.sign("HMAC", key, enc.encode(String(b))),
  ]);
  const ua = new Uint8Array(ha);
  const ub = new Uint8Array(hb);
  if (ua.length !== ub.length) return false;
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_S,
  };
}

export const SESSION_COOKIE = COOKIE_NAME;
