// Lab Ops — 성실 근무 뱃지 (표시용 오버레이).
//
// 키 = 연구원 id (로스터는 영문 slug, 애드혹은 배정에 쓰인 이름 문자열).
// 값 = 뱃지 이모지. 기본은 왕관 👑.
// 아바타 우상단에 작게 얹히고, 이름표(툴팁)에도 함께 표시된다.
//
// 편집: 아래에 `"id": BADGE.crown,` 한 줄씩 추가하면 된다.
export const BADGE = {
  crown: "👑", // 성실 근무
};

export const researcherBadges = {
  "juwan-kim": BADGE.crown, // 김주완
  "kiryung-nam": BADGE.crown, // 남기륭 선생님
  "윤선빈 선생님": BADGE.crown,
  "박현우": BADGE.crown,
  "함도원": BADGE.crown,
};

export function badgeOf(id) {
  return researcherBadges[id] || "";
}
