# cciD Lab — Research Operations (`/lab`)

연구 책임자 전용 비공개 운영 페이지. 공개 사이트와 동일한 디자인 시스템(아이보리 `#F0F0EC`,
PxGrotesk/Neue Haas, 헤어라인 언더라인 폼, 퍼플 `#4E22D6/#5D009C` 액센트) 위에
프로젝트·일정·연구원 배정·타임라인·Google Calendar/Meet 연동을 제공한다.

## 기능 개요

- **인증**: 단일 관리자(env 기반), HMAC 서명 httpOnly 세션 쿠키(7일), IP당 로그인
  시도 제한(10분 5회), `src/proxy.js`가 `/lab`·`/api/lab` 전체를 서버측에서 차단.
- **연구원**: 공개 People 페이지와 동일 소스(`sheetsStatic.members`) — 중복 관리 없음.
  시트 갱신(`node scripts/generate_sheets_static_data.mjs`) 시 자동 반영.
- **프로젝트**: 생성/수정/아카이브(soft delete → 아카이브 후 재삭제 시 완전 삭제),
  status/visibility/기간/진행률/컬러/연구원 배정(역할 포함)/메모.
- **타임라인**: 커스텀 구현(외부 라이브러리 없음). Month/Week/Day 줌(px-per-day 실변화),
  sticky 프로젝트 칼럼+날짜 헤더, 오늘선, 주말 음영, 월 경계, 겹침 일정 lane 스태킹,
  마일스톤 다이아몬드, 유형별 색+3글자 태그(색상 단독 의존 없음), 클릭 기반 편집.
- **일정**: 유형 13종, KST 입력 → UTC 저장(Asia/Seoul 명시 변환), 검증(종료<시작 차단),
  담당 연구원/참석자/장소/메모.
- **Google Calendar/Meet**: OAuth(서버 전용), 내부 저장 후 비차단 단방향 동기화
  (내부 → Google), Meet은 conferenceData로 생성, 실패 시 `syncStatus=error` + 재시도
  버튼 — **동기화 실패로 내부 데이터가 유실되지 않음**.
- **활동 기록**: 생성/수정/배정/동기화/상태 변경 로그(프로젝트 드로어에 표시).
- **모바일**: 타임라인 대신 프로젝트+예정 일정 요약 리스트(조회 중심).

## 로컬 실행

```bash
cp .env.example .env.local   # 값 채우기 (아래 참조)
npm run dev                  # http://localhost:3000/lab
```

## 환경변수 (.env.local / Vercel Project Settings)

| 변수 | 필수 | 설명 |
|---|---|---|
| `ADMIN_LOGIN_ID` | ✅ | 관리자 ID (초기 검수용 기본값 `cciD` — 운영 배포 전 변경) |
| `ADMIN_LOGIN_PASSWORD` | ✅ | 관리자 비밀번호 (동일 — 운영 배포 전 강한 값으로 변경) |
| `SESSION_SECRET` | ✅ | 세션 서명 키. `openssl rand -hex 32` 로 생성 |
| `LAB_DATA_BACKEND` | | `json`(기본, 로컬 파일) 또는 `sheets`(운영 권장) |
| `SHEETS_BRIDGE_URL` | sheets 시 | 기존 Apps Script /exec URL |
| `SHEETS_BRIDGE_SECRET` | sheets 시 | 기존 브리지 시크릿 |
| `GOOGLE_CLIENT_ID` | Google 연동 시 | OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google 연동 시 | OAuth 클라이언트 시크릿 (서버 전용) |
| `GOOGLE_REDIRECT_URI` | Google 연동 시 | `https://c-c-i-d.kr/api/lab/google/callback` |

클라이언트 공개 접두사(`NEXT_PUBLIC_` 등)는 사용하지 않는다. ID/비밀번호 비교와 토큰
저장은 전부 서버에서 수행되며, 클라이언트 번들에 포함되지 않는다(빌드 grep으로 확인됨).

