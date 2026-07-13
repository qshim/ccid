// Lab Ops — timezone helpers.
// Storage is UTC ISO strings; the UI reads/writes wall-clock times in the lab's
// timezone (Asia/Seoul) explicitly, instead of trusting the viewer's locale.

export const LAB_TZ = "Asia/Seoul";

// Get the offset (minutes) of LAB_TZ at a given instant (handles DST-free KST
// generically, in case the lab timezone ever changes).
function tzOffsetMinutes(date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: LAB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? 0 : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

// "2026-07-12T14:30" (KST wall clock, from <input type=datetime-local>) → UTC ISO
export function seoulLocalToUtcIso(local) {
  if (!local) return "";
  const [d, t = "00:00"] = String(local).split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  // First guess assuming offset at that wall time ≈ offset now (KST is fixed +9).
  const guess = new Date(Date.UTC(y, m - 1, day, hh, mm));
  const offset = tzOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000).toISOString();
}

// UTC ISO → "YYYY-MM-DDTHH:mm" in Seoul wall clock (for datetime-local inputs)
export function utcIsoToSeoulLocal(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

export function formatSeoul(iso, opts = {}) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: LAB_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...opts,
  }).format(date);
}
