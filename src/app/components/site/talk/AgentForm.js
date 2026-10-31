"use client";

// "Let's talk." 의 마침표가 자라서 되는 유리 구슬 블롭(blob.js). 마침표(.talk-dot) 안에 놓여, 마침표의
// 왼쪽 아래를 축으로 그 크기에서 글자 기둥 높이의 블롭으로 자란다(talk.css). 블롭이 그려지기 시작하면
// 마침표는 물러나고, WebGL 을 쓸 수 없으면 캔버스가 빠지고 마침표가 그대로 에이전트로 남는다.
//
// · active 일 때만 그린다(푸터가 화면에 보일 때). WebGL 문맥은 처음 active 가 될 때 만든다
//   — 말을 걸지 않는 방문자에게는 아무 비용이 없다.
// · 처음 나타날 때 한 번만 마침표(검은 원)에서 애플 글로우를 거쳐 블롭으로 피어난다. 공처럼 오른쪽으로
//   굴러 나가며 자라, 보이지 않는 벽에 닿아 두 번 통통 튀며 되돌아오고, 남은 빠르기로 굴러 k 와 조금
//   떨어진 자리에 멈춘다. 구른 만큼 속의 빛도 돈다 — 작을 때는 빨리, 클수록 천천히. 화면 밖에 나갔다
//   돌아올 때는 다시 피어나지 않는다.
// · 등장 뒤에는 대화에 반응한다(아래 CUES). 사건은 한 번의 공 움직임, 생각은 말줄임표, 대화가 끝나면
//   마침표 자리로 굴러가 다시 검은 마침표가 된다.
// · 소리 크기는 levelRef 로 받는다(TalkAgent 가 프레임마다 고른 값).
// · 움직임 줄이기: 상태가 바뀔 때만 한 장씩, 새 모습으로 바로 그린다. 말줄임표와 마침표로 돌아가기는
//   움직이지 않고 그 모습으로만 보인다.

import { useEffect, useRef } from "react";
import { createBlobForm } from "./blob";

// 캔버스 반지름에서 블롭이 차지하는 비율. talk.css 의 자리 잡기(캔버스 1.1673em, 블롭 0.70em)와 맞물린다.
const FIT = 0.6;

// 등장 동작. 거리는 em(제목 글자 크기), 시간은 초. 열 가지를 두 차례 나란히 견줘 고른 것이다 — 멈춘 공이
// 이유 없이 제자리에서 튀면 어색해서, 튀는 것이 되돌아오는 길이 되게 했다. 구간이 바뀌어도 빠르기가 이어진다.
const START_SCALE = 0.1571; // 마침표 크기(0.11em) / 블롭 크기(0.70em)
const RADIUS = 0.35; // 다 자란 블롭의 반지름
const REST = 0.08; // 멈추는 자리 — k 와의 간격이 이만큼 벌어진다
const ENTRANCE = [
  { roll: 0.45, dur: 0.75 }, // 굴러 나가며 자란다. 빠르기가 조금 남은 채 벽에 닿는다
  { hop: 0.11, dx: -0.14, dur: 0.33 }, // 튕겨 돌아온다(두 번, 낮아지며)
  { hop: 0.045, dx: -0.09, dur: 0.21 },
  { roll: REST, dur: 0.9, v0: -0.429 }, // 마지막 착지의 빠르기를 이어 굴러 멈춘다
];
const ENTRANCE_SEC = ENTRANCE.reduce((sum, seg) => sum + seg.dur, 0);
const wall = (p) => (1 - (1 - 0.8 * p) ** 2) / 0.96; // 끝에 빠르기가 조금 남는 감속

// 등장한 지 t 초의 자리(x, y)와 착지의 눌림.
function entranceAt(t) {
  let x = 0;
  let y = 0;
  let at = 0;
  let squash = 0;
  for (const seg of ENTRANCE) {
    const p = Math.min(1, Math.max(0, (t - at) / seg.dur));
    if ("hop" in seg) {
      x += seg.dx * p;
      if (p < 1) y = 4 * seg.hop * p * (1 - p);
      else squash = 0.08 * Math.min(1, seg.hop / 0.12) * Math.exp(-(t - at - seg.dur) * 22);
    } else if ("v0" in seg) {
      const m = (seg.v0 * seg.dur) / (seg.roll - x); // 처음 기울기를 착지 빠르기에 맞춘 3차 곡선
      x += (seg.roll - x) * ((p ** 3 - 2 * p ** 2 + p) * m + 3 * p ** 2 - 2 * p ** 3);
    } else {
      x = seg.roll * wall(p);
    }
    if (t < at + seg.dur) break;
    at += seg.dur;
  }
  return { x, y, squash };
}

