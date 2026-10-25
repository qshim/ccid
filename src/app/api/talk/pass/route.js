import { guard, MINUTE } from '../_lib/guard';
import { issuePass } from '../_lib/pass';
import { scoreHuman } from '@/app/components/site/talk/humanScore';

// 대화 통행증을 준다. 브라우저가 보낸 입력 요약(숫자뿐)을 브라우저와 같은 함수로 다시 판정한다.
// 사람으로 보이지 않으면 주지 않는다 — 그러면 에이전트는 메일 주소를 안내하고 대화를 시작하지 않는다.
export async function POST(request) {
  const blocked = guard(request, 'pass', { limit: 12, windowMs: 10 * MINUTE }, 60, { pass: false });
  if (blocked) return blocked;
  const summary = await request.json().catch(() => null);
  const verdict = scoreHuman(summary || {}, request.headers.get('user-agent') || '');
  if (!verdict.human) return Response.json({ error: 'unavailable' }, { status: 403 });
  return Response.json(issuePass(), { headers: { 'Cache-Control': 'no-store' } });
}
