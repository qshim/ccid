"use client";

// 푸터의 "Let's talk." — 섹션이 화면에 들어오면 글자가 커지고, 마침표가 저절로 깨어나 블롭이 된다. 동시에
// 블롭 바로 오른쪽에서 캡슐 모양의 대화창이 나와 글로 먼저 인사한다(아직 누른 손길이 없어 소리는 못 낸다).
// 오른쪽에 자리가 없으면(좁은 화면) 화면 아래 가운데에 뜬다. 대화를 시작한 뒤 푸터를 떠나도 아래 가운데에 떠 있다.
// 대화창에는 지금 주고받는 말만 있다 — 에이전트의 한마디와 방문자의 한마디. 그 옆에 소리 · 글로 쓰기 ·
// 마이크(말이 먼저, 바로 아래에 안내나 지금 하는 일) · 닫기가 있다. 에이전트의 말은 자막처럼 한 줄씩 보인다
// (Caption): 문장마다 새 줄, 단어가 하나씩 떠오르고, 다음 줄이 오면 앞 줄은 한꺼번에 옅어진다.
// 마이크를 누르면 바로 마이크를 청한다(인사는 이미 글로 했다). 깨어나기 전에 제목이나 모바일 메뉴로 먼저
// 말을 걸면 목소리로 인사한 뒤 마이크를 청한다. 마이크를 쓸 수 없으면 글로 쓰는 줄로 넘어간다.
// 대화를 시작하기 전에 푸터를 떠나면 창은 가라앉고, 시작한 뒤에는 다른 곳을 봐도 떠 있다(닫기 전까지).
// 다른 페이지로 가도 대화가 이어진다(푸터는 레이아웃에 있다).
//
// 팀에 보낼 일이 생기면 시리가 메시지를 보낼 때처럼 대화로 끝낸다: 에이전트가 이름·이메일을 물어
// 모으고, 고칠 수 없는 미리보기를 보이며 "보낼까요?" 하고 묻는다. "네"라고 답하거나 "✓ 네"를 누르면 보낸다.
//
// "Let's talk." 의 마침표가 에이전트다. 처음에는 글자와 같은 검은 마침표다. 방문자가 말을 걸려고 하면
// (입력 줄에 들어오거나 말로 하기를 누르면) 색과 결이 바뀌며 글자 기둥 높이의 유리 구슬 블롭(AgentForm)으로
// 자라고(글자들은 하나씩 옅게 물러나고, 블롭은 공처럼 오른쪽으로 굴렀다 돌아온다), 그 뒤로 듣고 ·
// 생각하고 · 말하는 모습을 보인다. WebGL 을 쓸 수 없으면 보라 점이 되어 소리 크기를 따라 커졌다
// 작아지고, 생각하는 동안 깜빡인다.
// 소리와 대화 흐름은 engine.js 가 맡는다. 대답에 나오는 페이지 이름은 링크가 된다.
//
// AI·자동화 방문자에게는 대화를 열지 않는다(human.js): 둘러보는 동안 커서·스크롤·타자·탭의 결을 조용히
// 보고, 대화를 시작할 때 사람으로 보여야 서버가 통행증을 준다. 아니면 메일 주소를 안내하는 한 줄만 보인다
// — 사람에게는 보이지 않는 문턱이고, AI 에이전트에게도 쓸모 있는 길(메일)은 남긴다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AgentForm from "./AgentForm";
import { TalkEngine } from "./engine";
import { noteMenuTap, notePage, talkPass, watchHuman } from "./human";
import "./talk.css";