### 관리자 계정 변경 방법

`.env.local`(또는 Vercel env)의 `ADMIN_LOGIN_ID` / `ADMIN_LOGIN_PASSWORD` 값을 바꾸고
재배포하면 즉시 적용된다. 코드 수정 불필요.

## 데이터 저장

버전 필드가 있는 단일 JSON 문서(낙관적 동시성, 충돌 시 자동 재시도)를
`src/app/lab/lib/store.js` 가 관리한다.

- **json 백엔드**(기본): `.labops-data/labops.json` (gitignore). 로컬/자체 호스팅에서
  실영속. **Vercel 서버리스에서는 영속되지 않음** — 운영에서는 sheets 백엔드 사용.
- **sheets 백엔드**: 스프레드시트의 **사람이 읽고 편집하는 행 기반 탭**에 저장.
  - `ops_projects` — 행=프로젝트. members 셀은 `yeju-chung: UX; heeyun-sul: Proto` 형식으로
    시트에서 직접 고칠 수 있고, /lab 새로고침에 반영된다(양방향).
  - `ops_events` — 행=일정(담당 연구원은 쉼표 구분 id, 불리언 TRUE/FALSE, 날짜 ISO).
  - `ops_activity` — 활동 로그(추가 전용, 전체 히스토리는 시트에 남음).
  - `ops_settings` — Google 토큰 등(숨김 탭, 앱 전용).
  - **자동 생성 뷰**: `People` 탭(항상 맨 왼쪽 — 연구원별 참여 현황, 프로젝트 태그가
    프로젝트 컬러로 색칠, 참여 중이면 OCCUPIED) + **프로젝트별 탭**(탭 색=프로젝트
    컬러, 개요·트랙별 멤버·일정). /lab 저장 시 자동 갱신, 수동 갱신은
    `POST /api/lab/sheets/rebuild`. 연구원 명단은 앱이 매 요청에 전달하므로 ops
    시트는 콘텐츠 시트와 **별도 문서·별도 계정(hello.ccid@gmail.com 권장)** 이어도 된다.
  /lab에서의 저장은 diff로 계산돼 바뀐 행만 append/update/delete 되고, 탭·헤더는
  스크립트가 자동 생성·복구한다. 설치:
  1. `google-apps-script/labops-bridge-extension.gs` 전체를 기존 Apps Script에 붙여넣어
     doPost를 교체(기존 `SECRET` 줄만 유지 — 기존 read/write 액션도 포함돼 있음)
  2. 배포 → 배포 관리 → 기존 웹앱 버전 갱신(URL 유지)
  3. env: `LAB_DATA_BACKEND=sheets` + `SHEETS_BRIDGE_URL/SECRET`

마이그레이션: json → sheets 전환 시 기존 로컬 데이터가 있으면 /lab에서 다시 입력하거나,
일시적으로 두 백엔드를 오가며 옮긴다(행 수가 적어 수동 이전이 가장 안전).

## Google Cloud Console 설정

1. https://console.cloud.google.com → 프로젝트 생성(또는 기존)
2. **APIs & Services → Library → Google Calendar API → Enable**
3. **OAuth consent screen**: External(또는 Internal), scope에
   `calendar.events`, `calendar.readonly` 추가. 테스트 사용자에 연구실 계정 추가.
4. **Credentials → Create OAuth client ID → Web application**
   - Authorized redirect URIs: `https://c-c-i-d.kr/api/lab/google/callback`
     (로컬 테스트: `http://localhost:3000/api/lab/google/callback`)
5. 발급된 Client ID/Secret 을 env에 설정.
6. /lab 상단 "Google Calendar 연결" → **hello.ccid@gmail.com 으로 로그인·동의**
   (팀 공지·초대가 팀 계정 명의로 나감) → refresh token이 데이터 스토어 settings에
   서버 저장됨.

