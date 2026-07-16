// Lab Ops — 연구원 이메일 (비공개 오버레이).
//
// ⚠️ 이메일은 공개 members 탭(sheetsStatic)에 넣지 않는다. sheetsStatic는
// "use client"인 공개 사이트 컴포넌트가 통째로 import → 브라우저 번들에 실려
// 누구나 내려받을 수 있기 때문(개인정보 노출). 이 파일은 lab 서버 코드
// (getResearchers, /api/lab/*)에서만 import되어 공개 번들에 포함되지 않는다.
//
// 키 = 연구원 id (영문 이름 slug). People 뷰/배정에서 쓰는 id와 동일.
//   예) "Kyuha Shim, FRSA" → "kyuha-shim-frsa"
//   애드혹(로스터 밖) 배정 인원은 배정에 쓰인 한글 이름 문자열이 곧 id다.
// 값 = 이메일. 미팅 일정에서 "배정 연구원 이메일 채우기"로 참석자에 자동 입력된다.
//
// 편집: 아래에 `"id": "email",` 한 줄씩 추가하면 된다. 서버만 재시작하면 반영.
export const researcherEmails = {
  "kyuha-shim-frsa": "shim.kyuha@gmail.com",

  // 로스터 연구원
  "seungju-lee": "kidbee98@gmail.com",        // 이승주
  "hyebin-park": "bagaebin0@gmail.com",       // 박혜빈
  "jiwon-park": "parkgiwon050@gmail.com",     // 박지원
  "hyeji-jeong": "jhj001270@gmail.com",       // 정혜지
  "yoonseo-oh": "yunseox5@naver.com",         // 오윤서
  "juwan-kim": "j0322wk@naver.com",           // 김주완
  "euna-jang": "ajangeunajang@gmail.com",     // 장은아
  "inyoung-kim": "is3783@naver.com",          // 김인영
  "juhae-kim": "kimjuhae4652@gmail.com",      // 김주해 (Juhae Kim)
  "taeeun-kim": "kte040324@gmail.com",        // 김태은 (대체: kte4183@naver.com)
  "hyunji-lee": "llllhj0325@naver.com",       // 이현지
  "sooyoun-jo": "dus10167@naver.com",         // 조수연
  "jiyu-shin": "mystarjiyu@gmail.com",        // 신지유
  "suhyeon-cho": "chosuhyeon21@gmail.com",    // 조수현
  "seojin-hong": "hongseojin02@karts.ac.kr",  // 홍서진
  "minjeong-joo": "minjeongj267@gmail.com",   // 주민정
  "minseo-kang": "minseokang@riverplo.com",   // 강민서
  "sara-kang": "shinee2129@karts.ac.kr",      // 강사라
  "hayeon-jeon": "jhy98620@gmail.com",        // 전하연
  "da-in-kim": "daindainhiyo@gmail.com",      // 김다인
  "yunso-jung": "jungyunsoda@gmail.com",      // 정윤소
  "hyosun-son": "smj070219@naver.com",        // 손효선
  "heeyun-sul": "heeyun0301@gmail.com",       // 설희윤
  "yeju-chung": "jeongyeju0423@gmail.com",    // 정예주

  // 애드혹(로스터 밖) — 배정 id = 한글 이름
  "Eunseol Kim": "tjf3019@naver.com",         // 김은설
  "이지민": "vivajeremy02@gmail.com",

  // 신규 인원 (아직 로스터·프로젝트 배정 없음) — 배정 시 이 한글 이름으로 넣으면 매칭됨
  "채지호": "jennyjiho@gmail.com",
  "김예인": "01052865391a@gmail.com",
  "이연우": "l.yeonwu0@gmail.com",
  "이미현": "qweiopalzm@naver.com",
};
