// 방문자가 사람인지 조용히 살핀다 — Let's talk 에이전트를 AI·자동화 방문자에게는 열지 않으려고.
// 판정은 humanScore.js. 여기는 브라우저의 입력을 숫자로 요약하는 일만 한다.
//
// · isTrusted 인 이벤트만 센다(스크립트가 만들어 보낸 이벤트는 제외).
// · 좌표·입력한 글자는 저장하지 않고, 개수와 길이·간격의 통계만 남긴다.
// · 사이트를 보는 데에는 아무 영향이 없다. 모두 passive 리스너이고, 판정은 대화를 시작할 때만 쓴다.
// 대화를 시작할 때 이 요약을 서버에 보내 30분짜리 통행증을 받고, 대화 요청마다 그 통행증을 붙인다.

import { scoreHuman } from "./humanScore";

const MAX = 240; // 통계에 쓰는 최근 표본 수

const s = {
  start: 0,
  moves: 0, path: 0, turns: 0, jumps: 0, speeds: [], last: null, lastAngle: null,
  wheels: 0, wheelValues: new Set(), wheelGaps: [], lastWheel: 0,
  touchSeqs: 0, touchMoves: 0, taps: 0, tapGaps: [], lastTap: 0,
  keys: 0, keyGaps: [], lastKey: 0,
  views: new Set(), pages: new Set(),
  menu: 0,
};

const std = (a) => {
  if (a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
};
const push = (a, v) => { a.push(v); if (a.length > MAX) a.shift(); };
// 서로 ±6ms 안에 모이는 간격이 가장 많은 무리의 비율. 자동화는 같은 간격으로 친다(한두 번 길게 멈춰도
// 나머지가 한 무리로 모인다), 사람은 간격이 흩어진다.
const uniform = (a) => {
  if (a.length < 3) return 0;
  let most = 0;
  for (const g of a) most = Math.max(most, a.filter((v) => Math.abs(v - g) <= 6).length);
  return +(most / a.length).toFixed(2);
};

function onPointerMove(e) {
  if (!e.isTrusted || e.pointerType === "touch") return;
  const p = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  const last = s.last;
  s.last = p;
  if (!last) return;
  const dt = p.t - last.t;
  const dx = p.x - last.x;
  const dy = p.y - last.y;
  const d = Math.hypot(dx, dy);
  if (dt <= 0 || d === 0) return;
  s.moves++;
  s.path += d;
  if (d > 200) s.jumps++; // 한 번에 200px 넘게 옮겨졌다 — 사람의 손은 그 사이를 지나간다
  push(s.speeds, d / dt);
  if (d > 2) {
    const angle = Math.atan2(dy, dx);
    if (s.lastAngle !== null) {
      let turn = Math.abs(angle - s.lastAngle);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      if (turn > 0.35) s.turns++; // 20도 넘게 꺾였다
    }
    s.lastAngle = angle;
  }
}

function onWheel(e) {
  if (!e.isTrusted) return;
  s.wheels++;
  if (s.wheelValues.size < 50) s.wheelValues.add(Math.round(Math.abs(e.deltaY) * 10));
  if (s.lastWheel && e.timeStamp - s.lastWheel < 1500) push(s.wheelGaps, e.timeStamp - s.lastWheel);
  s.lastWheel = e.timeStamp;
}

let touchRun = 0;
function onTouchStart(e) {
  if (!e.isTrusted) return;
  touchRun = 0;
  s.taps++;
  if (s.lastTap && e.timeStamp - s.lastTap < 8000) push(s.tapGaps, e.timeStamp - s.lastTap);
  s.lastTap = e.timeStamp;
}
function onTouchMove(e) {
  if (!e.isTrusted) return;
  touchRun++;
  s.touchMoves++;
  if (touchRun === 5) s.touchSeqs++; // 한 번의 스크롤에 touchmove 가 다섯 번 넘게 왔다
}

function onKeyDown(e) {
  if (!e.isTrusted || e.repeat) return;
  s.keys++;
  if (s.lastKey && e.timeStamp - s.lastKey < 2000) push(s.keyGaps, e.timeStamp - s.lastKey);
  s.lastKey = e.timeStamp;
}

// 둘러보기: 화면에 1초 넘게 머문 섹션 수와 옮겨 다닌 페이지 수.
let viewObserver = null;
const viewTimers = new Map();
function observeSections() {
  viewObserver?.disconnect();
  viewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const key = `${location.pathname}#${entry.target.id || entry.target.className}`;
      if (entry.isIntersecting) viewTimers.set(key, setTimeout(() => s.views.add(key), 1000));
      else clearTimeout(viewTimers.get(key));
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("main section, main article").forEach((el) => viewObserver.observe(el));
}

let watching = false;
export function watchHuman() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  s.start = performance.now();
  const opts = { passive: true, capture: true };
  window.addEventListener("pointermove", onPointerMove, opts);
  window.addEventListener("wheel", onWheel, opts);
  window.addEventListener("touchstart", onTouchStart, opts);
  window.addEventListener("touchmove", onTouchMove, opts);
  window.addEventListener("keydown", onKeyDown, opts);
  observeSections();
  // 개발 중에만: 콘솔에서 __talkHuman() 으로 지금의 요약과 판정을 본다.
  if (process.env.NODE_ENV !== "production") window.__talkHuman = () => ({ summary: humanSummary(), verdict: scoreHuman(humanSummary(), navigator.userAgent) });
}

// 메뉴의 "Let's talk" 을 사람이 직접 눌렀다(SiteShell 이 누른 이벤트의 isTrusted 를 넘긴다).
export function noteMenuTap() {
  s.menu++;
}

// 페이지를 옮겼을 때(레이아웃은 그대로라 watchHuman 은 다시 불리지 않는다) 부른다.
export function notePage(pathname) {
  s.pages.add(pathname);
  if (watching) setTimeout(observeSections, 300);
}

export function humanSummary() {
  const speeds = s.speeds;
  const mean = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  return {
    elapsed: Math.round(performance.now() - s.start),
    webdriver: navigator.webdriver === true,
    mouse: { moves: s.moves, path: Math.round(s.path), turns: s.turns, cv: mean ? +(std(speeds) / mean).toFixed(3) : 0, jumps: s.jumps },
    wheel: { n: s.wheels, distinct: s.wheelValues.size, gapStd: Math.round(std(s.wheelGaps)) },
    touch: { seqs: s.touchSeqs, taps: s.taps, tapGapStd: Math.round(std(s.tapGaps)) },
    keys: { n: s.keys, gapStd: Math.round(std(s.keyGaps)), uniform: uniform(s.keyGaps) },
    views: s.views.size,
    pages: s.pages.size,
    menu: s.menu,
  };
}

export function looksHuman() {
  return scoreHuman(humanSummary(), navigator.userAgent).human;
}

// 대화 요청에 붙일 통행증. 사람으로 보이지 않으면 null — 서버에 묻지도 않는다.
let pass = null;
export async function talkPass() {
  if (pass && pass.exp - Date.now() > 60_000) return pass.token;
  const summary = humanSummary();
  if (!scoreHuman(summary, navigator.userAgent).human) return null;
  try {
    const res = await fetch("/api/talk/pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(summary) });
    if (!res.ok) return null;
    pass = await res.json();
    return pass.token;
  } catch {
    return null;
  }
}
