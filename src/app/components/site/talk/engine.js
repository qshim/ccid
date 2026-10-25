// Let's talk 의 소리와 대화 흐름. React 바깥의 평범한 클래스이고, 바뀐 것은 콜백으로 알린다.
//
// 한 번의 차례:
//   방문자의 말 → (브라우저 VAD 가 말의 끝을 앎) → /api/talk/listen 으로 받아 적기
//   → /api/talk/chat 이 대답을 흘려보냄 → 문장이 끝날 때마다 /api/talk/speak → Web Audio 로 이어 틀기
// 글로 물으면 받아 적기만 건너뛴다.
//
// 사람처럼 느껴지게 하는 것들(ChatGPT 음성 모드를 참고했다):
//   · 끼어들기: 에이전트가 말하는 중에 방문자가 말을 시작하면 소리를 0.4초에 걸쳐 줄이며 멈춘다.
//     말 같은 소리가 들리는 순간 먼저 소리를 낮추고(덕킹), 기침처럼 짧게 끝나면 되돌린다.
//     어디까지 들렸는지는 글자별 시각으로 알아 기록에 남긴다(그 뒤는 듣지 못한 것으로).
//   · 맞장구: 방문자가 길게 말하다 잠깐 쉴 때 "네~", "음" 같은 짧은 소리를 가끔 낸다.
//   · 생각 소리: 대답이 늦어지면 "음~" 을 한 번. 바로 앞에서 맞장구를 쳤으면 내지 않는다.
//   · 이어 말하기: 대답이 나오기 전에 방문자가 다시 말을 시작하면, 앞의 말과 합쳐 한 번으로 묻는다.
//
// 음성 감지(Silero VAD)는 마이크를 켤 때만 CDN 에서 불러온다(버전 고정).

const CDN = {
  ort: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/',
  vad: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/',
};

// public/talk/{lang}-{n}.mp3 — 2026-10-24 eleven_v3 로 만든 짧은 소리(0.3~1.5초, 앞뒤 무음 제거).
// ko: 0 음~ 1 네~ 2 아~ 3 네, 네 4 으음 5 흠~ 6 음, 음 / en: 0 Mm-hmm 1 Yeah 2 Right 3 I see 4 Mm 5 Hmm 6 Hm-hmm
const CLIPS = {
  ko: { nod: [1, 3, 2, 4, 6], think: [0, 5] },
  en: { nod: [0, 1, 2, 3, 4, 6], think: [5] },
};

const TUNE = {
  threshold: 0.5, // 말로 보는 VAD 확률
  bargeThreshold: 0.8, // 에이전트가 말하는 중엔 더 확실해야 끼어들기로 본다(스피커 소리가 새어 들어올 수 있다)
  endSilenceMs: 650, // 이만큼 조용하면 말이 끝났다
  minSpeechMs: 250,
  bargeMinSpeechMs: 350,
  duck: 0.3, // 말 같은 소리가 들리면 먼저 이만큼으로 낮춘다
  fadeOut: 0.4, // 끼어들면 이 시간(초) 동안 줄이며 멈춘다
  nodPauseMs: 380, // 말하다 이만큼 쉬면 맞장구 후보
  nodAfterSpeechMs: 2800, // 이만큼은 말한 뒤에만
  nodGapMs: 6500, // 맞장구 사이 간격
  nodChance: 0.7,
  thinkAfterMs: 1100, // 말이 끝나고 이만큼 지나도 대답 소리가 없으면 "음~"
  quietStopMs: 75_000, // 마이크를 켠 채 이만큼 조용하면 끈다
};

const SAMPLE_RATE = 24000;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`load ${src}`));
    document.head.appendChild(el);
  });
}

