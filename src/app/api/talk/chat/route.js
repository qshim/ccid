import { guard, allow, env, MINUTE } from '../_lib/guard';
import { systemPrompt, INQUIRY_TOOL, SEND_TOOL } from '../_lib/prompt';
import { cleanDraft, missingFrom, deliver } from '../_lib/inquiry';

// Let's talk 의 대답. 방문자의 말(글자)을 받아 OpenAI 로 대답을 만들고, 만들어지는 대로 한 줄씩
// 흘려보낸다(NDJSON). 클라이언트는 문장이 끝날 때마다 바로 목소리로 바꿔 틀기 시작한다.
//   {"t":"text","d":"..."}   대답의 조각
//   {"t":"draft","draft":{}} 팀에 보낼 메시지의 미리보기(읽기 전용) — 에이전트가 "보낼까요?" 하고 묻는다
//   {"t":"sent"} / {"t":"fallback"} 방문자가 "네"라고 답해 보냈다 / 여기서 못 보내 메일 앱 링크를 보인다
//   {"t":"done"} / {"t":"error"}
//
// 시리가 메시지를 보낼 때처럼 폼 없이 대화로 끝낸다: 모으고 → 미리보기를 보이고 → 묻고 → "네"면 보낸다.
//
// 지연이 곧 자연스러움이라 빠른 설정을 기본으로 둔다: gpt-6-luna, 추론 없음(none), priority 처리.
// (2026-10-24 실측: 첫 글자까지 기본 설정 5.5초 → none 1.2초 → none+priority 0.6초)

const MAX_TURNS = 24;
const MAX_CHARS = 1200;
// 보내기 앞뒤의 한마디는 정해 둔다 — 모델에게 맡기면 보내지 않은 것을 보냈다고 하거나, 묻지 않고
// 넘어갈 수 있다. 보낼지 묻는 말은 화면의 미리보기와 짝이라 빠지면 안 된다.
const LINES = {
  ko: {
    confirm: '이렇게 전할게요. 화면에서 이메일 주소가 맞는지 보시고, 보낼까요?',
    sent: '보냈어요. 팀에서 곧 답장을 드릴 거예요.',
    fallback: '지금은 여기서 바로 보낼 수 없어요. 화면의 링크를 누르면 같은 내용으로 메일 앱이 열려요.',
  },
  en: {
    confirm: 'Here’s what I’ll send. Check that your email is right on screen. Shall I send it?',
    sent: 'Sent. The team will get back to you soon.',
    fallback: 'I can’t send it from here right now. The link on screen opens your mail app with the same message.',
  },
};
const linesFor = (draft) => (/[가-힣]/.test(draft.message) ? LINES.ko : LINES.en);

// 한 대화의 길이. 비용은 시간이 아니라 대답 수(특히 목소리)에 비례하고, 메시지를 천천히 쓰는 사람을
// 시간으로 끊으면 안 되니 방문자의 말 수로 센다. 길어지면 먼저 정리를 권하고(wrapUp), 다음엔 새
// 질문을 받지 않되 팀에 메시지를 보내는 길은 열어 두고(last), 마지막엔 모델을 부르지 않고 닫는다(end).
// 미리보기가 떠 있으면(보낼지 답하는 중이면) 몇 번 더 기다린다. 새로고침하면 새 대화다 — 그쪽은
// IP 마다 하루 한도가 막는다.
const TURNS = { wrapUp: 12, last: 18, end: 24, grace: 4 };
const NOTES = {
  wrapUp: 'This conversation is getting long. Keep replies brief, and when it fits, offer to pass anything else to the team as one message.',
  last: 'This conversation is near its limit. Answer in one short sentence if the answer is below, then say that anything more is best taken up with the team, by a message from here or at hello.ccid@gmail.com. Don’t open new topics. If they want to send a message, help them finish; that path stays open.',
};
const ENDED = {
  ko: '오늘은 여기까지 이야기할게요. 더 나누고 싶은 이야기는 hello.ccid@gmail.com 으로 편하게 보내 주세요.',
  en: 'Let’s leave it here for today. If there’s more to share, write to hello.ccid@gmail.com anytime.',
};