const COPY = {
  ko: {
    placeholder: "질문을 입력하세요",
    talk: "말로 하기",
    hint: "누르고 말해보세요",
    close: "대화창 닫기",
    region: "cciD와 대화",
    micOff: "마이크 끄기",
    typeInstead: "글로 쓰기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
    phase: { listening: "듣고 있어요", hearing: "듣고 있어요", thinking: "생각하는 중", speaking: "말을 걸면 멈춰요" },
    notice: {
      micBlocked: "마이크를 허용하거나 직접 타이핑해주세요.",
      noVoice: "여기서는 말로 할 수 없어요. 직접 타이핑해주세요.",
      voiceFailed: "음성을 불러오지 못했어요. 직접 타이핑해주세요.",
      quiet: "한동안 조용해서 마이크를 껐어요.",
    },
    to: "cciD 팀에게",
    sentTo: "cciD 팀에 보냈어요",
    mailApp: "메일 앱에서 보내기",
    subject: "cciD 문의",
    yes: "네",
    yesLabel: "네, 보내 주세요",
    ended: "대화를 마쳤어요",
  },
  en: {
    placeholder: "Type a question",
    talk: "Talk",
    hint: "Tap and talk",
    close: "Close the conversation",
    region: "Talk with cciD",
    micOff: "Mic off",
    typeInstead: "Type instead",
    mute: "Mute",
    unmute: "Unmute",
    phase: { listening: "Listening", hearing: "Listening", thinking: "Thinking", speaking: "Talk to cut in" },
    notice: {
      micBlocked: "Allow the mic, or type your question.",
      noVoice: "Talking isn’t available here. Please type.",
      voiceFailed: "Voice couldn’t load. Please type.",
      quiet: "It went quiet, so I turned the mic off.",
    },
    to: "To the cciD team",
    sentTo: "Sent to the cciD team",
    mailApp: "Send from my mail app",
    subject: "cciD enquiry",
    yes: "Yes",
    yesLabel: "Yes, send it",
    ended: "This conversation has ended",
  },
};

const TO = "hello.ccid@gmail.com";
// 말로 할 수 없어 글로 넘어갈 때의 알림 — 대화 줄이 아니라 입력 칸에 잠깐 보였다가 "질문을 입력하세요"로 바뀐다.
const TYPE_NOTICES = ["micBlocked", "noVoice", "voiceFailed"];
const NOTE_MS = 2800;
const TITLE = "Let’s talk"; // 글자마다 따로 물러나도록 한 글자씩 나눠 그린다
const isKorean = (s) => /[가-힣]/.test(s);

function KeyboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6.5 10h1m3 0h1m3 0h1m3 0h1M6.5 14h11" /></svg>;
}
function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6.5 6.5 11 11m0-11-11 11" /></svg>;
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;
}
function SpeakerIcon({ off }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />{off ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}</svg>;
}