// 16kHz Float32 → 16bit WAV. 받아 적기로 보내는 소리.
function wav(samples, rate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

function pcmFromBase64(b64) {
  const bin = atob(b64);
  const out = new Float32Array(bin.length >> 1);
  for (let i = 0; i < out.length; i++) {
    const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    out[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000;
  }
  return out;
}

// 흘러오는 글을 문장 단위로 끊는다. 문장이 끝나는 대로 목소리를 만들기 시작해야 빨리 들린다.
function sentences(onSentence) {
  let buf = '';
  return {
    push(d) {
      buf += d;
      let m;
      while ((m = buf.match(/^([\s\S]*?[.!?。…]+["'”’)]?)\s+/))) {
        if (m[1].trim()) onSentence(m[1].trim());
        buf = buf.slice(m[0].length);
      }
    },
    flush() {
      if (buf.trim()) onSentence(buf.trim());
      buf = '';
    },
  };
}

// 몇 글자가 들렸는지에 맞춰 화면의 글자를 단어 끝까지 드러낸다.
function revealTo(text, fraction) {
  if (fraction >= 1) return text.length;
  const n = Math.round(text.length * Math.max(0, fraction));
  const space = text.indexOf(' ', n);
  return space < 0 ? text.length : space;
}

const isKorean = (s) => /[가-힣]/.test(s);

export class TalkEngine {
  constructor({ lang, onChange, getPass }) {
    this.lang = lang;
    this.onChange = onChange; // ({ turns, phase, voice, muted, notice, ended }) 중 바뀐 것
    this.getPass = getPass; // 사람으로 보일 때만 통행증을 준다(human.js). 없으면 대화를 시작하지 않는다.
    this.pass = '';
    this.turns = []; // 화면: { id, role, text, shown, interrupted } · 미리보기는 { id, role: 'draft', draft, status }
    this.history = []; // 서버로: { role, content }
    this.draft = null;
    this.phase = 'idle'; // idle · listening · hearing · thinking · speaking
    this.voice = false;
    this.muted = false;
    this.seq = 0;
    this.current = null; // 지금 대답 중인 차례
    this.prefix = ''; // 대답 전에 다시 말을 시작했을 때 앞의 말
    this.level = 0; // 점(.)의 크기 — 0~1
    this.clips = {};
    this.lastClip = -1;
    this.lastNodAt = 0;
    this.listenSeq = 0;
    this.thinkTimer = 0;
    this.thinkEnd = 0; // 생각 소리가 끝나는 시각(ctx 시간) — 대답은 그 뒤에 시작한다
  }

  emit(patch) {
    this.onChange?.(patch);
  }

  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.tuneVad();
    this.emit({ phase });
  }

  setTurns() {
    this.emit({ turns: this.turns.map((t) => ({ ...t })) });
  }

  setLang(lang) {
    this.lang = lang;
  }

  // ---------- 소리 ----------

  async ensureAudio() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.probe = new Float32Array(this.analyser.fftSize);
      this.loadClips();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  loadClips() {
    for (const lang of ['ko', 'en']) {
      const ids = [...new Set([...CLIPS[lang].nod, ...CLIPS[lang].think])];
      this.clips[lang] = {};
      ids.forEach(async (n) => {
        try {
          const data = await (await fetch(`/talk/${lang}-${n}.mp3`)).arrayBuffer();
          this.clips[lang][n] = await this.ctx.decodeAudioData(data);
        } catch { /* 없으면 그 소리만 건너뛴다 */ }
      });
    }
  }

  // 맞장구·생각 소리 한 번. 끝나는 시각(ctx 시간)을 돌려준다.
  playClip(kind, volume) {
    if (!this.ctx || this.muted) return 0;
    const lang = this.talkLang();
    const pool = CLIPS[lang][kind].filter((n) => n !== this.lastClip && this.clips[lang]?.[n]);
    if (!pool.length) return 0;
    const n = pool[Math.floor(Math.random() * pool.length)];
    this.lastClip = n;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = this.clips[lang][n];
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start();
    return this.ctx.currentTime + src.buffer.duration;
  }

  // 대화의 언어 — 마지막으로 방문자가 쓴 말을 따른다.
  talkLang() {
    const last = [...this.history].reverse().find((m) => m.role === 'user');
    if (!last) return this.lang;
    return isKorean(last.content) ? 'ko' : 'en';
  }

  // 점(.)이 따라 움직일 값. 화면이 rAF 로 읽는다.
  readLevel() {
    if (this.phase === 'speaking' && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.probe);
      let sum = 0;
      for (const v of this.probe) sum += v * v;
      this.level += (Math.min(1, Math.sqrt(sum / this.probe.length) * 5) - this.level) * 0.35;
    } else if (this.phase !== 'hearing') {
      this.level *= 0.85;
    }
    return this.level;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    this.emit({ muted });
  }

  // ---------- 묻고 답하기 ----------

  // 대화 요청에 붙일 통행증을 받는다. 사람으로 보이지 않으면(또는 서버가 거절하면) 메일 주소를 안내하는
  // 한 줄만 보이고 false — 대답·목소리·받아 적기 어디에도 요청을 보내지 않는다.
  async admit(said) {
    this.pass = (await this.getPass?.()) || '';
    if (this.pass) return true;
    if (said) this.turns.push({ id: ++this.seq, role: 'user', text: said, shown: said.length });
    const line = this.copy('unavailable');
    this.turns.push({ id: ++this.seq, role: 'assistant', text: line, shown: line.length, notice: true });
    this.setTurns();
    return false;
  }

  headers(extra = {}) {
    return { 'x-talk-pass': this.pass, ...extra };
  }

  async ask(text) {
    if (this.ended) return;
    // 받아 적기는 cciD 를 "CCID", "씨씨아이디" 로 적는다 — 화면과 기록에는 이름대로.
    const said = text.trim().replace(/\b[Cc]\.?\s?[Cc]\.?\s?[Ii]\.?\s?[Dd]\b|씨씨아이디/g, 'cciD');
    if (!said) return;
    this.interrupt();
    await this.ensureAudio();
    const content = this.prefix && this.prefix !== said ? `${this.prefix} ${said}` : said;
    this.prefix = '';
    if (!(await this.admit(content))) return;
    this.history.push({ role: 'user', content });
    this.turns.push({ id: ++this.seq, role: 'user', text: content, shown: content.length });
    this.setTurns();
    return this.respond();
  }

  // 미리보기 아래의 "✓ 네". 말로 "네"라고 한 것과 같게 대화에 남기고, 서버는 모델을 거치지 않고 보낸다.
  async confirm() {
    if (!this.draft || this.ended) return;
    const said = isKorean(this.draft.message) ? '네' : 'Yes';
    this.interrupt();
    await this.ensureAudio();
    if (!(await this.admit(said))) return;
    this.prefix = '';
    this.history.push({ role: 'user', content: said });
    this.turns.push({ id: ++this.seq, role: 'user', text: said, shown: said.length });
    this.setTurns();
    return this.respond({ confirm: true });
  }

  async respond({ confirm = false } = {}) {
    const turn = { id: ++this.seq, role: 'assistant', text: '', shown: 0, interrupted: false };
    const ctrl = new AbortController();
    const voiced = !this.muted && !!this.ctx;
    const gain = voiced ? this.ctx.createGain() : null;
    if (gain) gain.connect(this.master);
    const cur = { turn, ctrl, gain, parts: [], sources: [], cursor: this.thinkEnd ? this.thinkEnd + 0.08 : 0, started: false };
    this.current = cur;
    this.turns.push(turn);
    this.setPhase('thinking');

    let replyLang = null;
    let queue = Promise.resolve();
    const onSentence = (sentence) => {
      if (!voiced) return;
      replyLang ||= isKorean(sentence) ? 'ko' : 'en';
      const part = { text: sentence, start: 0, end: 0, chars: null, times: null, audio: 0 };
      const previous = cur.parts.map((p) => p.text).join(' ');
      cur.parts.push(part);
      // 소리로 나갈 때는 화면 글도 문장들로 맞춘다 — 드러내는 위치가 어긋나지 않게.
      turn.text = cur.parts.map((p) => p.text).join(' ');
      const res = fetch('/api/talk/speak', {
        method: 'POST',
        signal: ctrl.signal,
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text: sentence, lang: replyLang, previous }),
      });
      queue = queue.then(() => this.play(cur, part, res)).catch(() => {});
    };
    const split = sentences(onSentence);

    try {
      const res = await fetch('/api/talk/chat', {
        method: 'POST',
        signal: ctrl.signal,
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ lang: this.lang, messages: this.history, draft: this.draft, confirm }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? 'busy' : 'chat');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n')) >= 0) {
          const msg = JSON.parse(buf.slice(0, cut));
          buf = buf.slice(cut + 1);
          if (msg.t === 'text') {
            split.push(msg.d);
            if (!voiced) { turn.text += msg.d; turn.shown = turn.text.length; this.setTurns(); }
          } else if (msg.t === 'draft') {
            // 미리보기는 대화 안, 지금 대답 바로 앞에 놓는다. 고쳐서 다시 오면 앞의 것을 대신한다.
            this.draft = msg.draft;
            this.turns = this.turns.filter((t) => !(t.role === 'draft' && t.status === 'pending'));
            this.turns.splice(this.turns.indexOf(turn), 0, { id: ++this.seq, role: 'draft', draft: msg.draft, status: 'pending' });
            this.setTurns();
          } else if (msg.t === 'sent' || msg.t === 'fallback') {
            const shown = this.turns.find((t) => t.role === 'draft' && t.status === 'pending');
            if (shown) shown.status = msg.t;
            this.draft = null;
            this.setTurns();
          } else if (msg.t === 'ended') {
            // 대화 한도에 닿았다 — 마지막 인사를 하고 입력을 닫는다.
            this.ended = true;
            this.emit({ ended: true });
          } else if (msg.t === 'error') {
            throw new Error('chat');
          }
        }
      }
      split.flush();
      await queue;
      if (this.current !== cur) return;
      if (voiced) await this.until(cur, () => this.ctx.currentTime >= cur.cursor);
      if (this.current !== cur) return;
      turn.shown = turn.text.length;
      this.history.push({ role: 'assistant', content: turn.text });
      this.finish();
    } catch (error) {
      if (ctrl.signal.aborted || this.current !== cur) return;
      turn.text = error.message === 'busy' ? this.copy('busy') : this.copy('failed');
      turn.shown = turn.text.length;
      turn.notice = true;
      this.finish();
    }
  }

  finish() {
    clearTimeout(this.thinkTimer);
    this.thinkEnd = 0;
    this.current = null;
    if (this.ended) this.stopVoice();
    this.setTurns();
    this.setPhase(this.voice ? 'listening' : 'idle');
    this.armQuiet();
  }

  // 한 문장의 소리를 받아 이어 튼다. 글자별 시각이 오면 그걸로 화면의 글자를 맞춘다.
  async play(cur, part, pending) {
    const res = await pending;
    if (!res.ok || this.current !== cur) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const schedule = (samples) => {
      if (!samples.length || this.current !== cur) return;
      const ctx = this.ctx;
      const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(cur.gain);
      const at = Math.max(cur.cursor, ctx.currentTime + 0.04);
      if (!part.start) part.start = at;
      src.start(at);
      cur.sources.push(src);
      cur.cursor = at + buffer.duration;
      part.end = cur.cursor;
      part.audio += buffer.duration;
      if (!cur.started) {
        cur.started = true;
        clearTimeout(this.thinkTimer);
        this.setPhase('speaking');
        this.reveal(cur);
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let cut;
      while ((cut = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, cut).trim();
        buf = buf.slice(cut + 1);
        if (!line) continue;
        const chunk = JSON.parse(line);
        if (chunk.alignment?.characters && !part.chars) {
          part.chars = chunk.alignment.characters.length;
          part.times = chunk.alignment.character_start_times_seconds;
        }
        if (chunk.audio_base64) schedule(pcmFromBase64(chunk.audio_base64));
      }
    }
    if (buf.trim()) {
      const chunk = JSON.parse(buf);
      if (chunk.audio_base64) schedule(pcmFromBase64(chunk.audio_base64));
    }
  }

  // 지금 시각까지 들린 비율. 글자별 시각이 있으면 그걸, 없으면 소리 길이를 쓴다.
  heard(part, now) {
    if (!part.start || now <= part.start) return 0;
    const t = now - part.start;
    if (part.times?.length) {
      let i = 0;
      while (i < part.times.length && part.times[i] <= t) i++;
      return i / part.times.length;
    }
    return part.audio ? Math.min(1, t / part.audio) : 0;
  }

  // 들린 만큼 글자를 드러낸다. 소리가 끝날 때까지 프레임마다.
  reveal(cur) {
    const tick = () => {
      if (this.current !== cur) return;
      const now = this.ctx.currentTime;
      let shown = 0;
      let text = '';
      for (const part of cur.parts) {
        const lead = text ? text.length + 1 : 0;
        text = text ? `${text} ${part.text}` : part.text;
        const f = this.heard(part, now);
        if (f > 0) shown = lead + revealTo(part.text, f);
      }
      if (shown !== cur.turn.shown) {
        cur.turn.shown = Math.min(shown, cur.turn.text.length);
        this.setTurns();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  until(cur, test) {
    return new Promise((resolve) => {
      const check = () => (this.current !== cur || test() ? resolve() : setTimeout(check, 50));
      check();
    });
  }

  // 대답을 멈춘다. 소리가 나던 중이면 줄이며 멈추고, 들린 데까지만 기록에 남긴다.
  // 아직 소리가 나기 전이면(생각 중) 그 차례를 없던 일로 하고, 방문자의 말은 다음 말과 합친다.
  interrupt({ merge = false } = {}) {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    clearTimeout(this.thinkTimer);
    this.thinkEnd = 0;
    cur.ctrl.abort();
    const { turn } = cur;
    if (cur.started && this.ctx) {
      const now = this.ctx.currentTime;
      cur.gain.gain.cancelScheduledValues(now);
      cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
      cur.gain.gain.linearRampToValueAtTime(0, now + TUNE.fadeOut);
      setTimeout(() => cur.sources.forEach((s) => { try { s.stop(); } catch { /* 이미 끝남 */ } }), TUNE.fadeOut * 1000 + 60);
      // 줄어드는 동안 들리는 것까지 들은 것으로 친다.
      let heardText = '';
      for (const part of cur.parts) {
        const f = this.heard(part, now + TUNE.fadeOut * 0.5);
        if (f <= 0) break;
        const piece = part.text.slice(0, revealTo(part.text, f));
        heardText = heardText ? `${heardText} ${piece}` : piece;
        if (f < 1) break;
      }
      turn.text = heardText;
      turn.shown = heardText.length;
      turn.interrupted = true;
      if (heardText) this.history.push({ role: 'assistant', content: `${heardText} [interrupted]` });
      else this.turns = this.turns.filter((t) => t !== turn);
    } else {
      this.turns = this.turns.filter((t) => t !== turn);
      if (merge) {
        // 방문자가 말을 마치지 않았다 — 앞의 말을 다음 말 앞에 붙인다.
        const last = this.history[this.history.length - 1];
        if (last?.role === 'user') {
          this.history.pop();
          this.prefix = last.content;
          const shownTurn = [...this.turns].reverse().find((t) => t.role === 'user');
          this.turns = this.turns.filter((t) => t !== shownTurn);
        }
      }
    }
    this.setTurns();
    this.setPhase(this.voice ? 'listening' : 'idle');
  }

  // ---------- 마이크 ----------

  async startVoice() {
    if (this.voice) return true;
    const ctx = await this.ensureAudio();
    if (!(await this.admit())) return false;
    if (!ctx || !navigator.mediaDevices?.getUserMedia) {
      this.emit({ notice: 'noVoice' });
      return false;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      this.emit({ notice: 'micBlocked' });
      return false;
    }
    try {
      await loadScript(`${CDN.ort}ort.wasm.min.js`);
      await loadScript(`${CDN.vad}bundle.min.js`);
      this.speech = { on: false, ms: 0, quietMs: 0, at: 0 };
      this.vad = await window.vad.MicVAD.new({
        model: 'v5',
        baseAssetPath: CDN.vad,
        onnxWASMBasePath: CDN.ort,
        audioContext: ctx,
        getStream: async () => stream,
        pauseStream: async () => {},
        resumeStream: async () => stream,
        positiveSpeechThreshold: TUNE.threshold,
        negativeSpeechThreshold: TUNE.threshold - 0.15,
        redemptionMs: TUNE.endSilenceMs,
        minSpeechMs: TUNE.minSpeechMs,
        preSpeechPadMs: 300,
        onSpeechStart: () => this.onSpeechStart(),
        onSpeechRealStart: () => this.onSpeechRealStart(),
        onVADMisfire: () => this.onMisfire(),
        onSpeechEnd: (audio) => this.onSpeechEnd(audio),
        onFrameProcessed: (probs, frame) => this.onFrame(probs, frame),
      });
      await this.vad.start();
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      this.vad = null;
      this.emit({ notice: 'voiceFailed' });
      return false;
    }
    this.stream = stream;
    this.voice = true;
    this.emit({ voice: true, notice: null });
    if (!this.current) this.setPhase('listening');
    this.armQuiet();
    return true;
  }

  stopVoice(notice = null) {
    if (!this.voice) return;
    this.voice = false;
    clearTimeout(this.quietTimer);
    this.vad?.destroy().catch?.(() => {});
    this.vad = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.emit({ voice: false, notice });
    if (this.phase === 'listening' || this.phase === 'hearing') this.setPhase('idle');
  }

  armQuiet() {
    clearTimeout(this.quietTimer);
    if (!this.voice) return;
    this.quietTimer = setTimeout(() => {
      if (this.phase === 'listening') this.stopVoice('quiet');
    }, TUNE.quietStopMs);
  }

  // 에이전트가 말하는 중이면 더 확실한 말만 끼어들기로 본다.
  tuneVad() {
    const speaking = this.phase === 'speaking';
    this.vad?.setOptions({
      positiveSpeechThreshold: speaking ? TUNE.bargeThreshold : TUNE.threshold,
      negativeSpeechThreshold: (speaking ? TUNE.bargeThreshold : TUNE.threshold) - 0.15,
      minSpeechMs: speaking ? TUNE.bargeMinSpeechMs : TUNE.minSpeechMs,
    });
  }

  onSpeechStart() {
    clearTimeout(this.quietTimer);
    this.speech = { on: true, ms: 0, quietMs: 0, at: performance.now() };
    const cur = this.current;
    if (cur?.started && this.ctx) {
      // 먼저 낮춘다 — 진짜 말이면 곧 멈추고, 아니면 되돌린다.
      cur.gain.gain.setTargetAtTime(TUNE.duck, this.ctx.currentTime, 0.04);
    } else if (!cur) {
      this.setPhase('hearing');
    }
  }

  onSpeechRealStart() {
    const cur = this.current;
    if (cur) this.interrupt({ merge: !cur.started });
    this.setPhase('hearing');
  }

  onMisfire() {
    this.speech.on = false;
    const cur = this.current;
    if (cur?.started && this.ctx) cur.gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.08);
    if (cur) return;
    // 기다리게 해 둔 앞의 말이 있으면(이어 말하는 줄 알았는데 아니었다) 이제 묻는다.
    if (this.prefix && this.phase !== 'thinking') {
      const said = this.prefix;
      this.prefix = '';
      this.ask(said);
      return;
    }
    if (this.phase === 'hearing') this.setPhase('listening');
    this.armQuiet();
  }

  onFrame(probs, frame) {
    const now = performance.now();
    const dt = this.lastFrameAt ? Math.min(100, now - this.lastFrameAt) : 32;
    this.lastFrameAt = now;
    if (this.phase === 'hearing') {
      let sum = 0;
      for (const v of frame) sum += v * v;
      this.level += (Math.min(1, Math.sqrt(sum / frame.length) * 8) - this.level) * 0.4;
    }
    if (!this.speech?.on || this.current) return;
    if (probs.isSpeech >= TUNE.threshold) {
      this.speech.ms += dt;
      this.speech.quietMs = 0;
      return;
    }
    const before = this.speech.quietMs;
    this.speech.quietMs += dt;
    // 길게 말하다 잠깐 쉬는 순간에만, 가끔.
    if (before < TUNE.nodPauseMs && this.speech.quietMs >= TUNE.nodPauseMs
      && this.speech.ms >= TUNE.nodAfterSpeechMs && now - this.lastNodAt >= TUNE.nodGapMs
      && Math.random() < TUNE.nodChance) {
      this.lastNodAt = now;
      this.playClip('nod', 0.45);
    }
  }

  async onSpeechEnd(audio) {
    this.speech.on = false;
    if (this.current) return; // 끼어들기 직후의 꼬리 — onSpeechRealStart 가 이미 정리했다
    this.setPhase('thinking');
    const id = ++this.listenSeq;
    const endedAt = performance.now();
    // 대답 소리가 늦으면 "음~" 한 번. 방금 맞장구를 쳤으면 하지 않는다.
    clearTimeout(this.thinkTimer);
    this.thinkEnd = 0;
    this.thinkTimer = setTimeout(() => {
      if (id !== this.listenSeq || this.phase !== 'thinking' || this.current?.started || endedAt - this.lastNodAt < 2500) return;
      const end = this.playClip('think', 0.55);
      if (!end) return;
      this.thinkEnd = end;
      if (this.current && !this.current.started) this.current.cursor = Math.max(this.current.cursor, end + 0.08);
    }, TUNE.thinkAfterMs);

    let text = '';
    try {
      const form = new FormData();
      form.append('audio', wav(audio), 'speech.wav');
      const res = await fetch('/api/talk/listen', { method: 'POST', headers: this.headers(), body: form });
      if (res.ok) text = ((await res.json()).text || '').trim();
    } catch { /* 못 알아들었다 */ }
    if (id !== this.listenSeq) return;
    if (/^[\s.,!?…~-]*$/.test(text)) text = '';
    // 받아 적는 사이 방문자가 다시 말을 시작했다 — 다음 말과 합친다.
    if (this.speech.on) {
      clearTimeout(this.thinkTimer);
      if (text) this.prefix = (this.prefix ? `${this.prefix} ` : '') + text;
      return;
    }
    if (!text && !this.prefix) {
      clearTimeout(this.thinkTimer);
      this.setPhase(this.voice ? 'listening' : 'idle');
      this.armQuiet();
      return;
    }
    await this.ask(text || this.prefix);
  }

  copy(key) {
    const ko = this.lang === 'ko';
    return {
      busy: ko ? '질문이 많아 잠시 쉬어야 해요. 몇 분 뒤에 다시 물어봐 주세요.' : 'That’s a lot of questions at once. Try again in a few minutes.',
      failed: ko ? '지금은 대답을 만들지 못했어요. 다시 물어봐 주시거나 hello.ccid@gmail.com 으로 보내 주세요.' : 'I couldn’t answer just now. Ask again, or write to hello.ccid@gmail.com.',
      // 사람 확인을 통과하지 못했을 때. 탓하는 말 없이, 사람에게도 AI 에이전트에게도 쓸모 있는 길(메일)을 준다.
      unavailable: ko ? '여기서는 지금 대화를 시작할 수 없어요. hello.ccid@gmail.com 으로 보내 주시면 팀이 답해 드려요.' : 'A conversation can’t start here right now. Write to hello.ccid@gmail.com and the team will get back to you.',
    }[key];
  }

  destroy() {
    this.interrupt();
    this.stopVoice();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
