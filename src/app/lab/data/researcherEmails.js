// Lab Ops — 연구원 이메일 (비공개 오버레이).
//
// ⚠️ 이메일은 공개 members 탭(sheetsStatic)에 넣지 않는다. sheetsStatic는
// "use client"인 공개 사이트 컴포넌트가 통째로 import → 브라우저 번들에 실려
// 누구나 내려받을 수 있기 때문(개인정보 노출). 이 파일은 lab 서버 코드
// (getResearchers, /api/lab/*)에서만 import되어 공개 번들에 포함되지 않는다.
//
// 키 = 연구원 id (영문 이름 slug). People 뷰/배정에서 쓰는 id와 동일.
//   예) "Kyuha Shim, FRSA" → "kyuha-shim-frsa"
// 값 = 이메일. 미팅 일정에서 "배정 연구원 이메일 채우기"로 참석자에 자동 입력된다.
//
// 편집: 아래에 `"id": "email",` 한 줄씩 추가하면 된다. 서버만 재시작하면 반영.
export const researcherEmails = {
  "kyuha-shim-frsa": "shim.kyuha@gmail.com",
  // "chanwoo-lee": "",
  // "minseo-kang": "",
  // "hyosun-son": "",
  // …
};