// dt 만큼 흘린 등장의 transform 과 굴러간 각도. 자라기는 굴러 나가는 동안 끝난다.
function stepEntrance(m, dt) {
  m.t += dt;
  const { x, y, squash } = entranceAt(m.t);
  const scale = START_SCALE + (1 - START_SCALE) * (1 - (1 - Math.min(m.t / ENTRANCE[0].dur, 1)) ** 3);
  m.roll += (x - m.x) / (RADIUS * scale); // 지금 크기의 공이 구른 각도
  m.x = x;
  return {
    transform: pose(x, y, scale, squash),
    roll: m.roll,
    done: m.t > ENTRANCE_SEC + 0.3,
  };
}

// 자리 · 크기 · 눌림을 transform 으로. 축(talk.css 의 20% 80%)은 블롭의 왼쪽 아래라, 눌림은 아래 가운데를
// 축으로 보이도록 가로로 늘어난 만큼 되돌린다.
function pose(x, y, scale, squash) {
  return `translate(${(x - squash * RADIUS * scale).toFixed(4)}em, ${(-y).toFixed(4)}em) scale(${(scale * (1 + squash)).toFixed(4)}, ${(scale * (1 - squash)).toFixed(4)})`;
}

// 등장 뒤의 반응. 열두 가지를 같은 대화 시나리오(마우스 · 타자 · 보냄 · 생각 · 대답 · 듣기 · 끊기 · 보낼까요 ·
// 보냄 · 오류 · 끝)로 나란히 견줘 고른 것이다. 작은 블롭 속의 미세한 빛 변화(시선 · 둘레 빛 · 잔물결)는 실제
// 크기에서 읽히지 않아서, 읽히는 것만 쓴다 — 사건은 공의 움직임, 생각은 말줄임표, 끝은 마침표로 돌아가기.
const inOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const hop = (h) => (p) => ({ y: 4 * h * p * (1 - p) });
const press = (a) => (p) => ({ squash: a * Math.sin(Math.PI * p) });
const shake = (amp, n) => (p) => ({ x: amp * Math.sin(2 * Math.PI * n * p) * (1 - p) });
const spin = (turn) => (p) => ({ spin: turn * inOut(p) });
const homeward = (p) => { const e = inOut(p); return { x: -REST * e, scale: 1 - (1 - START_SCALE) * e, dim: e }; };
// 사건마다 [움직임, 길이(초), 늦게 시작(초), 끝난 뒤에도 머문다]
const CUES = {
  key: [[hop(0.018), 0.16]], // 타자 — 0.3초에 한 번만 끄덕인다
  send: [[press(0.08), 0.1], [hop(0.07), 0.28, 0.08]], // 말을 받았다(생각이 시작될 때)
  interrupt: [[press(0.1), 0.2]], // 말하다 끊겼다 — 움찔
  sent: [[hop(0.12), 0.36], [spin(Math.PI * 2), 0.5]], // 팀에 보냈다
  error: [[shake(0.03, 2), 0.5], [(p) => ({ dim: 0.25 * Math.sin(Math.PI * p) }), 0.8]], // 안 된다 — 도리도리
  end: [[homeward, 1.2, 0, true]], // 대화가 끝났다 — 마침표 자리로 굴러가 검은 마침표가 된다
};
const ELLIPSIS_AFTER = 0.35; // 생각이 이만큼 이어질 때만 말줄임표(보냄의 통통과 겹치지 않게, 짧으면 깜빡이지 않게)
const ELLIPSIS_SCALE = 0.55; // 말줄임표의 첫 점이 될 때의 크기

// dt 만큼 흘린 반응의 transform 과 굴러간 각도 · 마침표 색 · 말줄임표.
function stepReaction(m, dt, { phase, hover, pending }) {
  m.clock += dt;
  m.thinkFor = phase === "thinking" ? m.thinkFor + dt : 0;
  const k = 1 - Math.exp(-dt * 10);
  m.ellipsis += ((m.thinkFor > ELLIPSIS_AFTER ? 1 : 0) - m.ellipsis) * k;
  m.hover += ((hover ? 1 : 0) - m.hover) * k;
  let x = REST;
  let y = pending && phase !== "hearing" ? Math.max(0, Math.sin(m.clock * 4.2)) ** 2 * 0.022 : 0; // 내 차례 — 톡톡
  let scale = (1 + 0.04 * m.hover) * (1 - (1 - ELLIPSIS_SCALE) * m.ellipsis);
  let squash = 0;
  let turn = 0;
  let dim = 0;
  m.anims = m.anims.filter((a) => {
    const p = (m.clock - a.start) / a.dur;
    if (p < 0) return true;
    const o = a.fn(Math.min(1, p));
    x += o.x || 0;
    y += o.y || 0;
    scale *= o.scale || 1;
    squash += o.squash || 0;
    turn += o.spin || 0;
    dim = Math.max(dim, o.dim || 0);
    return p < 1 || a.hold;
  });
  m.roll += (x - m.x) / (RADIUS * scale) + (turn - m.turn);
  m.x = x;
  m.turn = turn;
  return { transform: pose(x, y, scale, squash), roll: m.roll, dim, ellipsisX: x + 2 * RADIUS * scale, ellipsisSize: 2 * RADIUS * scale, ellipsis: m.ellipsis > 0.5 };
}

