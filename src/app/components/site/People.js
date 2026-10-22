"use client";
import { useState } from 'react';
import Image from 'next/image';
import { sheetsStatic } from '@/app/data/sheetsStatic';
import { resolvePhoto } from '@/app/components/members';
import { useSiteLanguage, Arrow } from './SiteShell';
const hidden = new Set(['Ji min Rhee', 'Eunseol Kim', 'Taeho Kim', 'Duksoo Choi']);
// 시트의 소속을 코드에서 덮어쓰는 오버레이. 시트 원본을 고칠 수 있게 되면 옮기고 지운다.
const recategorised = { 'Boram Lee': 'Former Advisors', 'Jiyeon Lee': 'Former Advisors', 'Yunhyeong Park': 'Former Advisors', 'Juwan Kim': 'Student Researchers' };
const categoryOf = (m) => recategorised[m[1]] || m[0];
// 시트의 약력(4번째 칸)을 코드에서 덮는 오버레이. 시트를 고칠 수 있게 되면 옮기고 지운다.
// 시트의 전문분야(3번째 칸)를 코드에서 덮는 오버레이.
const roleOverrides = {
  'Yunhyeong Park': '', // 전문분야 표기 제외
  'Ingee Jeong': 'Visual Interaction',
};
const bioOverrides = {
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
const groups = order.map(category => { const rank = rankIn(category); return { category, members: allMembers.filter(m => categoryOf(m) === category && !hidden.has(m[1])).sort((a, b) => rank(a) - rank(b)) }; });
// 디렉터 약력 전문(본인 제공). 카드에는 지금처럼 짧은 이력만 두고, 버튼을 누르면 아래로 펼친다.
// 다른 약력들처럼 영문으로 둔다 — 언어 전환은 버튼 문구에만 적용한다.
const directorBio = [
  "Kyuha Shim is a practicing designer and design leader working across AI, product experience, emerging technology, and organizational strategy. His work explores how design should shape relationships among people, artifacts, and systems, defining when technology should assist, act autonomously, or defer to human judgment.",
  "He is tenured Full Professor of Design at Korea National University of Arts and Founding Director of the Center for Creative Intelligence Design (cciD), established in 2023. He leads a multidisciplinary team of more than twenty UX researchers, design strategists, interaction and visual designers, and creative technologists, connecting advanced research with industry execution. Through cciD, he works with Samsung, Hyundai, LG, and NAVER, alongside national research programs and public-sector partners including the Seoul Metropolitan Government and Seoul Design Foundation.",
  "Shim has worked with generative systems for human experience since 2008. His practice spans next-generation user interfaces, agent-based communication, affective design engineering, AI-supported design workflows, and product strategy.",
  "Previously, he spent seven years at Carnegie Mellon University as Associate Professor of Design and Director of the Computational Creativity Lab, leading government-funded research and serving as Creative Director on industry collaborations.",
  "Earlier, he was a Research Fellow at MIT SENSEable City Lab and a designer-in-residence at Facebook now Meta. He earned an MFA at RISD (Rhode Island School of Design), where he later taught, and conducted doctoral research in Communication Design at RCA (Royal College of Art), where he also served as a Visiting Lecturer.",
  "Shim guest-edited and designed GRAPHIC #37: Introduction to Computation (2016), organized and chaired Computational Design Practices (2021) for AIGA’s Design Educators Community, and computationally designed Code as Creative Medium (2021) for MIT Press before translating it into Korean. He also co-authored Future Lab (2026) and translated Design Futuring (2026) into Korean, exploring design’s changing role and the futures it helps create.",
  "He completed an Executive MBA at Aalto University, focusing on business design and brand authenticity in the age of generative AI. His work has been exhibited at LACMA, Cooper Hewitt, SIGGRAPH, and MMCA Korea, and recognized by Adobe, AIGA, Core77, Red Dot, iF, and TDC.",
  "He builds teams that connect research, technology, and design to define product direction, create coherent experiences, and develop the organizational capabilities to deliver them.",
];

function MoreBio({ paragraphs, ko }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="person-more" aria-expanded={open} aria-controls="director-bio" onClick={() => setOpen(v => !v)}>
      {ko ? (open ? '약력 접기' : '약력 더 보기') : (open ? 'Close' : 'Full biography')}
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
    </button>
    {/* 닫혀 있을 때는 inert — 화면 낭독기와 탭 이동이 접힌 글을 건너뛴다. */}
    <div id="director-bio" className={`person-more-panel${open ? ' is-open' : ''}`} inert={!open || undefined}>
      <div>{paragraphs.map((t, i) => <p key={i}>{t}</p>)}</div>
    </div>
  </>;
}

function Portrait({ member, more, ko }) {
  const [, name, source, rawRole, rawBio] = member;
  const role = roleOverrides[name] ?? rawRole;
  const bio = bioOverrides[name] ?? rawBio;
  const image = resolvePhoto(name, source);
  // 사진마다 얼굴 크기·위치가 달라, 파일명을 키로 개별 보정값(확대율·크롭 중심)을
  // CSS에서 찾아 쓴다. 값은 얼굴 검출로 계산했다 — portraits.css 참고.
  const portrait = image.startsWith("/") ? image.split("/").pop().replace(/\.[^.]+$/, "") : "";
  return <article className="person"><div className="person-image" data-portrait={portrait || undefined}>{image && <Image unoptimized={!image.startsWith('/')} src={image} sizes="(max-width: 760px) 45vw, 25vw" alt={name} loading="lazy" width="360" height="430" onError={e => { e.currentTarget.style.display = 'none'; }} />}<span className="person-initials" aria-hidden="true">{name.split(' ').map(w => w[0]).slice(0,2).join('')}</span></div><h3>{name}</h3>{role && <p>{role}</p>}{bio && <p className="person-bio">{bio.replace(/formerly\s*\n/i, '').replace(/\.\s(?=[A-Z])/g, ', ')}</p>}{more && <MoreBio paragraphs={more} ko={ko} />}</article>;
}
export default function People() {
  const { lang } = useSiteLanguage(); const ko = lang === 'ko';
  return <main id="main" className="people-page site-section"><div className="page-topline eyebrow">Many perspectives. Shared curiosity.</div><h1 className="sr-only">People</h1>{groups.map(group => group.members.length ? <section key={group.category} className={`people-group group-${group.category.toLowerCase().replace(/\s+/g, '-')} ${group.category === 'Director' ? 'director-group' : ''}`}><div className="people-group-label"><h2>{group.category}</h2></div><div className="people-grid">{group.members.map(m => <Portrait key={m[1]} member={m} ko={ko} more={m[1] === 'Kyuha Shim, FRSA' ? directorBio : null}/>)}</div></section> : null)}<section className="join-section"><span className="eyebrow">Join the inquiry</span><h2>{ko ? '새로운 관점을 기다립니다.' : 'We’re curious about your perspective.'}</h2><p>{ko ? 'cciD의 인턴십과 참여 기회를 안내합니다.' : 'Explore information about internships and opportunities at cciD.'}</p><a href="https://ccid-26-summer.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-link">{ko ? '참여 및 채용 안내' : 'Opportunities at cciD'}<Arrow diagonal /></a></section></main>;
}