function cleanHistory(messages) {
  if (!Array.isArray(messages)) return null;
  const turns = messages.slice(-MAX_TURNS).map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content ?? '').slice(0, MAX_CHARS).trim(),
  })).filter((m) => m.content);
  return turns.length && turns[turns.length - 1].role === 'user' ? turns : null;
}

async function openai(body, signal) {
  const tier = env('OPENAI_AGENT_TIER', 'priority');
  const reasoning = env('OPENAI_AGENT_REASONING', 'none');
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env('OPENAI_AGENT_MODEL', 'gpt-6-luna'),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 400,
      temperature: 0.3, // 사실을 말하는 안내자 — 표현은 자연스럽되 지어내지 않게 낮춘다
      ...(reasoning !== 'default' && { reasoning_effort: reasoning }),
      ...(tier !== 'default' && { service_tier: tier }),
      ...body,
    }),
  });
}

// OpenAI 의 스트림을 읽으며 글자는 바로 내보내고, 도구 호출은 다 모일 때까지 모은다.
async function relay(res, send) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const calls = [];
  let buffer = '';
  let text = '';
  let usage = null;
  let ended = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line.startsWith('data:') || line === 'data: [DONE]') continue;
      const chunk = JSON.parse(line.slice(5));
      if (chunk.usage) usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta;
      // 도구가 걸려 있으면 모델이 한 문단을 말한 뒤 줄을 바꿔 같은 말을 고쳐 다시 하곤 한다(실측, 8번에
      // 5번). 대답은 소리로 나가는 한 문단이므로 첫 줄바꿈에서 말을 끊는다. 도구 호출은 계속 받는다.
      if (delta?.content && !ended) {
        const piece = text ? delta.content : delta.content.replace(/^\s+/, '');
        const cut = piece.indexOf('\n');
        const keep = cut < 0 ? piece : piece.slice(0, cut);
        if (keep) { text += keep; send({ t: 'text', d: keep }); }
        if (cut >= 0 && text.trim()) ended = true;
      }
      for (const call of delta?.tool_calls || []) {
        const slot = (calls[call.index] ||= { id: '', name: '', args: '' });
        slot.id ||= call.id || '';
        slot.name ||= call.function?.name || '';
        slot.args += call.function?.arguments || '';
      }
    }
  }
  // 비용을 지켜볼 수 있게 토큰 수만 남긴다(대화 내용은 남기지 않는다).
  if (usage) console.info('[talk/chat] tokens', usage.prompt_tokens, 'cached', usage.prompt_tokens_details?.cached_tokens ?? 0, 'out', usage.completion_tokens);
  return { text, calls };
}

