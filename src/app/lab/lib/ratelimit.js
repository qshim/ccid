// Lab Ops — login attempt rate limiter.
// In-memory, per-IP sliding window: 5 failures / 10 minutes → temporary block.
// Note: on serverless (Vercel) this is per-instance, so it is a best-effort
// brake rather than a hard guarantee — documented in LAB_OPS.md.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map(); // ip -> number[] (timestamps)

function prune(list, now) {
  return list.filter((t) => now - t < WINDOW_MS);
}

export function isBlocked(ip) {
  const now = Date.now();
  const list = prune(failures.get(ip) || [], now);
  failures.set(ip, list);
  return list.length >= MAX_FAILURES;
}

export function recordFailure(ip) {
  const now = Date.now();
  const list = prune(failures.get(ip) || [], now);
  list.push(now);
  failures.set(ip, list);
}

export function clearFailures(ip) {
  failures.delete(ip);
}

export function retryAfterSeconds(ip) {
  const list = failures.get(ip) || [];
  if (list.length === 0) return 0;
  const oldest = Math.min(...list);
  return Math.max(1, Math.ceil((WINDOW_MS - (Date.now() - oldest)) / 1000));
}
