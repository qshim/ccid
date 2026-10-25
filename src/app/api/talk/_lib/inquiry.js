import 'server-only';
import { env } from './guard';

// 팀에 보내는 문의. 방문자가 화면의 미리보기를 보고 "네, 보내 주세요"라고 답했을 때만 대답
// 경로(chat)가 부른다 — 에이전트가 스스로 보내는 일은 없다.
// 메일은 Apps Script 브리지(hello.ccid@gmail.com 이 배포한 웹 앱)가 MailApp 으로 보낸다. 받는 주소는
// 스크립트 안에 고정돼 있어 여기서 정하지 않는다. 브리지가 아직 준비되지 않았거나 실패하면
// 'fallback' 을 돌려주고, 화면은 같은 내용을 담은 메일 앱 링크를 보인다.
//
// 메일 발송은 되돌릴 수 없어 재시도하지 않는다(두 번 갈 수 있다).

const TOPICS = { collaboration: ['연구·협력 제안', 'Research & collaboration'], advisory: ['자문', 'Advisory'], careers: ['채용·인턴십', 'Careers & internships'], other: ['기타 문의', 'Other'] };
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanDraft(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (k, n) => String(raw[k] ?? '').slice(0, n).trim();
  return { topic: TOPICS[raw.topic] ? raw.topic : 'other', message: pick('message', 1200), name: pick('name', 80), email: pick('email', 120), organization: pick('organization', 120) };
}

export function missingFrom(draft) {
  return [!draft?.message && 'what the message is about', !draft?.name && 'their name', !EMAIL.test(draft?.email || '') && 'a valid email address'].filter(Boolean);
}

export async function deliver(draft, lang) {
  // 브리지 스크립트에 inquiry 동작을 배포한 뒤에 TALK_SEND_VIA_BRIDGE=1 을 켠다. 그 전에는 같은
  // 브리지(/lab 운영 데이터)를 건드리지 않고 메일 앱 링크로 넘긴다.
  const url = env('SHEETS_BRIDGE_URL');
  const secret = env('SHEETS_BRIDGE_SECRET');
  if (env('TALK_SEND_VIA_BRIDGE') !== '1' || !url || !secret) return 'fallback';

  const [ko, en] = TOPICS[draft.topic] || TOPICS.other;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow', // Apps Script /exec 는 302 로 답한다
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ secret, action: 'inquiry', inquiry: { ...draft, lang, topicLabel: `${ko} / ${en}` } }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => null);
    // 예전 스크립트는 모르는 동작을 셀 쓰기로 받아 ok 만 돌려준다 — sent 가 있어야 보낸 것이다.
    if (data?.ok && data.sent === true) return 'sent';
    console.error('[talk/inquiry] bridge did not send', data?.error || res.status);
  } catch (error) {
    console.error('[talk/inquiry]', String(error));
  } finally {
    clearTimeout(timer);
  }
  return 'fallback';
}
