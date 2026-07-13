"use client";

// cciD Lab — sign-in. Follows the site's editorial language (ivory field,
// Neue Haas display mark, PxGrotesk 15px body, hairline underline inputs),
// left-aligned like the public cover — not a centered admin template.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { neuehaas, pxGrotesk } from "@/fonts/fonts";

export default function LoginClient() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/lab/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        router.replace("/lab");
        return;
      }
      setError(data?.error || "아이디 또는 비밀번호가 올바르지 않습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도하세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${pxGrotesk.className} min-h-[100dvh] bg-[#F0F0EC] text-primaryB flex flex-col justify-center`}>
      <main className="w-full max-w-[22rem] px-6 lg:px-0 lg:ml-[80px]">
        <div className={`${neuehaas.className} select-none text-[#5D009C] leading-none tracking-[-0.04em] text-[4rem] mb-3`}>
          cciD
        </div>
        <p className="font-light uppercase text-[12px] tracking-[0.01em] text-[#888] mb-12">
          Research Operations — internal access
        </p>

        <form onSubmit={submit} noValidate>
          <label className="block mb-6">
            <span className="block font-light uppercase text-[12px] tracking-[0.01em] text-[#888] mb-1.5">
              ID
            </span>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className="w-full bg-transparent text-[15px] leading-[1.4] py-1.5 border-0 border-b border-primaryB/25 rounded-none focus:outline-none focus:border-primaryB transition-colors duration-200"
            />
          </label>
          <label className="block mb-10">
            <span className="block font-light uppercase text-[12px] tracking-[0.01em] text-[#888] mb-1.5">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-transparent text-[15px] leading-[1.4] py-1.5 border-0 border-b border-primaryB/25 rounded-none focus:outline-none focus:border-primaryB transition-colors duration-200"
            />
          </label>

          {error && (
            <p role="alert" className="text-[13px] leading-[1.5] text-[#9F2F2D] mb-6">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#5D009C] hover:text-[#7a1fc0] disabled:opacity-50 transition-colors py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F0F0EC]"
          >
            {busy ? "Signing in" : "Sign in"}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </form>
      </main>
    </div>
  );
}