**Google Meet 생성 방식**: 일정 저장 시 `wantMeet` 이면 Calendar 이벤트 생성 요청에
`conferenceData.createRequest(hangoutsMeet)` 를 포함해 Meet 링크를 함께 생성한다.
링크는 이벤트 드로어(복사/열기)와 타임라인 블록(⌁)에 표시된다.

## 배포 시 주의사항

- Vercel env에 최소 `ADMIN_LOGIN_ID/PASSWORD/SESSION_SECRET` 설정 전에는 /lab 로그인이
  503(설정 미완료)을 반환한다. **공개 사이트는 영향 없음.**
- 운영에서는 `LAB_DATA_BACKEND=sheets` 필수(json은 서버리스에서 휘발).
- `src/proxy.js` 는 기존 공개 API CORS 로직을 그대로 포함한다(기존 루트
  `middleware.js` 는 src/ 구조에서 로드되지 않는 죽은 코드였음 → src로 이전·병합).
- 세션 쿠키: httpOnly, sameSite=lax, 운영에서 secure.

## 알려진 제한사항

- 로그인 rate limit은 인메모리(서버리스 인스턴스별 best-effort).
- json 백엔드는 Vercel에서 비영속(위 참조).
- 타임라인 가상화 없음 — 연구실 규모(수십 프로젝트)에는 충분, 수백 행이면 가상화 필요.
- 드래그 이동/리사이즈 미구현(클릭 편집 우선) — 데이터 흐름은 그대로 두고 블록에
  pointer 핸들러만 추가하면 확장 가능.
- 반복 일정(recurrence)은 필드만 저장, 전개/동기화 미구현.
- researcher/viewer 역할은 데이터 구조상 여지만 있고 UI/계정 없음(단일 관리자).

## 향후: 양방향 캘린더 동기화 확장 방법

1. 이벤트에 Google `etag`/`updated` 저장(현재 id만 저장) →
2. `attemptEventSync` 에서 PATCH 전 etag 비교(If-Match)로 외부 수정 감지 →
3. 주기 폴링(또는 Calendar push channel webhook → `/api/lab/google/webhook`)으로
   외부 변경을 가져와 `syncStatus=conflict` 마킹 →
4. 드로어에 "내부 우선/Google 우선" 해소 UI 추가.
내부 저장과 동기화 상태가 이미 분리돼 있어 구조 변경 없이 위 단계만 얹으면 된다.

## 테스트 결과 (2026-07-12, 로컬 검증)

| 항목 | 결과 |
|---|---|
| 미인증 `/lab` → `/lab/login` 리다이렉트 | ✅ 307 |
| 미인증/위조 쿠키 `/api/lab/*` | ✅ 401 |
| 로그인 성공 → httpOnly 쿠키 | ✅ |
| 로그인 실패 메시지 통합 | ✅ "아이디 또는 비밀번호가 올바르지 않습니다." |
| 로그인 6회 실패 | ✅ 6번째 429 |
| 로그아웃 후 API | ✅ 401 |
| 프로젝트 생성/수정(연구원 배정 포함) | ✅ |
| 일정 생성(meeting/milestone/deadline)/검증(종료<시작) | ✅ / ✅ 400 |
| Google 미설정 시 일정 저장 유지 + syncStatus=error | ✅ (데이터 유실 없음) |
| KST↔UTC 변환 (01:00Z → 10:00 AM 표시) | ✅ |
| 타임라인 렌더(오늘선/주말/월경계/lane/줌) | ✅ 스크린샷 확인 |
| 프로덕션 빌드 | ✅ 전 라우트 등록, `/` 정적 유지 |
| 클라이언트 번들 내 시크릿 | ✅ 없음 |
| 공개 사이트(/, /api/hiring CORS) | ✅ 무영향 |
| Google OAuth 실연동 | ⏳ 자격증명 필요(코드 완성, 문서 참조) |