function mailto(draft, t) {
  const subject = `${t.subject}: ${draft.name}`;
  const body = [draft.message, "", "—", draft.name, draft.organization, draft.email].filter((v, i) => i < 4 || v).join("\n");
  return `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// 대답 속 "People 페이지", "Projects page" 같은 말을 그 페이지로 가는 링크로. 눌러도 대화는 이어진다.
const PAGES = { Projects: "/collaborations", People: "/people", Research: "/#research", About: "/#about" };
const PAGE_NAME = /\b(?:Projects|People|Research|About)(?: 페이지| page)/g;

// ---------- 자막 ----------
// 에이전트의 말을 한 줄씩. 문장(과 줄바꿈)마다 새 줄에서 시작하고, 한 줄에 들어가지 않는 문장은 고르게
// 나눈다(반쯤 찼으면 쉼표 뒤에서). 줄은 제 글과 단어 자리를 들고 다녀(at = 원문 속 시작), 원문이 늘거나
// 화면 폭이 바뀌어도 지금 보이는 줄은 그대로다.
const STEP = 80; // 단어 사이(ms)
const LEAD = 150; // 앞 줄이 옅어지기 시작한 뒤 새 줄의 첫 단어까지
const OUT = 400; // 앞 줄이 물러나는 시간
const hold = (chars) => Math.min(3400, Math.max(1000, chars * 62)); // 소리 없이 읽을 때 한 줄을 두는 시간

let pen; // 글 폭을 재는 캔버스(하나만)
function measurer({ font, spacing }) {
  pen ||= document.createElement("canvas").getContext("2d");
  return (s) => {
    pen.font = font;
    if ("letterSpacing" in pen) pen.letterSpacing = spacing;
    return pen.measureText(s).width;
  };
}

function captionLines(text, width, max) {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
  const links = [...text.matchAll(PAGE_NAME)].map((m) => ({ start: m.index, end: m.index + m[0].length, href: PAGES[m[0].split(" ")[0]] }));
  const sentences = [];
  let run = [];
  words.forEach((w, i) => {
    run.push(w);
    const next = words[i + 1];
    if (!next || /[.!?。…]["'”’)]*$/.test(text.slice(w.start, w.end)) || text.slice(w.end, next.start).includes("\n")) { sentences.push(run); run = []; }
  });
  const span = (ws) => width(text.slice(ws[0].start, ws[ws.length - 1].end));
  const lines = [];
  for (const sentence of sentences) {
    const count = Math.ceil(span(sentence) / max);
    const target = span(sentence) / count;
    let line = [];
    sentence.forEach((w, i) => {
      if (line.length && span([...line, w]) > max) { lines.push(line); line = []; }
      line.push(w);
      const last = i === sentence.length - 1;
      if (count > 1 && !last && (span(line) >= target * 0.92 || (/[,，、]$/.test(text.slice(w.start, w.end)) && span(line) >= target * 0.55))) { lines.push(line); line = []; }
    });
    if (line.length) lines.push(line);
  }
  return lines.map((ws) => {
    const at = ws[0].start;
    const end = ws[ws.length - 1].end;
    return {
      at,
      text: text.slice(at, end),
      words: ws.map((w) => ({ start: w.start - at, end: w.end - at })),
      links: links.filter((l) => l.end > at && l.start < end).map((l) => ({ start: l.start - at, end: l.end - at, href: l.href })),
    };
  });
}

// 한 줄을 그린다. 단어 앞의 빈칸은 그 단어와 함께 떠오르고, 페이지 이름은 단어를 가로질러 한 링크로 묶는다.
function CaptionLine({ line, on, upto = line.words.length, tail }) {
  const parts = [];
  line.words.slice(0, upto).forEach((w, i) => {
    let a = i ? line.words[i - 1].end : w.start;
    const marks = line.links.flatMap((l) => [l.start, l.end]).filter((x) => x > a && x < w.end).sort((x, y) => x - y);
    for (const b of [...marks, w.end]) {
      const link = line.links.find((l) => a >= l.start && a < l.end);
      parts.push({ text: line.text.slice(a, b), word: i, href: link?.href });
      a = b;
    }
  });
  const groups = [];
  for (const part of parts) {
    const last = groups[groups.length - 1];
    if (last && last.href === part.href) last.parts.push(part); else groups.push({ href: part.href, parts: [part] });
  }
  const word = (part, k) => <span key={k} className={part.word < on ? "is-on" : undefined}>{part.text}</span>;
  return (
    <>
      {groups.map((g, k) => (g.href ? <Link key={k} href={g.href}>{g.parts.map(word)}</Link> : g.parts.map((part, j) => word(part, `${k}.${j}`))))}
      {tail && <span className="is-on">…</span>}
    </>
  );
}

// source: { key, text, shown, synced, cut, notice } — 지금 보일 말. 다른 말로 바뀌면 보이던 줄은 물러나고 새 말은
// 첫 줄부터(이미 다 본 말로 돌아오면 그 마지막 줄을 그대로). 단어는 드러내도 되는 데(shown)까지만 떠오른다.
// 다음 줄로는 소리가 거기 닿으면 바로, 소리 없이 읽을 때는 이 줄을 읽을 시간이 지나면 넘어간다.
function Caption({ source }) {
  const slot = useRef(null);
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    const el = slot.current;
    const read = () => {
      const s = getComputedStyle(el);
      setMetrics({ width: el.clientWidth, font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`, spacing: s.letterSpacing });
    };
    const resize = new ResizeObserver(read);
    resize.observe(el);
    document.fonts?.ready.then(read);
    return () => resize.disconnect();
  }, []);

  const key = source?.key ?? null;
  const text = source?.text || "";
  const shown = source?.shown ?? 0;
  const synced = !!source?.synced;
  const lines = useMemo(() => (metrics?.width && text ? captionLines(text, measurer(metrics), metrics.width * 0.98) : []), [text, metrics]);

  const [play, setPlay] = useState({ key: null, index: 0, line: null, on: 0, full: 0, seen: {} });
  const [out, setOut] = useState(null);
  if (play.key !== key) {
    const seen = play.key == null ? play.seen : { ...play.seen, [play.key]: play.index };
    const back = seen[key];
    if (play.line && play.on) setOut({ id: `${play.key}:${play.index}`, line: play.line, notice: play.notice });
    const index = back ?? 0;
    const line = lines[index] || null;
    setPlay({ key, index, line, on: back != null && line ? line.words.length : 0, full: back != null ? 1 : 0, notice: source?.notice, seen });
  }

  useEffect(() => {
    if (!out) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setOut(null), reduce ? 0 : OUT + 60);
    return () => clearTimeout(timer);
  }, [out]);

  useEffect(() => {
    if (play.key !== key) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const later = (ms, fn) => { const timer = setTimeout(fn, ms); return () => clearTimeout(timer); };
    const line = play.line;
    if (!line) return lines[play.index] ? later(0, () => setPlay((p) => ({ ...p, line: lines[p.index], on: 0, full: 0 }))) : undefined;
    const avail = line.words.filter((w) => line.at + w.start < shown).length;
    if (play.on < avail) {
      const on = reduce ? avail : play.on + 1;
      return later(reduce ? 0 : play.on ? STEP : LEAD, () => setPlay((p) => ({ ...p, on, full: on === line.words.length ? performance.now() : 0 })));
    }
    if (play.on < line.words.length) return; // 소리가 거기까지 오기를 기다린다
    const next = lines[play.index + 1];
    if (!next || next.at >= shown) return; // 다음 줄이 아직 없다
    const wait = synced ? 0 : hold(line.text.length) - (performance.now() - play.full);
    return later(Math.max(0, wait), () => {
      setOut({ id: `${play.key}:${play.index}`, line, notice: play.notice });
      setPlay((p) => ({ ...p, index: p.index + 1, line: next, on: 0, full: 0 }));
    });
  }, [play, key, lines, shown, synced]);

  const line = play.key === key ? play.line : null;
  const avail = line ? line.words.filter((w) => line.at + w.start < shown).length : 0;
  const cut = source?.cut && line && play.on >= avail;
  return (
    <div className="talk-cap" ref={slot}>
      {out && <p key={out.id} className={`is-out${out.notice ? " is-notice" : ""}`} aria-hidden="true"><CaptionLine line={out.line} on={Infinity} /></p>}
      {line && <p key={`${key}:${play.index}`} className={play.notice ? "is-notice" : undefined}><CaptionLine line={line} on={play.on} upto={cut ? avail : undefined} tail={cut} /></p>}
    </div>
  );
}

