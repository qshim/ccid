import { guard, env, MINUTE } from '../_lib/guard';

// 대답 한 문장을 cciD Guide 목소리로. ElevenLabs 의 스트리밍(글자별 시각 포함)을 그대로 흘려 준다.
// 한 줄에 하나씩 JSON 이 오고, 소리는 audio_base64 의 24kHz 16bit 모노 PCM 이다. 브라우저가 Web Audio
// 로 조각마다 이어 틀고, 방문자가 말을 끊으면 음량을 줄이며 멈출 수 있게 압축하지 않은 소리로 받는다.
// 글자별 시각(alignment)으로 화면의 글자를 목소리에 맞춰 드러내고, 끊겼을 때 어디까지 들렸는지 안다.
//
// 목소리(2026-10-24 귀로 골랐다): KO 는 EN 목소리를 서울말로 리믹스한 것, EN 은 디자인한 것.
// 모델은 eleven_multilingual_v2 가 기본. 시작까지 약 1초라, 더 빠른 모델(turbo/flash v2.5)을
// 쓰려면 ELEVENLABS_TTS_MODEL 로 바꾼다.

const VOICES = { ko: 'KYwimsWr2vcADJr19cfe', en: 'mm43BCm0W4mWaXPWB3Ox' };

// 화면에는 cciD 로 두고, 소리로만 읽는 법을 정한다 — 쉼 없이 한 단어처럼. 메일 주소도 소리로는
// 사람이 부르듯이.
function forSpeech(text, lang) {
  return text
    .replace(/hello\.ccid@gmail\.com/gi, lang === 'ko' ? '헬로 점 씨씨아이디 골뱅이 지메일 닷컴' : 'hello dot C-C-I-D at gmail dot com')
    .replace(/\bcciD\b/gi, lang === 'ko' ? '씨씨아이디' : 'C-C-I-D');
}

export async function POST(request) {
  const blocked = guard(request, 'speak', { limit: 150, windowMs: 10 * MINUTE }, 500);
  if (blocked) return blocked;
  const key = env('ELEVENLABS_API_KEY');
  if (!key) return Response.json({ error: 'not configured' }, { status: 503 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const lang = payload.lang === 'en' ? 'en' : 'ko';
  const text = String(payload.text ?? '').trim().slice(0, 600);
  if (!text) return Response.json({ error: 'bad request' }, { status: 400 });
  const context = (v) => forSpeech(String(v ?? '').slice(-300), lang);

  const model = env('ELEVENLABS_TTS_MODEL', 'eleven_multilingual_v2');
  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[lang]}/stream/with-timestamps?output_format=pcm_24000`, {
    method: 'POST',
    signal: request.signal,
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: forSpeech(text, lang),
      model_id: model,
      // 앞뒤 문장을 알려 주면 문장마다 따로 만들어도 억양이 이어진다.
      ...(payload.previous && { previous_text: context(payload.previous) }),
      ...(payload.next && { next_text: context(payload.next) }),
      ...(model.endsWith('v2_5') && { language_code: lang }),
      voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: 1.0 },
    }),
  }).catch(() => null);
  if (!upstream?.ok) {
    if (upstream) console.error('[talk/speak]', upstream.status, (await upstream.text()).slice(0, 200));
    return Response.json({ error: 'voice unavailable' }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
