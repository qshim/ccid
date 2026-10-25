"use client";

// 푸터의 "Let's talk." — 섹션이 화면에 들어오면 글자가 커지고, 그 아래에 cciD 에 대해 물어보라는
// 짧은 안내와 시작하는 자리(글로 묻기 · 말로 하기)가 나온다. 대화 자체는 페이지 안이 아니라 페이지
// 위에 뜨는 패널에서 한다: 오른쪽 아래(모바일은 아래쪽 시트)에 떠서, 둘러보던 화면을 밀어내지 않고
// 덮지도 막지도 않는다(배경을 어둡게 하지 않고, 뒤의 페이지는 그대로 스크롤·클릭된다). 접으면 점 하나로
// 줄고, 다른 페이지로 가도 대화가 이어진다(푸터는 레이아웃에 있다). 헤더·모바일 메뉴의 "Let's talk" 은
// 패널을 바로 연다.
//
// 팀에 보낼 일이 생기면 시리가 메시지를 보낼 때처럼 대화로 끝낸다: 에이전트가 이름·이메일을 물어
// 모으고, 고칠 수 없는 미리보기를 보이며 "보낼까요?" 하고 묻는다. "네"라고 답하거나 "✓ 네"를 누르면 보낸다.
//
// "Let's talk." 의 마침표가 에이전트다. 듣는 동안엔 방문자의 목소리 크기를, 말하는 동안엔 자기
// 목소리 크기를 따라 커졌다 작아지고, 생각하는 동안엔 깜빡인다. 패널과 접힌 점도 같은 점이다.
// 소리와 대화 흐름은 engine.js 가 맡는다. 대답에 나오는 페이지 이름은 링크가 된다.
//
// AI·자동화 방문자에게는 대화를 열지 않는다(human.js): 둘러보는 동안 커서·스크롤·타자·탭의 결을 조용히
// 보고, 대화를 시작할 때 사람으로 보여야 서버가 통행증을 준다. 아니면 메일 주소를 안내하는 한 줄만 보인다
// — 사람에게는 보이지 않는 문턱이고, AI 에이전트에게도 쓸모 있는 길(메일)은 남긴다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TalkEngine } from "./engine";
import { notePage, talkPass, watchHuman } from "./human";
import "./talk.css";

const COPY = {
  ko: {
    greet: "cciD에 대해 무엇이든 물어보세요. 말로 해도 되고, 글로 써도 돼요.",
    greetMore: "함께 해보고 싶은 일이 있으면 팀에 전해 드릴게요.",
    placeholder: "질문을 입력하세요",
    ask: "질문 보내기",
    talk: "말로 하기",
    micOff: "마이크 끄기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
    phase: { listening: "듣고 있어요", hearing: "듣고 있어요", thinking: "생각하는 중", speaking: "말을 걸면 멈춰요" },
    notice: {
      micBlocked: "마이크를 쓸 수 없어요. 주소창에서 마이크를 허용하거나 글로 물어봐 주세요.",
      noVoice: "이 브라우저에서는 말로 할 수 없어요. 글로 물어봐 주세요.",
      voiceFailed: "음성 인식을 불러오지 못했어요. 글로 물어봐 주세요.",
      quiet: "한동안 조용해서 마이크를 껐어요.",
    },
    to: "cciD 팀에게",
    sentTo: "cciD 팀에 보냈어요",
    mailApp: "메일 앱에서 보내기",
    disclosure: "대답은 AI가 OpenAI와 ElevenLabs로 만들어요. 이 사이트는 대화를 저장하지 않아요.",
    subject: "cciD 문의",
    yes: "네",
    yesLabel: "네, 보내 주세요",
    ended: "대화를 마쳤어요",
    sheet: "cciD와 대화",
    minimize: "대화 접기",
    reopen: "대화 열기",
  },
  en: {
    greet: "Ask me anything about cciD. You can talk or type.",
    greetMore: "If there’s something you’d like to do together, I’ll pass it on to the team.",
    placeholder: "Type a question",
    ask: "Ask",
    talk: "Talk",
    micOff: "Mic off",
    mute: "Mute",
    unmute: "Unmute",
    phase: { listening: "Listening", hearing: "Listening", thinking: "Thinking", speaking: "Talk to cut in" },
    notice: {
      micBlocked: "The mic is blocked. Allow it in the address bar, or type your question.",
      noVoice: "Talking isn’t available in this browser. Type your question instead.",
      voiceFailed: "Voice couldn’t load. Type your question instead.",
      quiet: "It went quiet, so I turned the mic off.",
    },
    to: "To the cciD team",
    sentTo: "Sent to the cciD team",
    mailApp: "Send from my mail app",
    disclosure: "Answers come from AI, built with OpenAI and ElevenLabs. This site doesn’t keep the conversation.",
    subject: "cciD enquiry",
    yes: "Yes",
    yesLabel: "Yes, send it",
    ended: "This conversation has ended",
    sheet: "Conversation with cciD",
    minimize: "Minimize conversation",
    reopen: "Open conversation",
  },
};

