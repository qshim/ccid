// 에이전트의 모습 — 속에서 빛이 떠도는 유리 구슬(블롭).
//
// 구슬 안: cciD 웹사이트(ccidver2)의 배경 블롭과 같은 방식이다. 색 빛 여섯 개가 서로 다른 느린 궤적(사인 ·
// 코사인의 빠르기가 조금씩 다른 리사주 곡선)으로 떠돌고, 빛이 겹치는 곳은 더해져 밝아지고 떨어지면 갈라진다.
// 빛이 닿지 않는 곳은 깊은 보라 바탕으로 가라앉고, 고운 그레인이 얹힌다. 띠가 한 축을 돌던 예전 방식(행성처럼
// 보였다) 대신 덩어리가 합쳐지고 갈라지며 흐른다. 보라가 주색, 파랑이 둘레, 청록은 빛 하나로만 섞인다.
// 구슬: 연구실의 COEX 에이전트 블롭(SooyounJo/coexblobtest, ver10)처럼 three.js 의 구(반지름 1.9)를 카메라(z=6,
// 시야 50°)로 본 모양이다. three.js 를 받지 않도록 캔버스 한 장을 덮는 사각형에서 픽셀마다 시선과 구가 만나는
// 점(법선)을 계산하고, 그 위에 가장자리의 프레넬 빛, 유리의 하이라이트, 부드러운 투명도를 얹는다.
//
// 등장(intro()): "Let's talk." 의 마침표(글자와 같은 검은 원)에서 시작한다. 마침표가 자라는 동안 애플
// 글로우의 빛 고리가 켜져 어두운 보라 구슬이 되고, 블롭이 가운데에서 피어나 고리를 채운 뒤, 바깥 번짐이
// 스러진다. 모양은 처음부터 끝까지 블롭과 같은 원이다.
//
// 상태(TalkEngine 의 phase)마다 손잡이(boost · paletteMix · 크기 · 숨 · 빠르기)를 다르게 돌린다. 값 사이는 매
// 프레임 조금씩 다가가 부드럽게 바뀐다. 물결의 위상은 화면 쪽에서 쌓아 넘겨, 목소리를 따라 빠르기가 바뀌어도
// 튀지 않는다.
//   idle      빛이 천천히 떠돈다
//   listening 숨 쉬듯 조금 부풀었다 줄어든다
//   hearing   방문자의 목소리만큼 부풀고, 빛이 밝아지며 가운데에서 잔물결이 퍼진다
//   thinking  조금 작아지고, 빛이 파랑 · 청록 쪽으로 옮겨 가며 빨리 떠돈다
//   speaking  소리만큼 부풀고 밝아지며, 잔물결이 바깥으로 퍼진다

