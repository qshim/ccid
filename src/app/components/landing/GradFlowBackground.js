"use client";

/* ============================================================
   cciD — flowing gradient (Alex Harri "final" shader)
   React port of gradflow.js: stacked simplex background fields +
   two animated simplex wave masks, multi-sample dynamic blur with
   exponent range + oscillating blur bias, lightness mapped through
   a gradient texture. Optional directional relief shading.
   simplex noise: Ashima / Stefan Gustavson webgl-noise (MIT).
   ============================================================ */

import { useEffect, useRef } from "react";

export const COLOR_CONFIGS = {
  default: ["hsl(240deg 100% 20%)", "hsl(281deg 100% 21%)", "hsl(304deg 100% 23%)", "hsl(319deg 100% 30%)", "hsl(329deg 100% 36%)", "hsl(336deg 100% 41%)", "hsl(346deg 83% 51%)", "hsl(3deg 95% 61%)", "hsl(17deg 100% 59%)", "hsl(30deg 100% 55%)", "hsl(40deg 100% 50%)", "hsl(48deg 100% 50%)", "hsl(55deg 100% 50%)"],
  purple: ["#2a1466", "#3d1f9e", "#5a2fd6", "#7c3aed", "#9a5cf5", "#b78bf8", "#d6c2fb"],
};

