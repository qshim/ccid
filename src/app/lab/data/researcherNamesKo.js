// Lab Ops — 연구원 한글 이름 오버레이 (표시용).
//
// 로스터(sheetsStatic)의 name은 영문이라, lab 내부 화면에서 한글로 직관적으로
// 보이도록 id → 한글 이름 매핑을 둔다. 매핑이 없으면 영문 name으로 폴백한다.
// 키 = 연구원 id (영문 이름 slug). People 뷰/배정 id와 동일.
export const researcherNamesKo = {
  "kyuha-shim-frsa": "심규하",
  // Advisory Board / Former
  "taery-kim": "김태리",
  "boram-lee": "이보람",
  "jiyeon-lee": "이지연",
  "ingee-jeong": "정인지",
  "yoonha-jeong": "정윤하",
  "kiryung-nam": "남기륭",
  "yunhyeong-park": "박윤형",
  "chanwoo-lee": "이찬우",
  "taeho-kim": "김태호",
  "changmin-kim": "김창민",
  // Student Researchers / Interns
  "yunso-jung": "정윤소",
  "heeyun-sul": "설희윤",
  "yeju-chung": "정예주",
  "juhae-kim": "김주해",
  "hyebin-park": "박혜빈",
  "suhyeon-cho": "조수현",
  "sooyoun-jo": "조수연",
  "hyunji-lee": "이현지",
  "jiyu-shin": "신지유",
  "taeeun-kim": "김태은",
  "minseo-kang": "강민서",
  "seojin-hong": "홍서진",
  "hyosun-son": "손효선",
  "minjeong-joo": "주민정",
  "sara-kang": "강사라",
  "hayeon-jeon": "전하연",
  "da-in-kim": "김다인",
  "minji-park": "박민지",
  "seungju-lee": "이승주",
  "euna-jang": "장은아",
  "jiwon-park": "박지원",
  "inyoung-kim": "김인영",
  "juwan-kim": "김주완",
  "yoonseo-oh": "오윤서",
  "hyeji-jeong": "정혜지",
};

// 직급(category) 정렬 순서. 낮을수록 먼저.
export const CATEGORY_RANK = {
  Director: 0,
  "Advisory Board": 1,
  "Student Researchers": 2,
  "Research Interns": 3,
  "Former Advisors": 4,
};

export function researcherKo(r) {
  if (!r) return "";
  return researcherNamesKo[r.id] || r.name || r.id;
}
