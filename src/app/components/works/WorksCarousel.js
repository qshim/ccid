"use client";

import * as THREE from "three";
import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Image } from "@react-three/drei";
import { easing } from "maath";
import "./bentGeometry";

// cciD center project images (3 per project).
const IMAGES = [
  "/img/2025/lg/1.png",
  "/img/2025/lg/2.png",
  "/img/2025/lg/3.png",
  "/img/2025/hy/hy1.png",
  "/img/2025/hy/hy2.png",
  "/img/2025/hy/hy3.png",
  "/img/2025/cj/co1.png",
  "/img/2025/cj/co2.png",
  "/img/2025/cj/co3.png",
  "/img/2025/mini/mi1.png",
  "/img/2025/mini/mi2.png",
  "/img/2025/mini/mi3.png",
];

// Shared hover SFX (one element, restarted on each hover).
let hoverAudio = null;
function playHoverSfx() {
  if (typeof window === "undefined") return;
  try {
    if (!hoverAudio) {
      hoverAudio = new Audio("/audio/a_hover.mp3");
      hoverAudio.volume = 0.6;
    }
    hoverAudio.currentTime = 0;
    hoverAudio.play().catch(() => {});
  } catch {}
}

const _tmpV = new THREE.Vector3();

function Card({ url, index, hoveredRef, cardRefs, position, rotation }) {
  const pointerOver = (e) => {
    e.stopPropagation();
    hoveredRef.current = index;
    playHoverSfx();
  };
  const pointerOut = () => {
    if (hoveredRef.current === index) hoveredRef.current = null;
  };
  return (
    <Image
      ref={(el) => (cardRefs.current[index] = el)}
      url={url}
      transparent
      side={THREE.DoubleSide}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      position={position}
      rotation={rotation}
    >
      {/* 16:9 card (width 1, height 9/16); negative radius bends convex toward the viewer. */}
      <bentPlaneGeometry args={[-0.1, 1, 0.5625, 20, 20]} />
    </Image>
  );
}

// Controller: lays cards out around the ring with angular spacing proportional
// to each card's (eased) scale, so the visual gaps stay even as items grow and
// shrink on hover. Positions, rotations, and scales are all eased each frame.
function Carousel({ images, radius, hoveredRef }) {
  const count = images.length;
  const cardRefs = useRef([]);
  const anglesRef = useRef(images.map((_, i) => (i / count) * Math.PI * 2));
  const scalesRef = useRef(images.map(() => 1));

  useFrame((state, delta) => {
    const cam = state.camera.position;

    // 1. Target scale per card (focused pops; others recede by depth).
    const targets = [];
    for (let i = 0; i < count; i++) {
      const m = cardRefs.current[i];
      if (!m) {
        targets.push(1);
        continue;
      }
      m.getWorldPosition(_tmpV);
      const dist = cam.distanceTo(_tmpV);
      const t = THREE.MathUtils.clamp((dist - 8.2) / 3.8, 0, 1); // 0 near, 1 far
      if (hoveredRef.current === i) targets.push(1.3);
      else if (hoveredRef.current !== null) targets.push(THREE.MathUtils.lerp(0.82, 0.42, t));
      else targets.push(THREE.MathUtils.lerp(1.0, 0.88, t));
    }

    // Frame-rate independent easing factors.
    const kScale = 1 - Math.exp(-9 * delta);
    const kAngle = 1 - Math.exp(-7 * delta);
    for (let i = 0; i < count; i++) {
      scalesRef.current[i] += (targets[i] - scalesRef.current[i]) * kScale;
    }

    // 2. Angular width ∝ scale → even edge-to-edge gaps.
    let total = 0;
    for (let i = 0; i < count; i++) total += scalesRef.current[i];
    let acc = 0;
    const targetAngles = [];
    for (let i = 0; i < count; i++) {
      const w = (scalesRef.current[i] / total) * Math.PI * 2;
      targetAngles.push(acc + w / 2);
      acc += w;
    }

    // 3. Ease each angle (shortest path) and apply the transforms.
    for (let i = 0; i < count; i++) {
      const m = cardRefs.current[i];
      if (!m) continue;
      let diff = targetAngles[i] - anglesRef.current[i];
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      anglesRef.current[i] += diff * kAngle;
      const a = anglesRef.current[i];
      m.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      m.rotation.set(0, a, 0);
      m.scale.setScalar(scalesRef.current[i]);
      if (m.material) {
        const hov = hoveredRef.current === i;
        easing.damp(m.material, "radius", hov ? 0.25 : 0.1, 0.2, delta);
        easing.damp(m.material, "zoom", hov ? 1 : 1.5, 0.2, delta);
      }
    }
  });

  return images.map((url, i) => {
    const a = (i / count) * Math.PI * 2;
    return (
      <Card
        key={i}
        index={i}
        url={url}
        hoveredRef={hoveredRef}
        cardRefs={cardRefs}
        position={[Math.sin(a) * radius, 0, Math.cos(a) * radius]}
        rotation={[0, a, 0]}
      />
    );
  });
}

function Rig({ dragRef, hoveredRef, ...props }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (dragRef.current.active) {
      ref.current.rotation.y += dragRef.current.delta * 0.005;
      dragRef.current.delta = 0;
    } else if (hoveredRef.current === null) {
      // Auto-rotate only when nothing is hovered, so the focused card holds still.
      dragRef.current.vel *= 0.92;
      ref.current.rotation.y += (0.12 + dragRef.current.vel) * delta;
    }
    state.events.update?.();
    // Camera Y follows scroll: as the carousel passes up through the viewport,
    // the vertical viewing angle shifts (looking up → level → looking down).
    const rect = state.gl.domElement.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const center = THREE.MathUtils.clamp((rect.top + rect.height / 2) / vh, 0, 1);
    const camY = THREE.MathUtils.lerp(2.6, 0.4, center);
    easing.damp3(
      state.camera.position,
      [-state.pointer.x * 2, camY, 10],
      0.3,
      delta
    );
    state.camera.lookAt(0, 0, 0);
  });
  return <group ref={ref} {...props} />;
}

export default function WorksCarousel() {
  const dragRef = useRef({ active: false, lastX: 0, delta: 0, vel: 0 });
  const hoveredRef = useRef(null);
  const onDown = (e) => {
    dragRef.current.active = true;
    dragRef.current.lastX = e.clientX;
  };
  const onMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    dragRef.current.delta += dx;
    dragRef.current.vel = dx * 0.03;
  };
  const onUp = () => {
    dragRef.current.active = false;
  };
  return (
    <div
      className="h-[58vh] lg:h-[68vh] cursor-grab active:cursor-grabbing touch-pan-y"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <Canvas
        camera={{ position: [0, 0, 100], fov: 15 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Rig rotation={[0, 0, 0.15]} dragRef={dragRef} hoveredRef={hoveredRef}>
            <Carousel images={IMAGES} radius={1.9} hoveredRef={hoveredRef} />
          </Rig>
        </Suspense>
      </Canvas>
    </div>
  );
}
