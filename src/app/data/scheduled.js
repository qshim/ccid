import 'server-only';

// 공개 시점이 정해진 프로젝트. 서버에서만 읽는다.
//
// 프로젝트 목록을 그리는 컴포넌트는 모두 클라이언트 컴포넌트라, research.js 에
// 넣으면 공개일 전에도 JS 번들에 과제명이 그대로 실린다(화면에서 숨겨도 소스에서
// 보인다). 그래서 여기 따로 두고, 페이지(서버)가 렌더할 때 날짜가 지난 것만 골라
// props 로 넘긴다. 'server-only' 는 클라이언트에서 이 파일을 가져오면 빌드를 멈춘다.
//
// 날짜는 KST 로 적는다. 서버는 UTC 로 돈다.
// 지금 예약된 항목은 없다. 넣는 법:
// { visibleFrom: '2026-10-27T00:00:00+09:00', id, year, client, clientKo, title, titleKo, themes, description }
// (삼성전자 VD AI TV Flexible UI 는 예약일 전에 공개로 앞당겨 research.js 로 옮겼다.)
const SCHEDULED = [];

export function visibleScheduled(now = Date.now()) {
  return SCHEDULED
    .filter(p => now >= Date.parse(p.visibleFrom))
    .map(({ visibleFrom, ...project }) => project);
}
