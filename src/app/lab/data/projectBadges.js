// Lab Ops — 프로젝트 뱃지 (표시용 오버레이).
//
// 키 = 프로젝트 id (prj_...). 값 = 뱃지 이모지. 기본은 왕관 👑.
// 타임라인의 프로젝트 이름 옆에 붙고, 이름표(title)에도 함께 들어간다.
//
// 편집: 아래에 `"prj_xxx": BADGE.crown, // 프로젝트명` 한 줄씩 추가하면 된다.
export const BADGE = {
  crown: "👑",
};

export const projectBadges = {
  "prj_mrhop8oj_iqgq9x": BADGE.crown, // 1. MIT Sidewalk AI
  "prj_mrhopthu_k19rmb": BADGE.crown, // 3. Resonance
  "prj_mrhoqiga_5jo85q": BADGE.crown, // 6. 현대 2D to 3D
  "prj_mrhoq8rp_zq3pmm": BADGE.crown, // 5. Hyundai GenUI
};

export function projectBadgeOf(id) {
  return projectBadges[id] || "";
}