export default function AgentForm({ phase, levelRef, active, cueRef, hover = false, pending = false, ended = false }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const phaseRef = useRef(phase);
  const motion = useRef({ t: 0, x: 0, roll: 0, done: false, clock: 0, thinkFor: 0, ellipsis: 0, hover: 0, turn: 0, anims: [] });
  const flags = useRef({ phase, hover, pending });
  useEffect(() => { flags.current = { phase, hover, pending }; }, [phase, hover, pending]);

  // 사건을 받는 자리. TalkAgent 가 cueRef.current("key") 처럼 부른다.
  const cue = (name) => {
    const m = motion.current;
    if (name === "key") { if (m.clock - (m.lastKey ?? -9) < 0.3) return; m.lastKey = m.clock; }
    CUES[name]?.forEach(([fn, dur, delay = 0, hold = false]) => m.anims.push({ fn, dur, hold, start: m.clock + delay }));
  };
  useEffect(() => { if (cueRef) cueRef.current = cue; });

  // 생각이 시작되면 말을 받은 것이고, 말하다가 듣기로 바뀌면 끊긴 것이다.
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (phase === "thinking" && prevPhase.current !== "thinking") cue("send");
    if (phase === "hearing" && prevPhase.current === "speaking") cue("interrupt");
    prevPhase.current = phase;
  }, [phase]);
  useEffect(() => {
    if (ended) cue("end");
  }, [ended]);

  useEffect(() => {
    phaseRef.current = phase;
    const form = formRef.current;
    if (!form) return;
    form.setPhase(phase);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) form.frame(0, 0, true);
  }, [phase]);

  // 움직임 줄이기: 생각하는 동안의 말줄임표와 끝난 뒤의 검은 마침표를 움직임 없이 그 모습으로만.
  useEffect(() => {
    const form = formRef.current;
    const host = hostRef.current;
    if (!form || !matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = host.parentElement;
    dot.classList.toggle("is-ellipsis", phase === "thinking" && !ended);
    dot.style.setProperty("--ex", `${REST + 2 * RADIUS}em`);
    dot.style.setProperty("--es", "0.11em");
    host.style.transform = ended ? `scale(${START_SCALE})` : `translate(${REST}em, 0)`;
    form.setDim(ended ? 1 : 0);
    form.frame(0, 0, true);
  }, [phase, ended]);

  useEffect(() => {
    if (!active) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!formRef.current) {
      formRef.current = createBlobForm(canvasRef.current, { fit: FIT });
      hostRef.current.dataset.gl = formRef.current ? "on" : "off";
      if (!formRef.current) return;
      formRef.current.setPhase(phaseRef.current);
      if (!reduced) formRef.current.intro();
    }
    const form = formRef.current;
    const host = hostRef.current;
    const dot = host.parentElement;
    // 움직임 줄이기: 굴러가지 않고 처음부터 멈출 자리에 블롭으로.
    if (reduced) {
      host.style.transform = `translate(${REST}em, 0)`;
      form.setRoll(REST / RADIUS);
      form.frame(0, 0, true);
      return;
    }
    let frame;
    let last = performance.now();
    const tick = (now) => {
      // rAF 의 시각이 이 효과가 시작된 시각보다 이를 수 있다 — 거꾸로 흐르지 않게.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (!document.hidden) {
        const m = motion.current;
        if (!m.done) {
          const step = stepEntrance(m, dt);
          host.style.transform = step.transform;
          form.setRoll(step.roll);
          m.done = step.done;
        } else {
          const step = stepReaction(m, dt, flags.current);
          host.style.transform = step.transform;
          form.setRoll(step.roll);
          form.setDim(step.dim);
          dot.classList.toggle("is-ellipsis", step.ellipsis);
          dot.style.setProperty("--ex", `${step.ellipsisX.toFixed(4)}em`);
          dot.style.setProperty("--es", `${step.ellipsisSize.toFixed(4)}em`);
        }
        form.frame(dt, levelRef?.current || 0);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, levelRef]);

  useEffect(() => () => formRef.current?.destroy(), []);

  // 말줄임표의 두 점은 블롭 옆, 마침표(.talk-dot) 안에 놓인다. 자리와 크기는 프레임마다 --ex · --es 로 준다.
  return (
    <>
      <span className="talk-form" ref={hostRef} style={{ transform: `scale(${START_SCALE})` }} aria-hidden="true">
        <canvas ref={canvasRef} />
      </span>
      <i className="talk-ell" aria-hidden="true" />
      <i className="talk-ell" aria-hidden="true" />
    </>
  );
}
