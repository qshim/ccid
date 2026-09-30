"use client";

// 본문을 줄 단위로 하나씩 올라오며 나타나게 한다 (위치 + 투명도).
//
//
// 진입 감지는 SiteShell 의 [data-reveal] 옵저버를 그대로 쓴다. 그쪽이
// prefers-reduced-motion 이면 아예 관찰하지 않으므로, 그때는 CSS 기본값대로
// 처음부터 보인 상태로 남는다.

// 원문이 가진 "\n" 만 줄로 본다. 문장 단위로 임의로 쪼개면 원래 한 문단으로
// 흐르던 글이 강제로 끊겨 줄바꿈이 어색해진다 — 줄바꿈은 글쓴이가 정한다.
const splitLines = (text) => String(text ?? "").split("\n");

export default function RevealLines({ text, children, as: Tag = "span", stagger = 90, className }) {
  const lines = text != null ? splitLines(text) : null;

  // children 을 줄로 쓰는 형태: 배열의 각 항목이 한 줄이다.
  const items = lines ?? (Array.isArray(children) ? children : [children]);

  return (
    <Tag className={className} data-reveal data-reveal-lines="">
      {items.map((line, i) => (
        <span
          key={i}
          className="reveal-line"
          style={{ "--line-delay": `${i * stagger}ms` }}
        >
          {line}
        </span>
      ))}
    </Tag>
  );
}
