// Lab Ops — Google Calendar / Meet integration (server-only).
//
// One-way sync (internal → Google) by design for v1: internal events are the
// source of truth; Google events mirror them. Two-way sync can be added later
// by storing etags + a webhook/poll loop (see LAB_OPS.md).
//
// Secrets (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) live in server env vars and
// are never sent to the client. The OAuth refresh token is stored server-side
// in the data store's settings — not in any cookie or client bundle.

import { getDoc, updateDoc, logActivity } from "@/app/lab/lib/store";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google 인증에 실패했습니다 (${data.error || res.status}).`);
  }
  return data; // { access_token, refresh_token, expires_in, id_token, ... }
}

function decodeJwtEmail(idToken) {
  try {
    const payload = JSON.parse(
      Buffer.from(String(idToken).split(".")[1], "base64url").toString("utf8")
    );
    return payload?.email || "";
  } catch {
    return "";
  }
}

export async function saveTokens(tokens) {
  const email = decodeJwtEmail(tokens.id_token);
  await updateDoc((doc) => {
    doc.settings = doc.settings || {};
    doc.settings.google = {
      ...(doc.settings.google || {}),
      refreshToken: tokens.refresh_token || doc.settings.google?.refreshToken || "",
      accessToken: tokens.access_token,
      accessTokenExpiry: Date.now() + (tokens.expires_in || 3600) * 1000,
      email,
      calendarId: doc.settings.google?.calendarId || "primary",
      connectedAt: new Date().toISOString(),
    };
    logActivity(doc, { type: "google_connected", email });
    return doc;
  });
}

export async function disconnectGoogle() {
  await updateDoc((doc) => {
    if (doc.settings?.google) {
      logActivity(doc, { type: "google_disconnected", email: doc.settings.google.email });
      delete doc.settings.google;
    }
    return doc;
  });
}

// Returns a valid access token, refreshing (and persisting) when expired.
async function ensureAccessToken() {
  const doc = await getDoc();
  const g = doc.settings?.google;
  if (!g?.refreshToken) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }
  if (g.accessToken && g.accessTokenExpiry && g.accessTokenExpiry > Date.now() + 60000) {
    return { token: g.accessToken, calendarId: g.calendarId || "primary" };
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: g.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    // invalid_grant → user revoked access or token expired permanently.
    throw new Error(
      data.error === "invalid_grant"
        ? "Google 연결이 만료되었습니다. 캘린더를 다시 연결하세요."
        : `Google 토큰 갱신에 실패했습니다 (${data.error || res.status}).`
    );
  }
  await updateDoc((doc2) => {
    if (doc2.settings?.google) {
      doc2.settings.google.accessToken = data.access_token;
      doc2.settings.google.accessTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    }
    return doc2;
  });
  return { token: data.access_token, calendarId: g.calendarId || "primary" };
}

export async function listCalendars() {
  const { token } = await ensureAccessToken();
  const res = await fetch(`${CAL_API}/users/me/calendarList?minAccessRole=writer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`캘린더 목록을 불러오지 못했습니다 (${res.status}).`);
  return (data.items || []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: Boolean(c.primary),
  }));
}

export async function setDefaultCalendar(calendarId) {
  await updateDoc((doc) => {
    if (!doc.settings?.google) throw new Error("Google 계정이 연결되어 있지 않습니다.");
    doc.settings.google.calendarId = calendarId || "primary";
    return doc;
  });
}

function toGoogleTime(iso, allDay) {
  if (allDay) {
    return { date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso)) };
  }
  return { dateTime: new Date(iso).toISOString(), timeZone: "Asia/Seoul" };
}

function eventToGoogleBody(event) {
  const endIso = event.end || event.start;
  const body = {
    summary: event.title,
    description: [event.description, event.notes && `메모: ${event.notes}`]
      .filter(Boolean)
      .join("\n\n"),
    location: event.location || undefined,
    start: toGoogleTime(event.start, event.allDay),
    end: toGoogleTime(endIso, event.allDay),
  };
  const attendees = String(event.attendees || "")
    .split(/[,\s]+/)
    .filter((s) => s.includes("@"))
    .map((email) => ({ email }));
  if (attendees.length) body.attendees = attendees;
  // reminder: 분 단위 문자열 ("30") → 이메일+팝업 알림. 비우면 캘린더 기본값.
  const reminderMin = Number(event.reminder);
  if (reminderMin > 0) {
    body.reminders = {
      useDefault: false,
      overrides: [
        { method: "email", minutes: reminderMin },
        { method: "popup", minutes: reminderMin },
      ],
    };
  }
  if (event.wantMeet && !event.googleMeetUrl) {
    body.conferenceData = {
      createRequest: {
        requestId: `labops-${event.id}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  return body;
}

// Create-or-update the Google mirror of an internal event, then persist the
// sync result (googleCalendarEventId / meet URL / syncStatus) on the event.
// Never throws data away: on failure, syncStatus="error" + syncError is stored.
export async function attemptEventSync(eventId, { force = false } = {}) {
  const doc = await getDoc();
  const event = (doc.events || []).find((e) => e.id === eventId);
  if (!event) return null;
  if (!event.wantCalendar && !force) return event;

  let patch = {};
  try {
    if (!googleConfigured()) throw new Error("Google 연동이 설정되지 않았습니다 (.env 참조).");
    const { token, calendarId } = await ensureAccessToken();
    const body = eventToGoogleBody(event);
    const base = `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events`;
    // sendUpdates=all → 참석자(attendees)에게 초대/변경 이메일이 실제로 발송된다.
    const qs = "conferenceDataVersion=1&sendUpdates=all";
    const url = event.googleCalendarEventId
      ? `${base}/${encodeURIComponent(event.googleCalendarEventId)}?${qs}`
      : `${base}?${qs}`;
    const res = await fetch(url, {
      method: event.googleCalendarEventId ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 404 && event.googleCalendarEventId) {
      // Mirror was deleted on Google — recreate instead of failing.
      const res2 = await fetch(`${base}?${qs}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(`Google Calendar 오류 (${res2.status}).`);
      patch = extractSyncResult(data2, calendarId);
    } else if (!res.ok) {
      throw new Error(`Google Calendar 오류 (${data?.error?.message || res.status}).`);
    } else {
      patch = extractSyncResult(data, calendarId);
    }
  } catch (err) {
    patch = { syncStatus: "error", syncError: String(err?.message || err) };
  }

  let updated = null;
  await updateDoc((d) => {
    const ev = (d.events || []).find((e) => e.id === eventId);
    if (!ev) return d;
    Object.assign(ev, patch);
    ev.lastSyncAt = new Date().toISOString();
    if (d.settings?.google) d.settings.google.lastSyncAt = ev.lastSyncAt;
    logActivity(d, {
      type: patch.syncStatus === "synced" ? "calendar_synced" : "calendar_sync_failed",
      eventId,
      projectId: ev.projectId,
    });
    updated = ev;
    return d;
  });
  return updated;
}

function extractSyncResult(data, calendarId) {
  const meet =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ||
    "";
  return {
    syncStatus: "synced",
    syncError: "",
    calendarProvider: "google",
    externalCalendarId: calendarId,
    googleCalendarEventId: data.id || "",
    googleMeetUrl: meet,
  };
}

export async function deleteGoogleEvent(event) {
  if (!event?.googleCalendarEventId) return;
  const { token } = await ensureAccessToken();
  const calId = event.externalCalendarId || "primary";
  const res = await fetch(
    `${CAL_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(event.googleCalendarEventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar 삭제 오류 (${res.status}).`);
  }
}
