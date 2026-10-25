import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// 대화 통행증. 브라우저가 "사람으로 보인다"는 요약을 보내면(/api/talk/pass) 30분짜리 서명을 준다.
// 대답·목소리·받아 적기 경로는 이 서명이 있어야 일한다 — 사이트의 스크립트를 거치지 않고 경로만
// 두드리는 자동화는 여기서 걸린다. 서명 키의 바탕은 TALK_PASS_SECRET, 없으면 SESSION_SECRET.
// 둘 다 없으면(로컬) 프로세스마다 새 키를 만든다 — 서버를 다시 켜면 통행증도 새로 받는다.
// 바탕 키를 그대로 쓰지 않고 이 용도의 키를 따로 뽑는다: /lab 로그인 토큰도 SESSION_SECRET 으로
// 같은 모양(본문.서명)을 쓰기 때문에, 그대로 쓰면 통행증이 /lab 로그인 토큰으로 통과한다.

export const PASS_HEADER = 'x-talk-pass';
const TTL = 30 * 60_000;
let fallbackKey = null;
let derived = null;
const secret = (name) => (process.env[name] || '').trim();
const base = () => secret('TALK_PASS_SECRET') || secret('SESSION_SECRET') || (fallbackKey ||= randomBytes(32).toString('hex'));
const key = () => (derived ||= createHmac('sha256', base()).update('ccid talk pass v1').digest());
const mac = (body) => createHmac('sha256', key()).update(body).digest('base64url');

export function issuePass() {
  const exp = Date.now() + TTL;
  const body = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return { token: `${body}.${mac(body)}`, exp };
}

export function validPass(request) {
  const token = request.headers.get(PASS_HEADER) || '';
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}
