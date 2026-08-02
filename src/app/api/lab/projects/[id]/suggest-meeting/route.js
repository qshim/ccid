// Lab Ops — draft a meeting proposal (purpose + agenda) for a project.
// Uses the project's context (notes, upcoming/past events, comm log) to write
// a Korean meeting purpose via OpenAI when OPENAI_API_KEY is set, falling back
// to a rule-based template otherwise. The draft is NOT saved — the client puts
// it into the new-schedule form for the user to confirm/edit, and only the
// normal event save creates the Calendar event + Meet link.

import { NextResponse } from "next/server";
import { getDoc } from "@/app/lab/lib/store";
import { getSession, denyProjectWrite } from "@/app/lab/lib/authz";
import { formatSeoul } from "@/app/lab/lib/tz";

export const dynamic = "force-dynamic";

// Sheets 브리지(Apps Script) 왕복이 5~10초, 쓰기는 뷰 재생성까지 더 걸린다.
// Vercel 기본 10초 제한에 걸려 504가 나므로 여유를 준다.
export const maxDuration = 60;

function fallbackDraft(project, upcoming) {
  const next = upcoming[0];
  const agenda = [
    "지난 주 진행 상황 공유 (팀별 3분)",
    next ? `다가오는 일정 점검 — ${next.title}` : "다음 마일스톤 정의",
    "블로커 및 리소스 논의",
    "다음 주 목표 확정",
  ];
  return {
    title: `${project.shortName || project.title} 주간 미팅`,
    purpose: `${project.title} 진행 점검 미팅입니다.\n\n안건:\n${agenda.map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
    durationMin: 60,
  };
}

async function openaiDraft(project, upcoming, past, apiKey) {
  const ctx = {
    title: project.title,
    status: project.status,
    period: `${String(project.startDate).slice(0, 10)} ~ ${String(project.endDate).slice(0, 10)}`,
    notes: String(project.notes || "").slice(0, 1500),
    description: String(project.description || "").slice(0, 500),
    upcoming: upcoming.slice(0, 6).map((e) => `${formatSeoul(e.start)} ${e.title}`),
    recentPast: past.slice(-4).map((e) => `${formatSeoul(e.start)} ${e.title}`),
    commLog: (project.commLog || []).slice(-5).map((c) => `${c.at} [${c.channel}] ${c.note}`),
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "너는 디자인 연구실(cciD)의 리서치 오퍼레이션 어시스턴트다. 프로젝트 컨텍스트를 보고 다음 미팅의 목적과 안건을 제안한다. 반드시 JSON으로만 응답: {\"title\": \"미팅 제목(간결, 한국어)\", \"purpose\": \"미팅 목적 1-2문장 + 빈 줄 + '안건:' 아래 번호 목록 3-5개 (모두 한국어)\", \"durationMin\": 30|60|90}. 노트에 미팅 운영 룰이 있으면 반영한다(예: 자료 사전 공유 마감). 실제 컨텍스트에 근거한 구체적 안건을 쓰고, 뻔한 일반론은 피한다.",
        },
        { role: "user", content: JSON.stringify(ctx) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  if (!parsed.title || !parsed.purpose) throw new Error("openai: 불완전한 응답");
  return {
    title: String(parsed.title),
    purpose: String(parsed.purpose),
    durationMin: [30, 60, 90].includes(Number(parsed.durationMin)) ? Number(parsed.durationMin) : 60,
  };
}

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);

  try {
    const doc = await getDoc();
    const project = (doc.projects || []).find((p) => p.id === id && !p.deletedAt);
    if (!project) {
      return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    const deny = denyProjectWrite(session, project);
    if (deny) return NextResponse.json({ ok: false, error: deny.error }, { status: deny.status });

    const nowIso = new Date().toISOString();
    const projectEvents = (doc.events || [])
      .filter((e) => e.projectId === id)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const upcoming = projectEvents.filter((e) => (e.end || e.start) >= nowIso);
    const past = projectEvents.filter((e) => (e.end || e.start) < nowIso);

    let draft;
    let source = "template";
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        draft = await openaiDraft(project, upcoming, past, apiKey);
        source = "ai";
      } catch {
        draft = fallbackDraft(project, upcoming);
      }
    } else {
      draft = fallbackDraft(project, upcoming);
    }

    return NextResponse.json({ ok: true, draft, source });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "미팅 제안 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