const VERT = `
attribute vec2 a_pos;
varying vec2 v_p;
void main() {
  v_p = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 v_p;
uniform float time;
uniform float boost;
uniform float paletteMix;
uniform float wavePhase;
uniform float pulsePhase;
uniform float u_radius;
uniform float u_rho;
uniform float u_px;
uniform float u_intro;
uniform float u_iflow;
uniform float u_roll;
uniform float u_dim; // 마침표 색으로 돌아가는 정도(대화가 끝나면 1)

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float TAN_HALF_FOV = 0.46630765815;

// 몸과 떠도는 빛. 몸은 cciD 보라를 조금 깊게 잡은 색이고, 빛은 그 위를 덮으며 지나간다(겹치면 색이 섞이고,
// 아주 많이 겹친 곳만 조금 더 밝아진다 — 하얗게 타지 않는다). 청록 하나가 곁 색이다.
const vec3 BODY = vec3(0.36, 0.22, 0.58);
const vec3 L1 = vec3(0.52, 0.34, 0.90); // 보라
const vec3 L2 = vec3(0.72, 0.56, 0.94); // 라일락
const vec3 L3 = vec3(0.80, 0.56, 0.90); // 분홍 라일락
const vec3 L4 = vec3(0.40, 0.40, 0.95); // 남보라
const vec3 L5 = vec3(0.28, 0.44, 1.00); // 파랑
const vec3 L6 = vec3(0.30, 0.78, 0.72); // 청록
// thinking 에서 옮겨 가는 차가운 빛
const vec3 K1 = vec3(0.30, 0.50, 0.95);
const vec3 K2 = vec3(0.42, 0.64, 0.96);
const vec3 K3 = vec3(0.50, 0.52, 0.96);
const vec3 K4 = vec3(0.28, 0.40, 0.92);
const vec3 K5 = vec3(0.30, 0.70, 0.95);
const vec3 K6 = vec3(0.30, 0.80, 0.80);
const vec3 RIM = vec3(0.30, 0.44, 1.00);  // 둘레의 프레넬 빛
const vec3 DOT = vec3(0.141, 0.133, 0.149); // 마침표(글자색 #242226) — 등장의 첫 모습
// 빛의 크기(구슬 반지름 = 1), 궤적의 폭, 떠도는 빠르기, 밝기, 청록의 몫, 그레인
const float LIGHT_SIZE = 1.0;
const float PATH = 0.85;
const float LIGHT_SPEED = 0.32;
const float INTENSITY = 1.0;
const float TEAL_W = 0.35;
const float GRAIN = 0.03;

float light(vec2 s, vec2 c) { return 1.0 - smoothstep(0.0, LIGHT_SIZE, length(s - c)); }

// 등장할 때의 애플 글로우. 빛의 색은 파랑 → 보라 → 분홍 → 살구로 갔다가 같은 길로 돌아온다.
vec3 hue(float x) {
  x = (1.0 - abs(fract(x) * 2.0 - 1.0)) * 3.0;
  vec3 col = mix(vec3(0.30, 0.55, 1.00), vec3(0.62, 0.36, 1.00), smoothstep(0.0, 1.0, x));
  col = mix(col, vec3(1.00, 0.32, 0.72), smoothstep(1.0, 2.0, x));
  return mix(col, vec3(1.00, 0.62, 0.35), smoothstep(2.0, 3.0, x));
}
vec3 tanh3(vec3 x) { vec3 e = exp(-2.0 * x); return (1.0 - e) / (1.0 + e); }
// rad 는 고리의 반지름, g 는 밝기. 안쪽은 어두운 보라 몸(불투명), 바깥은 옅은 번짐(색과 투명도).
// 고리는 블롭과 같은 완전한 원이다(일렁이면 형태가 무너져 보인다).
vec4 appleGlow(vec2 p, float rad, float g) {
  float len = length(p);
  float d = len - rad;
  vec2 q = p / max(rad, 1e-3);
  q /= max(1.0, length(q));
  vec2 dir = vec2(cos(u_iflow * TAU), sin(u_iflow * TAU));
  float I = g * 0.045 / max(5.0 * d, 0.011 - d);
  float ph = 0.3 * dot(q, dir) + 0.1 * dot(q, vec2(-dir.y, dir.x)) + 0.5 * u_iflow + 0.08 * sin(2.0 * q.x + 1.5 * q.y + time * 0.6);
  vec3 lightCol = (hue(ph) + 0.12) * I;
  vec3 inside = tanh3(vec3(0.13, 0.065, 0.25) + lightCol);
  vec3 halo = tanh3(lightCol);
  float m = max(halo.r, max(halo.g, halo.b));
  float ha = clamp(m, 0.0, 0.9) * smoothstep(1.0, rad + 0.1, len);
  float edge = smoothstep(-u_px, u_px, d);
  return vec4(mix(inside, halo / max(m, 1e-3) * 0.85, edge), mix(1.0, ha, edge));
}

void main() {
  float len = length(v_p);

  // 등장(u_intro 0 → 1): 검은 마침표에서 빛의 고리가 켜지며 글로우 구슬이 되고(모양은 늘 원),
  // 블롭이 가운데에서 피어나 고리를 채우고, 번짐이 스러진다.
  vec4 intro = vec4(0.0);
  float bloomMask = 1.0;
  if (u_intro < 1.0) {
    float on = smoothstep(0.0, 0.22, u_intro);
    float grow = 1.0 - pow(1.0 - smoothstep(0.0, 0.4, u_intro), 3.0);
    vec4 seed = vec4(DOT, smoothstep(u_rho + u_px, u_rho - u_px, len));
    intro = mix(seed, appleGlow(v_p, u_rho * mix(0.94, 1.0, grow), on), on);
    intro.a *= 1.0 - smoothstep(0.62, 1.0, u_intro);
    float bloom = smoothstep(0.28, 0.8, u_intro) * 1.4;
    bloomMask = 1.0 - smoothstep(bloom - 0.35, bloom, len / u_rho);
  }

  // 구의 테두리 안쪽만 그린다. 바깥 한 화소는 테두리 점을 그대로 써서 부드럽게 깎는다.
  float cover = smoothstep(u_rho + u_px, u_rho - u_px, len);
  if (cover <= 0.0) { gl_FragColor = intro; return; }

  // 시선(카메라 z=6, 시야 50°)이 구와 만나는 점 → 법선
  vec3 cam = vec3(0.0, 0.0, 6.0);
  vec3 dir = normalize(vec3(v_p * TAN_HALF_FOV, -1.0));
  float b = dot(cam, dir);
  float h = b * b - (dot(cam, cam) - u_radius * u_radius);
  vec3 N = normalize(cam + (-b - sqrt(max(h, 0.0))) * dir);

  // 구를 앞에서 본 자리(-1 ~ 1). 가장자리로 갈수록 촘촘해져 둥근 깊이가 생긴다. 공처럼 굴러간 만큼(u_roll,
  // 오른쪽으로 구르면 시계 방향) 속의 빛도 함께 돈다. 빛과 하이라이트는 돌지 않는다.
  vec2 s = mat2(cos(u_roll), sin(u_roll), -sin(u_roll), cos(u_roll)) * N.xy;
  float rr = length(s);
  // 목소리: 가운데에서 퍼지는 잔물결이 빛의 자리를 흔든다
  float pulse = smoothstep(0.25, 0.9, 0.5 + 0.5 * sin(pulsePhase));
  float ripple = (sin(rr * 12.0 - wavePhase) * 0.6 + sin(rr * 7.0 - wavePhase * 0.7 + 1.2) * 0.4) * mix(0.004, 0.05, boost) * (0.4 + 0.6 * pulse);
  s += s / max(rr, 1e-3) * ripple;

  // 떠도는 빛 여섯 개 — 저마다 빠르기가 다른 리사주 궤적
  float t = time * LIGHT_SPEED;
  vec3 c1 = mix(L1, K1, paletteMix), c2 = mix(L2, K2, paletteMix), c3 = mix(L3, K3, paletteMix);
  vec3 c4 = mix(L4, K4, paletteMix), c5 = mix(L5, K5, paletteMix), c6 = mix(L6, K6, paletteMix);
  vec4 acc = vec4(0.0); // rgb = 빛의 색 × 세기, a = 세기의 합
  acc += vec4(c1, 1.0) * light(s, vec2(sin(t * 0.40), cos(t * 0.50)) * 0.80 * PATH) * 1.0;
  acc += vec4(c2, 1.0) * light(s, vec2(cos(t * 0.60 + 1.3), sin(t * 0.45 + 0.4)) * 0.95 * PATH) * 0.8;
  acc += vec4(c3, 1.0) * light(s, vec2(sin(t * 0.35 + 2.1), cos(t * 0.55 + 0.9)) * 0.85 * PATH) * 0.55;
  acc += vec4(c4, 1.0) * light(s, vec2(cos(t * 0.50 + 3.7), sin(t * 0.40 + 2.2)) * 0.80 * PATH) * 0.6;
  acc += vec4(c5, 1.0) * light(s, vec2(sin(t * 0.70 + 4.4), cos(t * 0.60 + 1.8)) * 0.75 * PATH) * 0.45;
  acc += vec4(c6, 1.0) * light(s, vec2(cos(t * 0.45 + 5.2), sin(t * 0.65 + 3.1)) * 0.95 * PATH) * TEAL_W;
  vec3 tint = acc.rgb / max(acc.a, 1e-3);
  vec3 col = mix(BODY, tint, smoothstep(0.1, 1.2, acc.a));
  col += tint * smoothstep(1.1, 2.6, acc.a) * 0.3;
  col *= INTENSITY + 0.25 * boost;

  // 유리 구슬: 둘레의 프레넬 빛, 왼쪽 위의 옅은 하이라이트, 고운 그레인
  float fres = pow(1.0 - max(N.z, 0.0), 2.2);
  col += mix(RIM, vec3(0.36, 0.72, 0.98), paletteMix) * fres * 0.5;
  col += vec3(0.92, 0.88, 1.0) * pow(max(dot(N, normalize(vec3(-0.45, 0.55, 0.7))), 0.0), 18.0) * 0.22;
  col += (fract(sin(dot(v_p * 517.0 + time, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0) * GRAIN;
  col = mix(clamp(col, 0.0, 1.0), DOT, u_dim);

  // 투명도: 몸은 거의 불투명, 가장자리는 유리처럼 살짝 비친다
  float alpha = mix(0.82, 0.97, smoothstep(1.0, 0.55, rr)) + fres * 0.1;
  vec4 blob = vec4(col, clamp(alpha, 0.0, 1.0) * cover);
  gl_FragColor = u_intro < 1.0 ? mix(intro, blob, bloomMask) : blob;
}
`;

