import 'server-only';
import { BOT_UA } from '@/app/components/site/talk/humanScore';
import { validPass } from './pass';

// 공개 페이지에서 부르는 경로라 누구나 두드릴 수 있다. 두 겹으로 막는다.
// 1) 다른 사이트의 페이지가 우리 키로 말하게 하지 못하도록, 브라우저가 붙이는 Origin 이
//    이 사이트가 아니면 거절한다(curl 같은 직접 호출은 못 막는다 — 그건 2 가 맡는다).
// 2) IP 마다 시간 창 안의 호출 수를 센다. 서버 인스턴스마다 따로 세는 느슨한 한도라,
//    비용 폭주를 막는 안전띠일 뿐 정확한 계량은 아니다.

const buckets = new Map();

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'local').trim();
}

function sameSite(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

// 시간 창 안에서 한 번 더 써도 되면 true.
export function allow(request, name, { limit, windowMs }) {
  const key = `${name}:${clientIp(request)}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now - b.start > windowMs) buckets.delete(k);
  }
  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  return ++bucket.count <= limit;
}

// 통과하면 null, 막히면 바로 돌려줄 Response. daily 를 주면 하루 한도도 함께 센다.
// 크롤러·AI 에이전트의 User-Agent 는 받지 않고, 대화 경로는 사람 확인 통행증(pass.js)을 요구한다.
export function guard(request, name, limits, daily, { pass = true } = {}) {
  if (!sameSite(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (BOT_UA.test(request.headers.get('user-agent') || '')) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (pass && !validPass(request)) return Response.json({ error: 'pass' }, { status: 403 });
  if (!allow(request, name, limits)) return Response.json({ error: 'busy' }, { status: 429 });
  if (daily && !allow(request, `${name}-day`, { limit: daily, windowMs: DAY })) return Response.json({ error: 'busy' }, { status: 429 });
  return null;
}

export const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// .env.local 에 `KEY = value` 처럼 공백을 둔 줄도 Next 가 읽어 주지만, 따옴표나 앞뒤 공백이
// 남을 수 있어 한 번 다듬는다.
export function env(name, fallback = '') {
  const value = (process.env[name] || '').trim().replace(/^["']|["']$/g, '');
  return value || fallback;
}
