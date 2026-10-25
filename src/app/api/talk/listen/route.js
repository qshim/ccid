import { guard, env, MINUTE } from '../_lib/guard';

// 방문자가 한 말(한 번의 발화)을 글자로. 브라우저가 말이 끝난 것을 알아채면 그 구간만
// 16kHz WAV 로 묶어 보낸다. ElevenLabs Scribe 가 받아 적는다(실측 약 0.6초).
// 소리는 받아 적은 뒤 어디에도 남기지 않는다.

const MAX_BYTES = 1_600_000; // 16kHz 16bit 모노 약 50초

export async function POST(request) {
  const blocked = guard(request, 'listen', { limit: 80, windowMs: 10 * MINUTE }, 300);
  if (blocked) return blocked;
  const key = env('ELEVENLABS_API_KEY');
  if (!key) return Response.json({ error: 'not configured' }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!audio || typeof audio === 'string' || !audio.size || audio.size > MAX_BYTES) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const body = new FormData();
  body.append('model_id', env('ELEVENLABS_STT_MODEL', 'scribe_v2'));
  body.append('tag_audio_events', 'false');
  body.append('file', audio, 'speech.wav');
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    signal: request.signal,
    headers: { 'xi-api-key': key },
    body,
  }).catch(() => null);
  if (!res?.ok) {
    if (res) console.error('[talk/listen]', res.status, (await res.text()).slice(0, 200));
    return Response.json({ error: 'listening unavailable' }, { status: 502 });
  }
  const result = await res.json();
  return Response.json(
    { text: String(result.text || '').trim(), language: result.language_code || '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