// 상태별 모습. scale 은 크기(1 = 자리에 맞춘 기본 크기), boost 는 빛의 밝기와 잔물결, palette 는 파랑 · 청록
// 쪽으로 옮겨 가는 정도, speed 는 빛이 떠도는 빠르기, breathe 는 숨의 깊이, levelS · levelB 는 소리 크기(0~1)가
// 더하는 부풀기와 잔물결.
const LOOKS = {
  idle: { scale: 1, boost: 0, palette: 0, speed: 1, breathe: 0, levelS: 0, levelB: 0 },
  listening: { scale: 1.02, boost: 0.1, palette: 0.1, speed: 1.1, breathe: 1, levelS: 0, levelB: 0 },
  hearing: { scale: 1.02, boost: 0.25, palette: 0.1, speed: 1.2, breathe: 0, levelS: 0.08, levelB: 0.75 },
  thinking: { scale: 0.94, boost: 0.15, palette: 0.75, speed: 2.2, breathe: 0, levelS: 0, levelB: 0 },
  speaking: { scale: 1.02, boost: 0.4, palette: 0.1, speed: 1.3, breathe: 0, levelS: 0.06, levelB: 0.6 },
};
const KEYS = Object.keys(LOOKS.idle);
const INTRO_SEC = 2.4; // 애플 글로우에서 블롭으로 피어나는 시간
const TAN_HALF_FOV = Math.tan((25 * Math.PI) / 180);