// 팀에 보낼 메시지의 미리보기. 고치는 칸이 없다 — 고치는 것은 말로 하고, 보내는 것은 "네"라고 답하거나
// 아래의 "✓ 네"를 누른다.
function Preview({ draft, status, t }) {
  return (
    <figure className={`talk-preview is-${status}`}>
      <figcaption>{status === "sent" ? t.sentTo : t.to}</figcaption>
      <blockquote>{draft.message}</blockquote>
      <p>{[draft.name, draft.organization].filter(Boolean).join(", ")}<br />{draft.email}</p>
      {status === "fallback" && <a className="talk-mail" href={mailto(draft, t)}>{t.mailApp}</a>}
    </figure>
  );
}

export default function TalkAgent({ lang }) {
  const t = COPY[lang] || COPY.ko;
  const engine = useRef(null);
  const inputRef = useRef(null);
  const nowRef = useRef(null);
  const titleRef = useRef(null);
  const talkRef = useRef(null);
  const [room, setRoom] = useState("none"); // 블롭 오른쪽에 대화창이 들어갈 자리: wide(한 줄) · narrow(두 줄) · none
  const [awake, setAwake] = useState(false); // 마침표가 블롭이 되었는가(한 번 깨면 그대로)
  const [open, setOpen] = useState(false); // 대화창(캡슐)이 떠 있는가
  const dismissed = useRef(false); // 방문자가 닫았다 — 다시 푸터에 와도 저절로 뜨지 않는다(제목을 누르면 뜬다)
  const [typing, setTyping] = useState(false); // 글로 쓰는 줄을 열었는가(말이 먼저, 글은 고를 때만)
  const typingRef = useRef(false);
  const [inView, setInView] = useState(false); // 블롭은 화면에 보일 때만 그린다
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [voice, setVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState(null);
  const [text, setText] = useState("");
  const [starting, setStarting] = useState(false);
  const [ended, setEnded] = useState(false);
  const levelRef = useRef(0); // 블롭이 읽는 소리 크기(0~1)
  const cueRef = useRef(null); // 블롭에 사건을 알린다(AgentForm 의 CUES)
  const [hover, setHover] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    watchHuman();
    const e = new TalkEngine({
      lang,
      getPass: talkPass,
      onChange: (patch) => {
        if ("turns" in patch) setTurns(patch.turns);
        if ("phase" in patch) setPhase(patch.phase);
        if ("voice" in patch) setVoice(patch.voice);
        if ("muted" in patch) setMuted(patch.muted);
        if ("notice" in patch) setNotice(patch.notice);
        if ("ended" in patch) setEnded(patch.ended);
      },
    });
    engine.current = e;
    // 다른 탭으로 가면 마이크를 닫고 말을 멈춘다.
    const onHidden = () => { if (document.hidden) { e.interrupt(); e.stopVoice(); } };
    document.addEventListener("visibilitychange", onHidden);
    return () => { document.removeEventListener("visibilitychange", onHidden); e.destroy(); engine.current = null; };
    // 엔진은 한 번만 만든다 — 언어는 아래에서 따로 넘긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { engine.current?.setLang(lang); }, [lang]);
  useEffect(() => { notePage(pathname); }, [pathname]);

  // 화면에 들어오면 "Let's talk" 이 자라고 입력 줄이 따라 나온다. 이 컴포넌트가 다시 그려져도
  // (언어 전환·핫 리로드) 스스로 다시 붙인다. 같은 자리에서 블롭을 그릴지(보이는지)도 본다.
  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting && !reduced) title.classList.add("is-revealed");
    }, { rootMargin: "0px 0px 80px 0px" });
    observer.observe(title);
    return () => observer.disconnect();
  }, []);

  // 블롭 오른쪽의 자리를 잰다: 마침표의 왼쪽 + 블롭(0.70em, 구른 뒤 0.08em 비켜 섬) + 틈. 제목이 커지는
  // 동안(scale)에도 맞도록 배율을 나눈다. 대화창은 제목 높이의 가운데에 맞춰 선다(--dock-x · --dock-y · --dock-w).
  useEffect(() => {
    const talk = talkRef.current;
    const title = titleRef.current;
    if (!talk || !title) return;
    const measure = () => {
      const dot = title.querySelector(".talk-dot");
      if (!dot || !title.offsetWidth) return;
      const box = title.getBoundingClientRect();
      const scale = box.width / title.offsetWidth || 1;
      const size = parseFloat(getComputedStyle(title).fontSize);
      const x = (dot.getBoundingClientRect().left - box.left) / scale + 0.78 * size + Math.max(20, 0.3 * size);
      const free = talk.clientWidth - x;
      talk.style.setProperty("--dock-x", `${Math.round(x)}px`);
      talk.style.setProperty("--dock-y", `${Math.round(title.offsetTop + title.offsetHeight / 2)}px`);
      talk.style.setProperty("--dock-w", `${Math.round(Math.min(640, free))}px`);
      setRoom(free >= 600 ? "wide" : free >= 440 ? "narrow" : "none");
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(talk);
    document.fonts?.ready.then(measure);
    title.addEventListener("transitionend", measure);
    return () => { resize.disconnect(); title.removeEventListener("transitionend", measure); };
  }, []);

  // 제목이 다 보이면 잠깐 뒤 저절로 깨어나 대화창을 띄우고 글로 인사한다. 대화를 시작하기 전에 푸터를
  // 떠나면 창은 가라앉는다. 관찰은 한 번 붙이고, 그때그때의 상태는 ref 로 읽는다.
  const arrive = useRef(null);
  const leave = useRef(null);
  arrive.current = () => {
    if (dismissed.current) return;
    setAwake(true);
    setOpen(true);
    engine.current?.greet({ silent: true });
  };
  leave.current = () => {
    if (!engine.current?.voice && !typingRef.current && !turns.some((x) => x.role === "user")) setOpen(false);
  };
  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    let timer = 0;
    const seen = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.intersectionRatio > 0.95) timer = setTimeout(() => arrive.current(), 650);
      else if (!entry.isIntersecting) leave.current();
    }, { threshold: [0, 1] });
    seen.observe(title);
    return () => { clearTimeout(timer); seen.disconnect(); };
  }, []);

  // 먼저 말을 건다(제목 · 모바일 메뉴): 깨어나 대화창을 띄우고, 아직 인사하지 않았으면 목소리로 인사한 뒤
  // 마이크를 청한다. 인사하는 동안 글로 쓰기를 골랐으면 마이크는 청하지 않는다.
  async function begin() {
    dismissed.current = false;
    setAwake(true);
    setOpen(true);
    const e = engine.current;
    if (!e || ended || e.voice || starting) return;
    if (!e.greeted) {
      await e.greet();
      if (typingRef.current) return;
    }
    if (!(await startVoice())) toTyping({ stopMic: false });
  }
  const toTyping = ({ stopMic = true } = {}) => {
    setAwake(true);
    setOpen(true);
    typingRef.current = true;
    setTyping(true);
    if (stopMic) engine.current?.stopVoice();
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  };
  // 마이크: 켜져 있으면 끄고, 아니면 말로 돌아가 마이크를 청한다(쓸 수 없으면 글로).
  const micPress = () => {
    typingRef.current = false;
    setTyping(false);
    if (engine.current?.voice) engine.current.stopVoice(); else begin();
  };
  // 닫기: 말을 멈추고 마이크를 끄고 창을 내린다. 블롭은 깨어 있는 채로 남는다.
  const close = () => {
    dismissed.current = true;
    setOpen(false);
    typingRef.current = false;
    setTyping(false);
    engine.current?.interrupt();
    engine.current?.stopVoice();
    titleRef.current?.focus({ preventScroll: true });
  };

  // 모바일 메뉴의 "Let's talk" 이 부르면(메뉴가 이 자리로 스크롤한다) 말을 건다 — 누른 손길이 있어 소리와
  // 마이크를 쓸 수 있다. 사람이 직접 누른 것이면 사람의 손길로도 센다(스크롤 없이 메뉴로 바로 온 사람).
  useEffect(() => {
    const onOpen = (event) => {
      if (event.detail?.trusted) noteMenuTap();
      begin();
    };
    window.addEventListener("ccid-open-contact", onOpen);
    return () => window.removeEventListener("ccid-open-contact", onOpen);
  });

  // 마침표가 소리 크기를 따라간다(블롭이 없을 때의 모습). 듣거나 말하는 동안에만 프레임마다 읽어
  // 점에만 값을 준다(위쪽 요소에 변수를 두면 아래 전체의 스타일이 매 프레임 다시 계산된다).
  // 마이크 값은 띄엄띄엄(약 0.1초마다) 오므로 화면에서 한 번 더 고른다 — 빨리 커지고 천천히 잦아든다.
  useEffect(() => {
    const dots = () => document.querySelectorAll(".talk-dot, .talk-float");
    levelRef.current = 0;
    if (phase !== "hearing" && phase !== "speaking") { dots().forEach((d) => d.style.setProperty("--level", "0")); return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame;
    let shown = 0;
    const tick = () => {
      const target = engine.current?.readLevel() || 0;
      shown += (target - shown) * (target > shown ? 0.45 : 0.12);
      levelRef.current = shown;
      const level = shown.toFixed(3);
      dots().forEach((d) => d.style.setProperty("--level", level));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // 블롭이 반응할 사건: 팀에 보냈다(미리보기가 보냄으로 바뀜), 안 된다(마이크를 쓸 수 없음).
  const sentIds = useRef(new Set());
  useEffect(() => {
    turns.forEach((x) => {
      if (x.role === "draft" && x.status === "sent" && !sentIds.current.has(x.id)) { sentIds.current.add(x.id); cueRef.current?.("sent"); }
    });
  }, [turns]);
  useEffect(() => {
    if (notice && notice !== "quiet") cueRef.current?.("error");
  }, [notice]);

  // 입력 칸의 알림: 보였다가(NOTE_MS) 옅어지며 "질문을 입력하세요"와 엇갈려 바뀐다(.6초). 그 뒤로는 보통 안내 글.
  const [inputNote, setInputNote] = useState(null); // { text, out }
  useEffect(() => {
    if (!TYPE_NOTICES.includes(notice)) return;
    const text = t.notice[notice];
    const show = setTimeout(() => setInputNote({ text, out: false }), 0);
    const fade = setTimeout(() => setInputNote({ text, out: true }), NOTE_MS);
    const done = setTimeout(() => setInputNote(null), NOTE_MS + 650);
    return () => { clearTimeout(show); clearTimeout(fade); clearTimeout(done); };
    // 알림이 새로 올 때만 다시 보인다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  // 대답이 길어 자리를 넘치면 드러나는 끝을 따라 내린다. 방문자가 위로 올려 읽고 있으면 건드리지 않는다.
  // 넘친 위쪽이 있을 때만 위를 옅게 지운다(data-over).
  const pinned = useRef(true);
  const markOver = (now) => now.toggleAttribute("data-over", now.scrollTop > 1);
  useEffect(() => {
    const now = nowRef.current;
    if (!now) return;
    if (pinned.current) now.scrollTop = now.scrollHeight;
    markOver(now);
  }, [turns, notice]);

  const submit = (event) => {
    event.preventDefault();
    const said = text.trim();
    if (!said) return;
    setText("");
    setNotice(null);
    setAwake(true);
    pinned.current = true;
    engine.current?.ask(said);
  };

  async function startVoice() {
    const e = engine.current;
    if (!e) return false;
    if (e.voice) return true;
    setStarting(true);
    setNotice(null);
    const ok = await e.startVoice();
    setStarting(false);
    return ok;
  }

  // "말을 걸면 멈춰요"는 마이크가 켜져 있을 때만 맞는 말이다. 알림(마이크를 쓸 수 없음 등)은 대화 줄에 둔다.
  const status = ended ? t.ended : voice ? t.phase[phase] || "" : phase === "thinking" ? t.phase.thinking : "";
  const pending = turns.find((x) => x.role === "draft" && x.status === "pending");
  // 지금 주고받는 말: 방문자의 마지막 한마디와 그 뒤에 온 것(대답 · 미리보기 · 알림). 그 앞은 보이지 않는다.
  const lastUser = turns.map((x) => x.role).lastIndexOf("user");
  const said = lastUser >= 0 ? turns[lastUser] : null;
  const answer = lastUser >= 0 ? turns.slice(lastUser + 1) : turns.slice(-1);
  const invite = !voice && !typing && !said && !ended;
  // 자막에 보일 말: 대화 줄의 알림(오래 조용해 마이크를 껐다 등)이 있으면 그것, 아니면 지금 대답.
  const reply = [...answer].reverse().find((x) => x.role === "assistant");
  const extra = notice && !TYPE_NOTICES.includes(notice) ? notice : null;
  const caption = extra
    ? { key: `notice:${extra}`, text: t.notice[extra], shown: Infinity, notice: true }
    : reply && { key: reply.id, text: reply.text, shown: reply.shown, synced: reply.synced, cut: reply.interrupted, notice: reply.notice };
  const spoken = [...turns].reverse().find((x) => x.role === "assistant");
  const heard = spoken ? spoken.text.slice(0, spoken.shown) : ""; // 끊긴 대답은 들린 데까지만

  return (
    <div className="talk" ref={talkRef}>
      <button type="button" className="footer-talk talk-title" ref={titleRef} data-awake={(awake && !ended) || undefined} aria-label="Let’s talk" onClick={() => (typing ? (setOpen(true), inputRef.current?.focus({ preventScroll: true })) : begin())} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
        <span className="talk-word" aria-hidden="true">{[...TITLE].map((ch, i) => <span key={i} style={{ "--i": i }}>{ch}</span>)}</span>
        <span className="talk-dot" data-phase={phase} aria-hidden="true">
          {awake && <AgentForm phase={phase} levelRef={levelRef} active={inView} cueRef={cueRef} hover={hover} pending={!!pending && !ended} ended={ended} />}
        </span>
      </button>

      {/* 대화창 — 블롭 오른쪽(dot)이나 화면 아래 가운데(float)에 뜨는 캡슐. 테두리의 빛(talk-halo)이
          듣고 · 생각하고 · 말하는 것을 보인다. */}
      <section className="talk-float" data-dock={room !== "none" && inView ? "dot" : "float"} data-room={room} data-open={open || undefined} data-phase={phase} data-voice={voice || undefined} inert={!open} aria-label={t.region} onKeyDown={(e) => { if (e.key === "Escape") { if (phase === "speaking") engine.current?.interrupt(); else close(); } }}>
        <i className="talk-halo" aria-hidden="true" />
        <div className={`talk-capsule${answer.some((x) => x.role === "draft") ? " is-tall" : ""}`}>
          <div className="talk-now" ref={nowRef} onScroll={(e) => { const n = e.currentTarget; pinned.current = n.scrollHeight - n.scrollTop - n.clientHeight < 24; markOver(n); }}>
            {answer.filter((x) => x.role === "draft").map((turn) => <Preview key={turn.id} draft={turn.draft} status={turn.status} t={t} />)}
            <Caption source={caption} />
          </div>

          {typing ? (
            <form className="talk-input" onSubmit={submit}>
              {inputNote && !text && (
                <span className={`talk-input-note${inputNote.out ? " is-out" : ""}`} aria-hidden="true">
                  <span>{inputNote.text}</span>
                  <span>{t.placeholder}</span>
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={text}
                placeholder={ended ? t.ended : inputNote ? "" : t.placeholder}
                aria-label={t.placeholder}
                disabled={ended}
                enterKeyHint="send"
                autoComplete="off"
                onChange={(e) => { if (e.target.value.length > text.length) cueRef.current?.("key"); setText(e.target.value); }}
              />
            </form>
          ) : (
            said && <p key={said.id} className="talk-you">{said.text}</p>
          )}

          <div className="talk-tools">
            {/* 보낼지 묻는 동안의 짧은 답. 누르면 "네"라고 말한 것과 같다. */}
            {pending && !ended && phase !== "thinking" && (
              <button type="button" className="talk-yes" aria-label={isKorean(pending.draft.message) ? COPY.ko.yesLabel : COPY.en.yesLabel} onClick={() => engine.current?.confirm()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                {isKorean(pending.draft.message) ? COPY.ko.yes : COPY.en.yes}
              </button>
            )}
            <button type="button" className="talk-icon" aria-pressed={muted} aria-label={muted ? t.unmute : t.mute} title={muted ? t.unmute : t.mute} onClick={() => engine.current?.setMuted(!muted)}>
              <SpeakerIcon off={muted} />
            </button>
            {!typing && (
              <button type="button" className="talk-icon" aria-label={t.typeInstead} title={t.typeInstead} disabled={ended} onClick={() => toTyping()}>
                <KeyboardIcon />
              </button>
            )}
            {/* 마이크 — 바로 아래 작은 글: 말을 걸기 전에는 안내("누르고 말해보세요"), 그 뒤에는 지금 하는 일(듣는 중 · 생각하는 중). */}
            <span className="talk-mic-wrap">
              <button type="button" className={`talk-mic${invite ? " is-invite" : ""}`} aria-pressed={voice} aria-label={voice ? t.micOff : t.talk} title={voice ? t.micOff : t.talk} disabled={starting || ended} onClick={micPress}>
                <MicIcon />
              </button>
              <span className="talk-mic-hint" role="status">{invite ? t.hint : status}</span>
            </span>
            <button type="button" className="talk-icon talk-close" aria-label={t.close} title={t.close} onClick={close}>
              <CloseIcon />
            </button>
          </div>

        </div>
        {/* 테두리를 따라 도는 크롬 금빛 반사 — 번짐(바깥 요소의 blur)과 날카로운 선(::after)이 함께 돈다. */}
        <i className="talk-glint" aria-hidden="true"><i /></i>
      </section>

      {/* 화면 낭독기에는 대답을 다 만든 뒤 한 번에 읽힌다(글자가 드러나는 동안 계속 읽히지 않게). */}
      <p className="sr-only" aria-live="polite">{phase === "idle" || phase === "listening" ? heard : ""}</p>
    </div>
  );
}
