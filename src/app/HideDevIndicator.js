"use client";

import { useEffect } from "react";

// dev 전용: Next.js DevTools 인디케이터(#devtools-indicator, 좌하단 아이콘)만
// shadow root에 스타일을 주입해 숨긴다. 에러 오버레이는 그대로 유지.
// devIndicators:false로도 안 꺼지는 Next 16의 인디케이터 대응. prod에선 no-op.
export default function HideDevIndicator() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      let injected = false;
      document.querySelectorAll("nextjs-portal").forEach((p) => {
        const sr = p.shadowRoot;
        if (!sr || sr.getElementById("__hide-dev-ind")) return;
        if (sr.getElementById("devtools-indicator")) {
          const s = document.createElement("style");
          s.id = "__hide-dev-ind";
          s.textContent = "#devtools-indicator{display:none!important}";
          sr.appendChild(s);
          injected = true;
        }
      });
      if (injected || tries > 20) clearInterval(iv);
    }, 300);
    return () => clearInterval(iv);
  }, []);
  return null;
}