function initGradFlow(canvas, opts) {
  opts = opts || {};
  const gl =
    canvas.getContext("webgl", { antialias: true, alpha: true, preserveDrawingBuffer: true }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) {
    canvas.style.background = opts.fallback || "#0a0518";
    return () => {};
  }

  const BLUR_AMOUNT = (opts.blurAmount != null ? opts.blurAmount : 345).toFixed(1);
  const BLUR_QUALITY = opts.blurQuality != null ? opts.blurQuality : 7;
  const EXP0 = (opts.blurExponentRange ? opts.blurExponentRange[0] : 0.9).toFixed(5);
  const EXP1 = (opts.blurExponentRange ? opts.blurExponentRange[1] : 1.2).toFixed(5);

  const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }";

  const FRAG = `
uniform float u_time;
uniform float u_w;
uniform float u_h;
uniform sampler2D u_gradient;
uniform float u_amp;
uniform float u_contrast;
uniform float u_relief;
uniform float u_reliefK;
uniform float u_noiseScale;
uniform float u_wave1Y;
uniform float u_wave2Y;
uniform float u_lift;

const float PI = 3.14159;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+10.0)*x);}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}

float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
        i.z+vec4(0.0,i1.z,i2.z,1.0))
      + i.y+vec4(0.0,i1.y,i2.y,1.0))
      + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float get_x() { return 900.0 + gl_FragCoord.x - u_w / 2.0; }

float sstep(float t) { return t * t * t * (t * (6.0 * t - 15.0) + 10.0); }
float lerp(float a, float b, float t) { return a * (1.0 - t) + b * t; }
float ease_in(float x) { return 1.0 - cos((x * PI) * 0.5); }

float wave_alpha_part(float dist, float blur_fac, float t) {
  float ex = mix(${EXP0}, ${EXP1}, t);
  float v = pow(blur_fac, ex);
  v = ease_in(v);
  v = sstep(v);
  v = clamp(v, 0.008, 1.0);
  v *= ${BLUR_AMOUNT};
  float alpha = clamp(0.5 + dist / v, 0.0, 1.0);
  alpha = sstep(alpha);
  return alpha;
}

float background_noise(float offset) {
  const float S = 0.064;
  const float L = 0.00085;
  const float L1 = 1.5, L2 = 0.9, L3 = 0.6;
  const float LY1 = 1.00, LY2 = 0.85, LY3 = 0.70;
  const float F = 0.04;
  const float Y_SCALE = 1.0 / 0.27;

  float x = get_x() * L * u_noiseScale;
  float y = gl_FragCoord.y * L * Y_SCALE * u_noiseScale;
  float time = u_time + offset;
  float x_shift = time * F;
  float sum = 0.5;
  sum += snoise(vec3(x * L1 +  x_shift * 1.1, y * L1 * LY1, time * S)) * 0.30;
  sum += snoise(vec3(x * L2 + -x_shift * 0.6, y * L2 * LY2, time * S)) * 0.25;
  sum += snoise(vec3(x * L3 +  x_shift * 0.8, y * L3 * LY3, time * S)) * 0.20;
  return sum;
}

float wave_y_noise(float offset) {
  const float S = 0.075;
  float time = u_time + offset;
  // Lower horizontal scale → long, broad waves (minimal squiggle).
  float x = get_x() * 0.00060;
  float y = time * S;
  float x_shift = time * 0.026;

  float sum = 0.0;
  sum += snoise(vec2(x * 1.30 + x_shift, y * 0.54)) * 0.85;
  sum += snoise(vec2(x * 1.00 + x_shift, y * 0.68)) * 1.15;
  sum += snoise(vec2(x * 0.70 + x_shift, y * 0.59)) * 0.60;
  sum += snoise(vec2(x * 0.40 + x_shift, y * 0.48)) * 0.40;
  return sum;
}

float calc_blur_bias() {
  const float S = 0.261;
  float bias_t = (sin(u_time * S) + 1.0) * 0.5;
  return lerp(-0.17, -0.04, bias_t);
}

float calc_blur(float offset) {
  const float L = 0.0011;
  const float S = 0.07;
  const float F = 0.03;
  float time = u_time + offset;
  float x = get_x() * L;
  float blur_fac = calc_blur_bias();
  blur_fac += snoise(vec2(x * 0.60 + time * F *  1.0, time * S * 0.7)) * 0.5;
  blur_fac += snoise(vec2(x * 1.30 + time * F * -0.8, time * S * 1.0)) * 0.4;
  blur_fac = (blur_fac + 1.0) * 0.5;
  blur_fac = clamp(blur_fac, 0.0, 1.0);
  return blur_fac;
}

float wave_alpha(float Y, float wave_height, float offset) {
  float wave_y = Y + wave_y_noise(offset) * wave_height;
  float dist = wave_y - gl_FragCoord.y;
  float blur_fac = calc_blur(offset);
  const float PART = 1.0 / float(${BLUR_QUALITY});
  float sum = 0.0;
  for (int i = 0; i < ${BLUR_QUALITY}; i++) {
    float t = PART * float(i);
    sum += wave_alpha_part(dist, blur_fac, t) * PART;
  }
  return sum;
}

void main() {
  float WAVE1_Y = u_wave1Y * u_h;
  float WAVE2_Y = u_wave2Y * u_h;
  float WAVE1_HEIGHT = 0.195 * u_h * u_amp;
  float WAVE2_HEIGHT = 0.144 * u_h * u_amp;

  float bg_lightness = background_noise(-192.4);
  float w1_lightness = background_noise( 273.3);
  float w2_lightness = background_noise( 623.1);

  float w1_alpha = wave_alpha(WAVE1_Y, WAVE1_HEIGHT, 112.5 * 48.75);
  float w2_alpha = wave_alpha(WAVE2_Y, WAVE2_HEIGHT, 225.0 * 36.00);

  float lightness = bg_lightness;
  lightness = lerp(lightness, w2_lightness, w2_alpha);
  lightness = lerp(lightness, w1_lightness, w1_alpha);

  lightness = clamp((lightness - 0.5) * u_contrast + 0.5, 0.0, 1.0);

  vec3 col = texture2D(u_gradient, vec2(clamp(lightness, 0.0, 1.0), 0.5)).rgb;

#ifdef RELIEF
  float hx = dFdx(lightness) * u_reliefK;
  float hy = dFdy(lightness) * u_reliefK;
  vec3 nrm = normalize(vec3(-hx, -hy, 1.0));
  vec3 lightDir = normalize(vec3(-0.45, 0.65, 0.62));
  float dif = dot(nrm, lightDir) * 0.5 + 0.5;
  float shade = mix(1.0 - 0.55 * u_relief, 1.0 + 0.38 * u_relief, clamp(dif, 0.0, 1.0));
  col *= shade;
  float slope = clamp(length(vec2(hx, hy)) * 0.5, 0.0, 1.0);
  col += vec3(0.05, 0.03, 0.09) * slope * u_relief;
#endif

  // Scroll-driven brightening: lift only the warm/light end of the gradient
  // (the grey-beige tones live at high lightness) toward a warm near-white, so
  // the purples stay put while the warm greys glow up as u_lift rises.
  float warmMask = smoothstep(0.5, 1.0, lightness);
  col = mix(col, vec3(0.98, 0.965, 0.925), clamp(u_lift, 0.0, 1.0) * warmMask);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function compile(t, s) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn("gradflow", gl.getShaderInfoLog(sh));
    return sh;
  }

  const hasDeriv = !!gl.getExtension("OES_standard_derivatives");
  const wantRelief = opts.relief && hasDeriv;
  let header = "precision highp float;\n";
  if (wantRelief) header = "#extension GL_OES_standard_derivatives : enable\n" + header + "#define RELIEF 1\n";

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, header + FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn("gradflow link", gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  function buildGradient(stops) {
    const gcanvas = document.createElement("canvas");
    gcanvas.width = 1000;
    gcanvas.height = 2;
    const gx = gcanvas.getContext("2d");
    const grad = gx.createLinearGradient(0, 0, 1000, 0);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    gx.fillStyle = grad;
    gx.fillRect(0, 0, 1000, 2);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gcanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }
  buildGradient(opts.stops || COLOR_CONFIGS.purple);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(gl.getUniformLocation(prog, "u_gradient"), 0);

  const uTime = gl.getUniformLocation(prog, "u_time");
  const uW = gl.getUniformLocation(prog, "u_w");
  const uH = gl.getUniformLocation(prog, "u_h");
  gl.uniform1f(gl.getUniformLocation(prog, "u_amp"), opts.amp != null ? opts.amp : 1.0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_contrast"), opts.contrast != null ? opts.contrast : 1.0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_relief"), wantRelief ? opts.relief || 1.0 : 0.0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_reliefK"), opts.reliefK != null ? opts.reliefK : 380.0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_noiseScale"), opts.noiseScale != null ? opts.noiseScale : 1.0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_wave1Y"), opts.wave1Y != null ? opts.wave1Y : 0.45);
  gl.uniform1f(gl.getUniformLocation(prog, "u_wave2Y"), opts.wave2Y != null ? opts.wave2Y : 0.9);
  const uLift = gl.getUniformLocation(prog, "u_lift");
  // Scroll-driven brightening amount. Either a static number (opts.lift) or a
  // live ref (opts.liftRef) whose .current the paint loop reads every frame.
  const liftRef = opts.liftRef || null;
  const liftStatic = opts.lift != null ? opts.lift : 0.0;
  const readLift = () => {
    const v = liftRef && typeof liftRef.current === "number" ? liftRef.current : liftStatic;
    return Math.max(0, Math.min(1, v));
  };
  gl.uniform1f(uLift, readLift());

  let W = 1, H = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width * dpr));
    H = Math.max(1, Math.floor(r.height * dpr));
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  window.addEventListener("resize", resize);
  resize();

  function onScreen() {
    if (document.hidden) return false;
    const r = canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const speed = opts.speed || 1.0;
  const phase = opts.phase || 0.0;

  let clock = 0, last = performance.now();
  const FRAME_MS = 1000 / 36;
  let acc = 0;
  let rafId = 0;
  function paint(tv) {
    gl.uniform1f(uTime, tv);
    gl.uniform1f(uW, W);
    gl.uniform1f(uH, H);
    gl.uniform1f(uLift, readLift());
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (onScreen()) {
      acc += dt * 1000;
      if (acc >= FRAME_MS) {
        clock += (acc / 1000) * speed;
        acc = 0;
        paint(clock + phase);
      }
    } else {
      acc = 0;
    }
    if (!reduce) rafId = requestAnimationFrame(frame);
  }
  paint(8.0 + phase);
  if (!reduce) rafId = requestAnimationFrame(frame);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    gl.deleteProgram(prog);
    gl.deleteBuffer(buf);
    gl.deleteTexture(tex);
  };
}

export default function GradFlowBackground({ className, style, ...opts }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const cleanup = initGradFlow(ref.current, opts);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={ref} aria-hidden="true" className={className} style={style} />;
}