export async function POST(request) {
  const blocked = guard(request, 'chat', { limit: 40, windowMs: 10 * MINUTE }, 150);
  if (blocked) return blocked;
  if (!env('OPENAI_API_KEY')) return Response.json({ error: 'not configured' }, { status: 503 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const history = cleanHistory(payload.messages);
  if (!history) return Response.json({ error: 'bad request' }, { status: 400 });
  const lang = payload.lang === 'en' ? 'en' : 'ko';
  const draft = cleanDraft(payload.draft);
  const visitorTurns = payload.messages.filter((m) => m?.role !== 'assistant').length;
  const talkLang = /[가-힣]/.test(history[history.length - 1].content) ? 'ko' : lang;

  const messages = [{ role: 'system', content: systemPrompt(lang) }, ...history];
  const note = (content) => messages.splice(messages.length - 1, 0, { role: 'system', content });
  if (draft) {
    // 화면에 떠 있는 미리보기를 알려 준다 — "네"나 "이메일만 바꿔 주세요" 같은 말을 알아듣도록.
    note(`Preview on the visitor’s screen, waiting for their answer to "send it?" (not sent): ${JSON.stringify(draft)}`);
  }
  if (visitorTurns >= TURNS.last) note(NOTES.last);
  else if (visitorTurns >= TURNS.wrapUp) note(NOTES.wrapUp);
  const ended = visitorTurns >= TURNS.end + (draft ? TURNS.grace : 0);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // 방문자가 말을 끊으면 브라우저가 요청을 닫는다 — 그 뒤로는 보낼 곳이 없다.
      const send = (obj) => { try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')); } catch { /* closed */ } };
      try {
        // 미리보기 아래의 "✓ 네"를 눌렀다 — 모델을 거치지 않고 그 미리보기를 보낸다.
        if (payload.confirm === true && draft && !missingFrom(draft).length) {
          const result = allow(request, 'send', { limit: 4, windowMs: 60 * MINUTE }) ? await deliver(draft, lang) : 'fallback';
          send({ t: result });
          send({ t: 'text', d: linesFor(draft)[result] });
          send({ t: 'done' });
          return;
        }
        if (ended) {
          send({ t: 'text', d: ENDED[talkLang] });
          send({ t: 'ended' });
          send({ t: 'done' });
          return;
        }
        const first = await openai({ messages, tools: [INQUIRY_TOOL, SEND_TOOL], tool_choice: 'auto', parallel_tool_calls: false }, request.signal);
        if (!first.ok) throw new Error(`openai ${first.status}`);
        const { text, calls } = await relay(first, send);

        // 도구를 부르기 전에 이미 말을 했으면 정해 둔 한마디만 잇는다. 한 번 더 부르면 같은 말을
        // 되풀이했다(실측, "이미 한 말은 되풀이하지 말라"고 일러도).
        const lead = text.trim() ? ' ' : '';
        const ask = async (call, result) => {
          if (text.trim()) return;
          const second = await openai({
            messages: [
              ...messages,
              { role: 'assistant', content: null, tool_calls: [{ id: call.id, type: 'function', function: { name: call.name, arguments: call.args } }] },
              { role: 'tool', tool_call_id: call.id, content: result },
            ],
          }, request.signal);
          if (!second.ok) throw new Error(`openai ${second.status}`);
          await relay(second, send);
        };
        const call = calls.find((c) => c?.name === 'draft_inquiry' || c?.name === 'send_inquiry');
        if (call?.name === 'draft_inquiry') {
          // 모델이 이름·이메일을 받기 전에 미리보기를 부르기도 한다(실측). 빠진 것이 있으면 띄우지 않고
          // 그것부터 물어보게 한다.
          let args = {};
          try { args = JSON.parse(call.args || '{}'); } catch { /* 빈 초안으로 취급 */ }
          const shown = cleanDraft(args);
          const missing = missingFrom(shown);
          if (!missing.length) {
            send({ t: 'draft', draft: shown });
            send({ t: 'text', d: lead + linesFor(shown).confirm });
          } else {
            await ask(call, `Not shown. Still missing: ${missing.join(', ')}. Ask for what's missing naturally, in one sentence.`);
          }
        } else if (call?.name === 'send_inquiry') {
          // 화면에 미리보기가 떠 있어야만 보낸다. 보내는 것은 그 미리보기 그대로다.
          if (draft && !missingFrom(draft).length) {
            const result = allow(request, 'send', { limit: 4, windowMs: 60 * MINUTE }) ? await deliver(draft, lang) : 'fallback';
            send({ t: result });
            send({ t: 'text', d: lead + linesFor(draft)[result] });
          } else {
            await ask(call, 'Nothing was sent: there is no complete preview on screen. Collect what is missing and call draft_inquiry first.');
          }
        }
        send({ t: 'done' });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error('[talk/chat]', String(error));
          send({ t: 'error' });
        }
      } finally {
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
