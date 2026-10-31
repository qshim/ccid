// "Let's talk" 에이전트의 첫 인사를 미리 녹음한다(public/talk/{ko,en}-greet.mp3). 말을 걸면 바로 이 소리로 인사하고,
// 같은 말(src/app/components/site/talk/greeting.json)을 글로 드러낸다. 목소리 · 모델 · 읽는 법은
// src/app/api/talk/speak/route.js 와 같게 둔다. 키는 cciD/.env.local 의 ELEVENLABS_API_KEY 에서 읽고 출력하지 않는다.
// 실행: node scripts/generate_talk_greeting.mjs (인사 문구를 고치면 다시 실행한다)
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('..', import.meta.url).pathname;
const env = readFileSync(`${root}.env.local`, 'utf8');
const key = (env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
if (!key) throw new Error('ELEVENLABS_API_KEY is missing in .env.local');
const GREETING = JSON.parse(readFileSync(`${root}src/app/components/site/talk/greeting.json`, 'utf8'));
const VOICES = { ko: 'KYwimsWr2vcADJr19cfe', en: 'mm43BCm0W4mWaXPWB3Ox' };
const forSpeech = (text, lang) => text.replace(/\bcciD\b/gi, lang === 'ko' ? '씨씨아이디' : 'C-C-I-D');
for (const lang of ['ko', 'en']) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[lang]}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: forSpeech(GREETING[lang], lang), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: 1.0 } }),
  });
  if (!res.ok) throw new Error(`${lang}: ${res.status} ${(await res.text()).slice(0, 160)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // 앞뒤의 무음을 잘라 누르자마자 들리고, 끝나자마자 마이크를 청할 수 있게(ffmpeg 필요).
  const out = `${root}public/talk/${lang}-greet.mp3`;
  writeFileSync(`${out}.raw.mp3`, buf);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${out}.raw.mp3`, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse', '-b:a', '128k', `${out}.tmp.mp3`]);
  renameSync(`${out}.tmp.mp3`, out);
  execFileSync('rm', [`${out}.raw.mp3`]);
  console.log(lang, 'ok');
}
