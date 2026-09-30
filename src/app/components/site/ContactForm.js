"use client";

// 푸터의 문의 폼. 헤더와 모바일 메뉴의 "Let's talk" 이 이 폼을 열고 여기로 스크롤한다.
// 평소엔 접혀 있고, 버튼에 마우스가 닿거나 포커스가 오면 열린다.
//
// 전송은 사용자의 메일 앱을 여는 방식이다(mailto). 공개 페이지에서 서버로 직접
// 보내려면 발송 계정의 자격 증명과 스팸 방어가 필요한데, 이 사이트에는 공개
// 트래픽용 발송 경로가 없다. 이 방식은 입력값이 브라우저 밖으로 나가지 않고,
// 보낸 메일이 사용자 자신의 보낸편지함에도 남는다.

import { useEffect, useRef, useState } from "react";

const TO = "hello.ccid@gmail.com";
const CUSTOM = "__custom__";
const DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "nate.com",
  "hanmail.net",
  "outlook.com",
];
const TOPICS = [
  { value: "연구·협력 제안", en: "Research & collaboration" },
  { value: "자문", en: "Advisory" },
  { value: "채용·인턴십", en: "Careers & internships" },
  { value: "기타 문의", en: "Other" },
];

export default function ContactForm({ lang }) {
  const ko = lang === "ko";
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState(DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [topic, setTopic] = useState(TOPICS[0].value);
  const [message, setMessage] = useState("");

  const hostRef = useRef(null);
  const nameRef = useRef(null);
  const jumped = useRef(false); // 헤더에서 부른 경우에만 스크롤·포커스

  useEffect(() => {
    const onOpen = () => {
      jumped.current = true;
      setOpen(true);
    };
    window.addEventListener("ccid-open-contact", onOpen);
    return () => window.removeEventListener("ccid-open-contact", onOpen);
  }, []);

  // 호버로 열렸을 때 화면이 따라 움직이면 손도 대지 않았는데 페이지가 튄다.
  useEffect(() => {
    if (!open || !jumped.current) return;
    jumped.current = false;
    hostRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 420);
    return () => clearTimeout(t);
  }, [open]);

  const clear = () => setError("");

  const submit = (event) => {
    event.preventDefault();
    const domain = emailDomain === CUSTOM ? customDomain.trim() : emailDomain;
    const from = emailLocal.trim() && domain ? `${emailLocal.trim()}@${domain}` : "";

    if (!name.trim() || !from || !message.trim()) {
      setError(ko ? "이름, 이메일, 문의사항을 모두 채워 주세요." : "Please fill in every field.");
      return;
    }
    setError("");
    const who = name.trim();
    const subject = ko ? `cciD 문의 · ${topic} — ${who}` : `cciD enquiry · ${topic} — ${who}`;
    const body = [
      `${ko ? "문의 유형" : "Type"}: ${topic}`,
      "",
      message.trim(),
      "",
      "—",
      who,
      from,
    ].join("\n");
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="contact-form-host" ref={hostRef}>
      <button
        type="button"
        className="footer-talk"
        data-reveal
        aria-expanded={open}
        aria-controls="contact-form"
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
      >
        Let’s talk.
        <span aria-hidden="true" className={`contact-caret${open ? " is-open" : ""}`}>↓</span>
      </button>

      <form id="contact-form" className="contact-form" hidden={!open} onSubmit={submit} noValidate>
        <label>
          <span>{ko ? "이름" : "Name"}</span>
          <input
            ref={nameRef}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              clear();
              setName(e.target.value);
            }}
          />
        </label>

        <label>
          <span>{ko ? "이메일" : "Email"}</span>
          {/* @ 앞뒤를 따로 받는다 — 도메인은 목록에서 고르고, 없으면 직접 입력. */}
          <span className="contact-email-row">
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              value={emailLocal}
              onChange={(e) => {
                clear();
                setEmailLocal(e.target.value.replace(/@.*$/, ""));
              }}
            />
            <i aria-hidden="true">@</i>
            {emailDomain === CUSTOM && (
              <input
                type="text"
                className="contact-email-custom"
                placeholder={ko ? "도메인" : "domain"}
                value={customDomain}
                autoFocus
                onChange={(e) => {
                  clear();
                  setCustomDomain(e.target.value.trim());
                }}
              />
            )}
            <select
              aria-label={ko ? "이메일 도메인" : "Email domain"}
              value={emailDomain}
              onChange={(e) => {
                clear();
                setEmailDomain(e.target.value);
              }}
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={CUSTOM}>{ko ? "직접 입력" : "Other"}</option>
            </select>
          </span>
        </label>

        <label>
          <span>{ko ? "문의 유형" : "Type of enquiry"}</span>
          <select
            value={topic}
            onChange={(e) => {
              clear();
              setTopic(e.target.value);
            }}
          >
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {ko ? t.value : t.en}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{ko ? "문의사항" : "Your enquiry"}</span>
          <textarea
            rows={1}
            value={message}
            onChange={(e) => {
              clear();
              setMessage(e.target.value);
              // 내용만큼 칸이 자란다 — 스크롤바 대신 아래로 밀린다.
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </label>

        {error && (
          <p className="contact-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="contact-form-actions">
          <button type="submit">{ko ? "메일 보내기" : "Send email"}</button>
          <span className="micro">
            {ko ? `사용하시는 메일 앱이 열리고 ${TO} 로 전송됩니다.` : `Opens your mail app, addressed to ${TO}.`}
          </span>
        </div>
      </form>
    </div>
  );
}