const TO = "hello.ccid@gmail.com";
const isKorean = (s) => /[가-힣]/.test(s);

function MicIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 12h17m-7-7 7 7-7 7" /></svg>;
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
function linkify(text) {
  const parts = text.split(/\b((?:Projects|People|Research|About)(?: 페이지| page))/g);
  return parts.map((part, i) => (i % 2 ? <Link key={i} href={PAGES[part.split(" ")[0]]}>{part}</Link> : part));
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
  const logRef = useRef(null);
  const hostRef = useRef(null);
  const titleRef = useRef(null);
  const floatRef = useRef(null);
  const [layer, setLayer] = useState(null); // 패널을 올릴 곳(.ccid-site)
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [voice, setVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState(null);
  const [text, setText] = useState("");
  const [starting, setStarting] = useState(false);
  const [ended, setEnded] = useState(false);
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
    // 패널은 사이트의 맨 바깥(.ccid-site)에 올린다 — 푸터 안에 두면 페이지의 일부가 되고, 조상의
    // transform 이 고정 위치를 깨뜨릴 수 있다. 토큰과 글꼴은 .ccid-site 에 있어 그대로 이어진다.
    setLayer(hostRef.current?.closest(".ccid-site") || document.body);
    return () => { document.removeEventListener("visibilitychange", onHidden); e.destroy(); engine.current = null; };
    // 엔진은 한 번만 만든다 — 언어는 아래에서 따로 넘긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { engine.current?.setLang(lang); }, [lang]);
  useEffect(() => { notePage(pathname); }, [pathname]);

  // 화면에 들어오면 "Let's talk" 이 자라고 시작하는 자리가 따라 나온다. 이 컴포넌트가 다시 그려져도
  // (언어 전환·핫 리로드) 스스로 다시 붙인다.
  useEffect(() => {
    const title = titleRef.current;
    if (!title || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { title.classList.add("is-revealed"); observer.disconnect(); }
    }, { rootMargin: "0px 0px 80px 0px" });
    observer.observe(title);
    return () => observer.disconnect();
  }, []);

  const openSheet = ({ talk = false } = {}) => {
    setOpen(true);
    if (talk) startVoice();
    else setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  };

  // 헤더·모바일 메뉴의 "Let's talk" 이 부르면 패널을 바로 연다.
  useEffect(() => {
    const onOpen = () => openSheet();
    window.addEventListener("ccid-open-contact", onOpen);
    return () => window.removeEventListener("ccid-open-contact", onOpen);
  });

  // 점(.)이 소리 크기를 따라간다. 듣거나 말하는 동안에만 프레임마다 읽어 점들에만 값을 준다
  // (위쪽 요소에 변수를 두면 아래 전체의 스타일이 매 프레임 다시 계산된다).
  useEffect(() => {
    const dots = () => document.querySelectorAll(".talk-dot");
    if (phase !== "hearing" && phase !== "speaking") { dots().forEach((d) => d.style.setProperty("--level", "0")); return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame;
    const tick = () => {
      const level = (engine.current?.readLevel() || 0).toFixed(3);
      dots().forEach((d) => d.style.setProperty("--level", level));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // 새 말이 오면 대화를 아래로 붙인다. 방문자가 위로 올려 읽고 있으면 건드리지 않는다.
  const pinned = useRef(true);
  useEffect(() => {
    const log = logRef.current;
    if (log && pinned.current) log.scrollTop = log.scrollHeight;
  }, [turns, open]);

  const submit = (event) => {
    event.preventDefault();
    const said = text.trim();
    if (!said) return;
    setText("");
    setNotice(null);
    engine.current?.ask(said);
  };

  async function startVoice() {
    const e = engine.current;
    if (!e || e.voice) return;
    setStarting(true);
    setNotice(null);
    await e.startVoice();
    setStarting(false);
  }

  const minimize = () => {
    setOpen(false);
    setTimeout(() => floatRef.current?.focus({ preventScroll: true }), 30);
  };

  // "말을 걸면 멈춰요"는 마이크가 켜져 있을 때만 맞는 말이다.
  const status = ended ? t.ended : notice ? t.notice[notice] : voice ? t.phase[phase] || "" : phase === "thinking" ? t.phase.thinking : "";
  const pending = turns.find((x) => x.role === "draft" && x.status === "pending");
  const started = turns.length > 0 || voice;

  const sheet = (
    <>
      <section
        className="talk-sheet"
        data-open={open}
        aria-label={t.sheet}
        aria-hidden={!open}
        inert={!open || undefined}
        onKeyDown={(e) => { if (e.key === "Escape") { if (phase === "speaking") engine.current?.interrupt(); else minimize(); } }}
      >
        <header className="talk-sheet-head">
          <span className="talk-dot" data-phase={phase} aria-hidden="true" />
          <p><strong>cciD</strong><span className="talk-status" role="status">{status}</span></p>
          <button type="button" className="talk-icon" aria-pressed={muted} aria-label={muted ? t.unmute : t.mute} title={muted ? t.unmute : t.mute} onClick={() => engine.current?.setMuted(!muted)}>
            <SpeakerIcon off={muted} />
          </button>
          <button type="button" className="talk-icon" aria-label={t.minimize} title={t.minimize} onClick={minimize}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9.5 6 6 6-6" /></svg>
          </button>
        </header>

        <div className="talk-log" ref={logRef} onScroll={(e) => { const l = e.currentTarget; pinned.current = l.scrollHeight - l.scrollTop - l.clientHeight < 60; }}>
          <p className="talk-line is-assistant is-greeting">{t.greet}<span>{t.greetMore}</span></p>
          {turns.map((turn) => turn.role === "draft" ? (
            <Preview key={turn.id} draft={turn.draft} status={turn.status} t={t} />
          ) : (
            <p key={turn.id} className={`talk-line is-${turn.role}${turn.interrupted ? " is-cut" : ""}${turn.notice ? " is-notice" : ""}`}>
              {turn.role === "assistant" ? linkify(turn.text.slice(0, turn.shown)) : turn.text}
            </p>
          ))}
          {/* 보낼지 묻는 동안의 짧은 답 — 방문자 쪽(오른쪽)에 놓인다. 누르면 "네"라고 말한 것과 같다. */}
          {pending && !ended && phase !== "thinking" && (
            <button type="button" className="talk-yes" aria-label={isKorean(pending.draft.message) ? COPY.ko.yesLabel : COPY.en.yesLabel} onClick={() => engine.current?.confirm()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              {isKorean(pending.draft.message) ? COPY.ko.yes : COPY.en.yes}
            </button>
          )}
        </div>
        {/* 화면 낭독기에는 대답을 다 만든 뒤 한 번에 읽힌다(글자가 드러나는 동안 계속 읽히지 않게). */}
        <p className="sr-only" aria-live="polite">{phase === "idle" || phase === "listening" ? [...turns].reverse().find((x) => x.role === "assistant")?.text || "" : ""}</p>

        <form className="talk-input" onSubmit={submit}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            placeholder={ended ? t.ended : t.placeholder}
            aria-label={t.placeholder}
            disabled={ended}
            enterKeyHint="send"
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="talk-ask" aria-label={t.ask} disabled={!text.trim()}><ArrowIcon /></button>
          <button type="button" className="talk-mic" aria-pressed={voice} disabled={starting || ended} onClick={() => (voice ? engine.current?.stopVoice() : startVoice())}>
            <MicIcon />
            <span>{voice ? t.micOff : t.talk}</span>
          </button>
        </form>
        <p className="talk-note">{t.disclosure}</p>
      </section>

      {/* 접혀 있는 동안의 점. 대화가 시작된 뒤에만 있다 — 처음 온 사람에게는 아무것도 떠 있지 않다. */}
      {!open && started && (
        <button type="button" ref={floatRef} className="talk-float" onClick={() => openSheet()} aria-label={t.reopen} title={t.reopen}>
          <span className="talk-dot" data-phase={phase} aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <div className="talk" ref={hostRef}>
      <button type="button" className="footer-talk talk-title" ref={titleRef} onClick={() => openSheet()}>
        Let’s talk<span className="talk-dot" data-phase={phase} aria-hidden="true" />
      </button>

      <div className="talk-panel">
        <p className="talk-entry-greet">{t.greet}<span>{t.greetMore}</span></p>
        <div className="talk-start">
          <button type="button" className="talk-prompt" onClick={() => openSheet()}>
            <span>{t.placeholder}</span>
            <ArrowIcon />
          </button>
          <button type="button" className="talk-mic" aria-pressed={voice} disabled={starting || ended} onClick={() => openSheet({ talk: !voice })}>
            <MicIcon />
            <span>{t.talk}</span>
          </button>
        </div>
      </div>

      {layer && createPortal(sheet, layer)}
    </div>
  );
}
