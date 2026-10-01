"use client";

// 히어로의 형상. "컴퓨테이셔널 디자인을 사람의 경험으로" 를 한 그림으로 옮긴다 —
// 연산 기하로만 그린 사람의 옆모습. 형태는 사람이고, 재료는 계산이다.
//
// 메시는 처음에 한 번만 엮고(위상 고정) 이후에는 꼭짓점만 흔든다. 매 프레임
// 다시 삼각분할하면 선이 톡톡 끊겼다 이어지며 숨결이 아니라 잡음으로 보인다.
//
// 감정은 형태를 아래에서 위로 지나가는 느린 파동이다. 파고에 닿은 칸이 옅게
// 차오르고 선이 짙어진다. 점은 얼굴 쪽이 가장 촘촘하므로 거기서 가장 또렷하다.

import { useEffect, useRef } from "react";

// 옆모습 윤곽의 제어점 (x 오른쪽, y 아래로, 0~1). 이마·콧날·입술·턱이
// 읽히려면 이 구간의 점이 촘촘해야 한다 — 얼굴은 몇 mm 로 사람이 된다.
const PROFILE = [
  [0.455, 0.045], [0.545, 0.062], [0.615, 0.105], [0.655, 0.172],
  [0.672, 0.237], [0.658, 0.268],                        // 눈썹 둔덕과 그 아래 패임
  [0.682, 0.300], [0.722, 0.337], [0.748, 0.362],        // 콧날에서 코끝
  [0.700, 0.381], [0.690, 0.398],                        // 코 아래 · 인중
  [0.712, 0.418], [0.700, 0.432], [0.690, 0.447],        // 윗입술 · 아랫입술
  [0.672, 0.465], [0.700, 0.497],                        // 턱 앞 패임과 턱끝
  [0.672, 0.536], [0.610, 0.572], [0.556, 0.606],        // 턱선
  [0.544, 0.652], [0.556, 0.700],                        // 목 앞
  [0.608, 0.748], [0.710, 0.796], [0.826, 0.862],        // 어깨
  [0.896, 0.948], [0.922, 1.06],
  [0.078, 1.06], [0.104, 0.948], [0.174, 0.862],
  [0.290, 0.796], [0.392, 0.748],
  [0.444, 0.700], [0.432, 0.652], [0.424, 0.608],        // 목덜미
  [0.388, 0.568], [0.330, 0.505], [0.292, 0.418],        // 뒤통수
  [0.283, 0.320], [0.295, 0.212], [0.330, 0.125], [0.385, 0.068],
];

const POINTS = 300;       // 내부 점 수 (넓은 화면 기준, 좁으면 줄인다)
const CANDIDATES = 11;    // Mitchell best-candidate 의 후보 수
const INK = [112, 80, 167];   // --purple
const DEEP = [52, 34, 100];
const WARM = [196, 103, 154]; // 파고에 섞이는 온기 — 감정

// ── 기하 도우미 ────────────────────────────────────────────────────────────

// 닫힌 Catmull-Rom. 제어점을 그대로 지나면서 모서리를 없앤다.
function smoothClosed(pts, perSeg) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// 얼굴 쪽을 더 촘촘하게. 1 에 가까울수록 점 사이를 좁게 둔다.
function density(x, y) {
  const dx = x - 0.66, dy = y - 0.39;
  const face = Math.exp(-(dx * dx * 11 + dy * dy * 16));
  return 0.42 + 0.58 * (1 - face); // 얼굴 0.42, 몸통 1.0
}