function shader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

// fit 은 기본 크기의 구가 캔버스 반지름에서 차지하는 비율이다. WebGL 을 쓸 수 없으면 null — 그때 화면은 보라 점으로 대신한다.
export function createBlobForm(canvas, { fit = 0.6 } = {}) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return null;
  const vs = shader(gl, gl.VERTEX_SHADER, VERT);
  const fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ["time", "boost", "paletteMix", "wavePhase", "pulsePhase", "u_radius", "u_rho", "u_px", "u_intro", "u_iflow", "u_roll", "u_dim"].forEach((name) => { u[name] = gl.getUniformLocation(program, name); });
  gl.clearColor(0, 0, 0, 0);

  // 화면에서 반지름 fit 으로 보이는 구의 실제 반지름(카메라에서 6 떨어진 곳)
  const baseRadius = 6 * Math.sin(Math.atan(fit * TAN_HALF_FOV));
  const look = { ...LOOKS.idle };
  let target = LOOKS.idle;
  let time = Math.random() * 60; // 열 때마다 다른 모양에서 시작한다
  let wavePhase = 0;
  let pulsePhase = 0;
  let clock = 0;
  let intro = 1; // 1 = 등장이 끝났다
  let introFlow = 0;
  let roll = 0; // 굴러간 각도(라디안)
  let dim = 0;

  return {
    setPhase(phase) {
      target = LOOKS[phase] || LOOKS.idle;
    },
    // 마침표에서 애플 글로우를 거쳐 피어나기 시작한다.
    intro() {
      intro = 0;
      introFlow = Math.random();
    },
    // 공처럼 굴러간 각도. 다음 장부터 속의 빛이 그만큼 돌아 있다.
    setRoll(angle) {
      roll = angle;
    },
    // 마침표 색(글자색)으로 돌아가는 정도. 0 = 블롭, 1 = 검은 마침표.
    setDim(amount) {
      dim = amount;
    },
    // dt 초만큼 흘려 한 장 그린다. snap 이면 새 모습으로 바로 바꾼다(움직임 줄이기).
    frame(dt, level = 0, snap = false) {
      if (gl.isContextLost()) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.max(1, Math.round(canvas.clientWidth * dpr));
      if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
      gl.viewport(0, 0, size, size);

      const k = snap ? 1 : 1 - Math.exp(-dt * 4.5);
      KEYS.forEach((key) => { look[key] += (target[key] - look[key]) * k; });
      const boost = Math.min(1, look.boost + level * look.levelB);
      clock += dt;
      time += dt * look.speed;
      wavePhase += dt * look.speed * (1.3 + 1.7 * boost);
      pulsePhase += dt * look.speed * (0.55 + 0.5 * boost);
      const breathe = 1 + look.breathe * 0.03 * Math.sin(clock * 1.9);
      const scale = (look.scale + level * look.levelS) * breathe;
      const radius = baseRadius * scale;
      if (intro < 1) {
        intro = snap ? 1 : Math.min(1, intro + dt / INTRO_SEC);
        introFlow += dt * (0.12 + 0.3 * (1 - intro)); // 빛이 빠르게 돌다 느려진다
      }

      gl.uniform1f(u.time, time);
      gl.uniform1f(u.boost, boost);
      gl.uniform1f(u.paletteMix, look.palette);
      gl.uniform1f(u.wavePhase, wavePhase);
      gl.uniform1f(u.pulsePhase, pulsePhase);
      gl.uniform1f(u.u_radius, radius);
      gl.uniform1f(u.u_rho, Math.tan(Math.asin(radius / 6)) / TAN_HALF_FOV);
      gl.uniform1f(u.u_px, 2 / size);
      gl.uniform1f(u.u_intro, intro);
      gl.uniform1f(u.u_iflow, introFlow);
      gl.uniform1f(u.u_roll, roll);
      gl.uniform1f(u.u_dim, dim);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    // 캔버스가 화면에서 빠졌을 때만 문맥을 돌려준다(개발 모드의 두 번 마운트에서는 같은 캔버스를 다시 쓴다).
    destroy() {
      if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
