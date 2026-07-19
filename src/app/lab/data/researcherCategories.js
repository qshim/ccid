// Lab Ops — 피플 뷰 기능 카테고리 분류 (표시용 오버레이).
//
// 키 = person.id (로스터는 영문 slug, 애드혹은 배정에 쓰인 이름 문자열).
// 값 = 카테고리 배열. 한 사람이 여러 카테고리에 속할 수 있음(복수).
// 색: 기획=파랑 · 시각=빨강 · 기술=보라 · 제품=노랑 · 연구=녹색.
// 복수 카테고리는 좌측 이름 셀에 가로 그라디언트로 표시.
export const CATEGORY_META = {
  기획: "#2563EB",
  시각: "#DC2626",
  기술: "#7C3AED",
  제품: "#CA8A04",
  연구: "#16A34A",
};
export const CATEGORY_ORDER = ["기획", "시각", "기술", "제품", "연구"];

export const researcherCategories = {
  // 기획 + 시각
  "minseo-kang": ["기획", "시각"], // 강민서
  "minjeong-joo": ["기획", "시각"], // 주민정
  "seojin-hong": ["기획", "시각"], // 홍서진
  // 기획 + 시각 + 기술
  "hyunji-lee": ["기획", "시각", "기술"], // 이현지
  // 기획
  "윤지민": ["기획"],
  "seungju-lee": ["기획"], // 이승주
  "이채영": ["기획"],
  // 시각
  "sara-kang": ["시각"], // 강사라
  "강채연": ["시각"],
  "Eunseol Kim": ["시각"], // 김은설
  "juhae-kim": ["시각"], // 김주해
  "taeeun-kim": ["시각"], // 김태은
  "hyebin-park": ["시각"], // 박혜빈
  "hayeon-jeon": ["시각"], // 전하연
  // 시각 + 기술
  "juwan-kim": ["시각", "기술"], // 김주완
  "sooyoun-jo": ["시각", "기술"], // 조수연
  // 기술
  "heeyun-sul": ["기술"], // 설희윤
  "jiyu-shin": ["기술"], // 신지유
  "이지민": ["기술"],
  "yunso-jung": ["기술"], // 정윤소
  // 기술 + 제품
  "박현우": ["기술", "제품"],
  "조건우": ["기술", "제품"],
  // 제품
  "yeju-chung": ["제품"], // 정예주
  // 미분류: 선은설, hyosun-son(손효선), 함도원
};

// 좌측 이름 셀 배경(background-image). 1개=단색 틴트, 복수=가로 그라디언트.
// bg-[#FBFBF8] 위에 얹혀 불투명 유지. 미분류는 null.
export function categoryRowBg(id, alpha = "33") {
  const cats = CATEGORY_ORDER.filter((c) => (researcherCategories[id] || []).includes(c));
  if (!cats.length) return null;
  if (cats.length === 1) {
    const c = CATEGORY_META[cats[0]] + alpha;
    return `linear-gradient(90deg, ${c}, ${c})`;
  }
  const stops = cats
    .map((c, i) => `${CATEGORY_META[c]}${alpha} ${Math.round((i / (cats.length - 1)) * 100)}%`)
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
}