// Bowyer–Watson. 점 수가 수백이라 한 번 돌리기에 충분히 빠르다.
function delaunay(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const dMax = Math.max(maxX - minX, maxY - minY) * 10;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const all = pts.concat([[cx - dMax, cy - dMax], [cx + dMax, cy - dMax], [cx, cy + dMax]]);
  const s0 = pts.length, s1 = s0 + 1, s2 = s0 + 2;

  const circum = (a, b, c) => {
    const [ax, ay] = all[a], [bx, by] = all[b], [cxx, cyy] = all[c];
    const d = 2 * (ax * (by - cyy) + bx * (cyy - ay) + cxx * (ay - by));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cxx * cxx + cyy * cyy;
    const ux = (a2 * (by - cyy) + b2 * (cyy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cxx - bx) + b2 * (ax - cxx) + c2 * (bx - ax)) / d;
    return { x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };

  let tris = [{ v: [s0, s1, s2], c: circum(s0, s1, s2) }];

  for (let i = 0; i < pts.length; i++) {
    const [px, py] = all[i];
    const bad = [], keep = [];
    for (const t of tris) {
      if (t.c && (px - t.c.x) ** 2 + (py - t.c.y) ** 2 < t.c.r2) bad.push(t);
      else keep.push(t);
    }
    // 지워진 삼각형들의 경계(한 번만 쓰인 변)가 새 삼각형들의 테두리가 된다.
    const counts = new Map();
    for (const t of bad) {
      for (let e = 0; e < 3; e++) {
        const a = t.v[e], b = t.v[(e + 1) % 3];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    tris = keep;
    for (const [key, n] of counts) {
      if (n !== 1) continue;
      const [a, b] = key.split(",").map(Number);
      tris.push({ v: [a, b, i], c: circum(a, b, i) });
    }
  }
  return tris.filter((t) => t.v.every((v) => v < s0)).map((t) => t.v);
}

// ── 컴포넌트 ───────────────────────────────────────────────────────────────

export default function SilhouetteMesh() {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  // 포인터 기울기 — 기존 히어로 동작을 그대로 둔다.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const move = (e) => {
      if (reduce.matches || raf) return;
      raf = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--pointer-x", `${((e.clientX - box.left) / box.width - 0.5) * 12}deg`);
        el.style.setProperty("--pointer-y", `${-((e.clientY - box.top) / box.height - 0.5) * 10}deg`);
        raf = 0;
      });
    };
    const reset = () => {
      el.style.setProperty("--pointer-x", "0deg");
      el.style.setProperty("--pointer-y", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    const outline = smoothClosed(PROFILE, 10);   // 그리기·판정용
    const coarse = outline.filter((_, i) => i % 3 === 0); // 안팎 판정은 성기게

    let mesh = null;   // {nodes, edges, tris}
    let w = 0, h = 0, scale = 1, ox = 0, oy = 0;

    // 실루엣 안에 점을 뿌린다. 후보 중 기존 점에서 가장 멀리 떨어진 것을 고르되,
    // 거리를 그 자리의 목표 간격으로 나눠 비교한다 — 얼굴이 촘촘해지는 이유.
    const build = (count) => {
      const nodes = [];
      // 윤곽을 먼저 심는다. 메시의 가장자리가 곧 실루엣이 된다.
      const step = Math.max(2, Math.round(outline.length / (count * 0.42)));
      for (let i = 0; i < outline.length; i += step) {
        nodes.push({ x: outline[i][0], y: outline[i][1], edge: true });
      }
      const interior = count - nodes.length;
      for (let i = 0; i < interior; i++) {
        let best = null, bestScore = -1;
        for (let k = 0; k < CANDIDATES; k++) {
          const x = 0.02 + Math.random() * 0.96;
          const y = 0.02 + Math.random() * 0.98;
          if (!inside(coarse, x, y)) continue;
          let near = Infinity;
          for (const n of nodes) {
            const d = (n.x - x) ** 2 + (n.y - y) ** 2;
            if (d < near) near = d;
          }
          const score = Math.sqrt(near) / density(x, y);
          if (score > bestScore) { bestScore = score; best = { x, y, edge: false }; }
        }
        if (best) nodes.push(best);
      }

      for (const n of nodes) {
        n.ox = n.x; n.oy = n.y;
        n.pa = Math.random() * Math.PI * 2;
        n.pb = Math.random() * Math.PI * 2;
      }

      const tris = delaunay(nodes.map((n) => [n.x, n.y])).filter(([a, b, c]) => {
        // 바깥이나 오목한 틈(목과 어깨 사이)을 메운 삼각형은 버린다.
        const gx = (nodes[a].x + nodes[b].x + nodes[c].x) / 3;
        const gy = (nodes[a].y + nodes[b].y + nodes[c].y) / 3;
        if (!inside(coarse, gx, gy)) return false;
        const longest = Math.max(
          (nodes[a].x - nodes[b].x) ** 2 + (nodes[a].y - nodes[b].y) ** 2,
          (nodes[b].x - nodes[c].x) ** 2 + (nodes[b].y - nodes[c].y) ** 2,
          (nodes[c].x - nodes[a].x) ** 2 + (nodes[c].y - nodes[a].y) ** 2
        );
        return longest < 0.045; // 형태를 가로지르는 긴 삼각형 제거
      });

      // 변은 한 번만 긋는다 — 두 번 그으면 그 선만 짙어져 얼룩이 생긴다.
      const seen = new Set();
      const edges = [];
      for (const [a, b, c] of tris) {
        for (const [p, q] of [[a, b], [b, c], [c, a]]) {
          const key = p < q ? p * 100000 + q : q * 100000 + p;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push([p, q]);
        }
      }
      return { nodes, tris, edges };
    };

    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(box.width));
      h = Math.max(1, Math.round(box.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 세로를 기준으로 맞추고 가운데 세운다 — 가로가 넓어도 사람은 커지지 않는다.
      scale = Math.min(h * 0.98, w * 0.92);
      ox = (w - scale * 0.98) / 2;
      oy = (h - scale) / 2;

      const want = w < 520 ? 190 : POINTS;
      if (!mesh || mesh.nodes.length < want * 0.7 || mesh.nodes.length > want * 1.4) {
        mesh = build(want);
      }
    };

    const px = (n) => ox + n.x * scale * 0.98;
    const py = (n) => oy + n.y * scale;

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      if (!mesh) return;
      const { nodes, tris, edges } = mesh;

      // 꼭짓점은 제자리 주변에서만 흔들린다. 윤곽 점은 덜 흔들어 실루엣을 지킨다.
      const amp = 0.0042;
      for (const n of nodes) {
        const a = n.edge ? 0.3 : 1;
        n.x = n.ox + Math.sin(t * 0.00042 + n.pa) * amp * a;
        n.y = n.oy + Math.cos(t * 0.00035 + n.pb) * amp * a;
      }

      // 감정 — 아래에서 위로 지나가는 느린 파동.
      const feel = (x, y) => 0.5 + 0.5 * Math.sin(t * 0.00055 - y * 4.6 + x * 1.3);

      // 파고에 닿은 칸만 옅게 채운다. 색을 바꾸는 횟수를 줄이려 세 덩이로 묶는다.
      for (let band = 2; band >= 0; band--) {
        const lo = 0.62 + band * 0.12;
        ctx.beginPath();
        let any = false;
        for (const [a, b, c] of tris) {
          const gx = (nodes[a].x + nodes[b].x + nodes[c].x) / 3;
          const gy = (nodes[a].y + nodes[b].y + nodes[c].y) / 3;
          const f = feel(gx, gy);
          if (f < lo || f >= lo + 0.12) continue;
          any = true;
          ctx.moveTo(px(nodes[a]), py(nodes[a]));
          ctx.lineTo(px(nodes[b]), py(nodes[b]));
          ctx.lineTo(px(nodes[c]), py(nodes[c]));
          ctx.closePath();
        }
        if (!any) continue;
        const m = (band + 1) / 3;
        const col = INK.map((v, i) => Math.round(v + (WARM[i] - v) * m * 0.55));
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.05 + m * 0.07})`;
        ctx.fill();
      }

      // 선. 그물 전체는 옅게 한 번, 파고에 든 변만 한 번 더 짙게 덧긋는다.
      const g = ctx.createLinearGradient(ox, oy + scale, ox + scale, oy);
      g.addColorStop(0, `rgb(${DEEP.join(",")})`);
      g.addColorStop(0.55, `rgb(${INK.join(",")})`);
      g.addColorStop(1, "#ac91db");
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.6;

      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (const [a, b] of edges) {
        ctx.moveTo(px(nodes[a]), py(nodes[a]));
        ctx.lineTo(px(nodes[b]), py(nodes[b]));
      }
      ctx.stroke();

      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      for (const [a, b] of edges) {
        const f = feel((nodes[a].x + nodes[b].x) / 2, (nodes[a].y + nodes[b].y) / 2);
        if (f < 0.74) continue;
        ctx.moveTo(px(nodes[a]), py(nodes[a]));
        ctx.lineTo(px(nodes[b]), py(nodes[b]));
      }
      ctx.stroke();

      // 윤곽선 한 겹 — 메시만으로는 옆모습이 뭉개진다.
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      outline.forEach(([x, y], i) => {
        const X = ox + x * scale * 0.98, Y = oy + y * scale;
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      const top = oy + scale * 0.80;
      const fade = ctx.createLinearGradient(0, top, 0, oy + scale * 1.03);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = fade;
      ctx.fillRect(0, top, w, h - top);
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0, visible = true, last = 0, clock = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (!reduce.matches) clock += dt;
      draw(clock);
    };

    fit();
    draw(0);
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => { fit(); draw(clock); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      host.classList.toggle("field-in-view", e.isIntersecting);
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="question-field" ref={hostRef}>
      <div className="field-grid" aria-hidden="true" />
      <div className="field-art" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
