import { sheetsStatic } from './sheetsStatic';

// People 페이지와 Let's talk 에이전트가 같이 읽는 구성원 목록. 시트(members 탭) 위에 코드의
// 덮어쓰기를 얹는다 — 화면에 보이는 그대로를 에이전트도 안다.
const hidden = new Set(['Ji min Rhee', 'Eunseol Kim', 'Taeho Kim', 'Duksoo Choi']);
// 시트의 소속을 코드에서 덮어쓰는 오버레이. 시트 원본을 고칠 수 있게 되면 옮기고 지운다.
const recategorised = { 'Boram Lee': 'Former Advisors', 'Jiyeon Lee': 'Former Advisors', 'Yunhyeong Park': 'Former Advisors', 'Juwan Kim': 'Student Researchers' };
const categoryOf = (m) => recategorised[m[1]] || m[0];
// 시트의 약력(4번째 칸)을 코드에서 덮는 오버레이. 시트를 고칠 수 있게 되면 옮기고 지운다.
// 시트의 전문분야(3번째 칸)를 코드에서 덮는 오버레이.
export const roleOverrides = {
  'Yunhyeong Park': '', // 전문분야 표기 제외
  'Ingee Jeong': 'Visual Interaction',
};
export const bioOverrides = {
  'Changmin Kim': 'former KAIST Postdoc\nProfessor of Design, Sungkyunkwan University',
  // 학력 두 줄은 두고 현직만 교체 (HSAD AI Art Director → 삼성전자)
  'Yunhyeong Park': 'Royal College of Art MA\nInformation Experience Design\nSamsung Electronics AI Creative Director',
  'Hankak Lee': 'Royal College of Art MA\nInnovation Design Engineering\nProfessor of Industrial Design, Keimyung University',
  'Ingee Jeong': 'Royal College of Art MA\nVisual Communication\nformer Ordinary People',
};
// 시트(members 탭)에 아직 없는 자문 인력. 시트를 직접 쓸 수 있게 되면 옮기고 지운다.
// 행 구조는 시트와 동일: [분류, 이름, 사진, 전문분야, 약력, 예비]
// 전문분야·약력·사진은 아직 받지 못해 비워 둔다 — 지어내지 않는다.
const extraMembers = [
  ['Advisory Board', 'Seonbin Yun', '', 'Data-driven Design', 'Royal College of Art MA\nInformation Experience Design', ''],
  ['Advisory Board', 'Duksoo Choi', '', 'Industrial Design and Design Engineering', 'Royal College of Art MA\nInnovation Design Engineering', ''],
  ['Research Interns', 'Chaeyeon Kang', '', '', '', ''],
  ['Research Interns', 'Yerin Choi', '', '', '', ''],
];
const allMembers = [...sheetsStatic.members, ...extraMembers];
const order = ['Director', 'Advisory Board', 'Former Advisors', 'Student Researchers', 'Research Interns', 'Alumni'];
// 그룹 안의 순서를 코드에서 정하는 오버레이. 목록에 없는 사람은 원래(시트) 순서대로 뒤에 붙는다.
const memberOrder = {
  'Student Researchers': ['Juwan Kim', 'Juhae Kim', 'Hyebin Park', 'Suhyeon Cho', 'Minseo Kang', 'Sooyoun Jo', 'Hyunji Lee', 'Jiyu Shin', 'Taeeun Kim', 'Seojin Hong', 'Minjeong Joo', 'Hyosun Son', 'Hayeon Jeon', 'Sara Kang', 'Da in Kim'],
};
const rankIn = (category) => { const list = memberOrder[category] || []; return (m) => { const i = list.indexOf(m[1]); return i < 0 ? list.length : i; }; };
export const groups = order.map(category => { const rank = rankIn(category); return { category, members: allMembers.filter(m => categoryOf(m) === category && !hidden.has(m[1])).sort((a, b) => rank(a) - rank(b)) }; });
// 디렉터 약력 전문(본인 제공). 카드에는 지금처럼 짧은 이력만 두고, 버튼을 누르면 아래로 펼친다.
// 다른 약력들처럼 영문으로 둔다 — 언어 전환은 버튼 문구에만 적용한다.
export const directorBio = [
  "Kyuha Shim is a practicing designer and design leader working across AI, product experience, emerging technology, and organizational strategy. His work explores how design should shape relationships among people, artifacts, and systems, defining when technology should assist, act autonomously, or defer to human judgment.",
  "He is tenured Full Professor of Design at Korea National University of Arts and Founding Director of the Center for Creative Intelligence Design (cciD), established in 2023. He leads a multidisciplinary team of more than twenty UX researchers, design strategists, interaction and visual designers, and creative technologists, connecting advanced research with industry execution. Through cciD, he works with Samsung, Hyundai, LG, and NAVER, alongside national research programs and public-sector partners including the Seoul Metropolitan Government and Seoul Design Foundation.",
  "Shim has worked with generative systems for human experience since 2008. His practice spans next-generation user interfaces, agent-based communication, affective design engineering, AI-supported design workflows, and product strategy.",
  "Previously, he spent seven years at Carnegie Mellon University as Associate Professor of Design and Director of the Computational Creativity Lab, leading government-funded research and serving as Creative Director on industry collaborations.",
  "Earlier, he was a Research Fellow at MIT SENSEable City Lab and a designer-in-residence at Facebook now Meta. He earned an MFA at RISD (Rhode Island School of Design), where he later taught, and conducted doctoral research in Communication Design at RCA (Royal College of Art), where he also served as a Visiting Lecturer.",
  "Shim guest-edited and designed GRAPHIC #37: Introduction to Computation (2016), organized and chaired Computational Design Practices (2021) for AIGA’s Design Educators Community, and computationally designed Code as Creative Medium (2021) for MIT Press before translating it into Korean. He also co-authored Future Lab (2026) and translated Design Futuring (2026) into Korean, exploring design’s changing role and the futures it helps create.",
  "He completed an Executive MBA at Aalto University, focusing on business design and brand authenticity in the age of generative AI. His work has been exhibited at LACMA, Cooper Hewitt, SIGGRAPH, and MMCA Korea, and recognized by Adobe, AIGA, Core77, Red Dot, iF, and TDC.",
  "He builds teams that connect research, technology, and design to define product direction, create coherent experiences, and develop the organizational capabilities to deliver them.",
];
