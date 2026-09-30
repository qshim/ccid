"use client";
import Image from 'next/image';
import { sheetsStatic } from '@/app/data/sheetsStatic';
import { resolvePhoto } from '@/app/components/members';
import { useSiteLanguage, Arrow } from './SiteShell';
const hidden = new Set(['Ji min Rhee', 'Eunseol Kim', 'Taeho Kim']);
// 시트의 소속을 코드에서 덮어쓰는 오버레이. 시트 원본을 고칠 수 있게 되면 옮기고 지운다.
const recategorised = { 'Boram Lee': 'Former Advisors', 'Jiyeon Lee': 'Former Advisors', 'Yunhyeong Park': 'Former Advisors' };
const categoryOf = (m) => recategorised[m[1]] || m[0];
// 시트의 약력(4번째 칸)을 코드에서 덮는 오버레이. 시트를 고칠 수 있게 되면 옮기고 지운다.
// 시트의 전문분야(3번째 칸)를 코드에서 덮는 오버레이.
const roleOverrides = {
  'Chanwoo Lee': 'Physical Computing and Hardware Prototyping',
  'Yunhyeong Park': '', // 전문분야 표기 제외
  'Ingee Jeong': 'Visual Interaction',
};
const bioOverrides = {
  'Changmin Kim': 'former KAIST PostDoc\nprofessor of Design, Sungkyunkwan University',
  // 학력 두 줄은 두고 현직만 교체 (HSAD AI Art Director → 삼성전자)
  'Yunhyeong Park': 'Royal College of Art MA\nInformation Experience Design\nSamsung Electronics AI Creative Director',
  'Hankak Lee': 'Royal College of Art MA\nInnovation Design Engineering\nprofessor of Industrial Design, Keimyung University',
  'Ingee Jeong': 'Royal College of Art MA\nVisual Communication\nformer Ordinary People',
};
// 시트(members 탭)에 아직 없는 자문 인력. 시트를 직접 쓸 수 있게 되면 옮기고 지운다.
// 행 구조는 시트와 동일: [분류, 이름, 사진, 전문분야, 약력, 예비]
// 전문분야·약력·사진은 아직 받지 못해 비워 둔다 — 지어내지 않는다.
const extraMembers = [
  ['Advisory Board', 'Seonbin Yun', '', 'Data-driven Design', 'Royal College of Art MA\nInformation Experience Design', ''],
  ['Advisory Board', 'Taeheon Lee', '', 'Immersive Media Art', 'Royal College of Art MA\nDigital Direction', ''],
  ['Advisory Board', 'Duksoo Choi', '', 'Industrial Design and Design Engineering', 'Royal College of Art MA\nInnovation Design Engineering', ''],
];
const allMembers = [...sheetsStatic.members, ...extraMembers];
const order = ['Director', 'Advisory Board', 'Former Advisors', 'Student Researchers', 'Research Interns', 'Alumni'];
const groups = order.map(category => ({ category, members: allMembers.filter(m => categoryOf(m) === category && !hidden.has(m[1])) }));
function Portrait({ member }) {
  const [, name, source, rawRole, rawBio] = member;
  const role = roleOverrides[name] ?? rawRole;
  const bio = bioOverrides[name] ?? rawBio;
  const image = resolvePhoto(name, source);
  // 사진마다 얼굴 크기·위치가 달라, 파일명을 키로 개별 보정값(확대율·크롭 중심)을
  // CSS에서 찾아 쓴다. 값은 얼굴 검출로 계산했다 — portraits.css 참고.
  const portrait = image.startsWith("/") ? image.split("/").pop().replace(/\.[^.]+$/, "") : "";
  return <article className="person"><div className="person-image" data-portrait={portrait || undefined}>{image && <Image unoptimized={!image.startsWith('/')} src={image} sizes="(max-width: 760px) 45vw, 25vw" alt={name} loading="lazy" width="360" height="430" onError={e => { e.currentTarget.style.display = 'none'; }} />}<span className="person-initials" aria-hidden="true">{name.split(' ').map(w => w[0]).slice(0,2).join('')}</span></div><h3>{name}</h3>{role && <p>{role}</p>}{bio && <p className="person-bio">{bio.replace(/formerly\s*\n/i, '').replace(/\.\s(?=[A-Z])/g, ', ')}</p>}</article>;
}
export default function People() {
  const { lang } = useSiteLanguage(); const ko = lang === 'ko';
  return <main id="main" className="people-page site-section"><div className="page-topline eyebrow">Many perspectives. Shared curiosity.</div><h1>People<span className="heading-period">.</span></h1><div className="archive-intro"><p>{ko ? <>다른 시선으로,<br />함께 묻습니다.</> : <>Different perspectives.<br />A shared inquiry.</>}</p><div>{ko ? '디자이너, 리서처, 개발자가 함께합니다. 서로 다른 경험과 전문성이 만나 질문의 깊이와 가능성을 넓힙니다.' : 'Designers, researchers, and developers working together. Different experiences and expertise deepen our questions and broaden the possibilities.'}</div></div>{groups.map(group => group.members.length ? <section key={group.category} className={`people-group group-${group.category.toLowerCase().replace(/\s+/g, '-')} ${group.category === 'Director' ? 'director-group' : ''}`}><div className="people-group-label"><h2>{group.category}</h2><span className="micro">{String(group.members.length).padStart(2,'0')}</span></div><div className="people-grid">{group.members.map(m => <Portrait key={m[1]} member={m}/>)}</div></section> : null)}<section className="join-section"><span className="eyebrow">Join the inquiry</span><h2>{ko ? '당신의 관점이 궁금합니다.' : 'We’re curious about your perspective.'}</h2><p>{ko ? 'cciD의 인턴십과 참여 기회에 관한 안내를 확인하세요.' : 'Explore information about internships and opportunities at cciD.'}</p><a href="https://ccid-26-summer.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-link">{ko ? '참여 및 채용 안내' : 'Opportunities at cciD'}<Arrow diagonal /></a></section></main>;
}
