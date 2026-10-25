import 'server-only';
import { themes, withScheduled } from '@/app/data/research';
import { visibleScheduled } from '@/app/data/scheduled';
import { groups, directorBio, roleOverrides, bioOverrides } from '@/app/data/people';

// Let's talk 에이전트가 아는 것 — 사이트에 이미 공개된 내용만. 연구 테마·프로젝트·구성원은
// 사이트가 그리는 데이터를 그대로 읽어 만들고, 화면 문구(소개·연락처)는 Home.js 와 SiteShell.js
// 의 푸터에서 옮겨 적었다. 그쪽 문구를 바꾸면 여기도 같이 고친다.
// 연구원 개인 연락처·비공개 일정은 들어가지 않는다(/lab 데이터는 읽지 않는다).

const ABOUT = `
## cciD
- Name: cciD, Center for Creative Intelligence Design. Founded in 2023 at Korea National University of Arts (한국예술종합학교).
- Website: c-c-i-d.kr
- Founding Director: Kyuha Shim (심규하), FRSA, tenured Full Professor of Design at Korea National University of Arts. Full biography under People.
- KO headline: 컴퓨테이셔널 디자인을 사람의 경험으로. 리서치로 방향을 정하고, 내일을 디자인합니다.
- EN headline: From computational design to human experience. Research sets the direction. Design builds tomorrow.
- KO: cciD는 컴퓨테이셔널 디자인과 생성형 AI를 바탕으로 사용자 경험을 연구하고 디자인하는 인간 중심의 디자인 센터입니다. 제품과 브랜드 안에서 만들 수 있는 새로운 가능성을 찾고, 설계하고, 구현합니다.
- EN: cciD is a human-centered design center that researches and designs user experience through computational design and generative AI. We find, design, and build new possibilities within products and brands.
- KO: cciD는 사용자 리서치, 생성형 AI, 인터랙션 디자인을 하나의 과정으로 잇습니다. 기술이 제품과 브랜드 안에서 어떤 경험이 되어야 하는지 정의하고, 그 경험을 직접 구현합니다. 삼성전자와는 차세대 UI와 감성 UX를, 현대자동차그룹과는 AI를 내재화한 디자인 프로세스를, LG전자와는 브랜드의 AI 비전을 공간 경험으로 다뤘습니다. cciD는 CMU의 Computational Design Thinking과 MIT의 Demo or Die를 하나로 잇습니다.
- EN: cciD brings user research, generative AI, and interaction design into a single process. We define the experience technology should create within products and brands, then build it ourselves. Our work spans next-generation UI and emotional UX with Samsung Electronics, AI-integrated in-house design processes with Hyundai Motor Group, and spatial AI brand experiences with LG Electronics. cciD brings together Carnegie Mellon's Computational Design Thinking and MIT's Demo or Die.
- How we work: Research, Strategy, Systems, Prototypes.

## Contact and location
- Email: hello.ccid@gmail.com
- Phone: +82 2 746 9620
- Address: 한국예술종합학교 석관동 캠퍼스, 서울 성북구 화랑로32길 146-37 (Korea National University of Arts, Seokgwan-dong campus, 146-37 Hwarang-ro 32-gil, Seongbuk-gu, Seoul).

## Joining cciD
- Internships and other opportunities are described at https://ccid-26-summer.netlify.app/ (linked from the People page as "참여 및 채용 안내" / "Opportunities at cciD"). Details such as dates or pay are not on the site.

## Site pages (name them as they appear in the menu)
- Research: the four research themes, each with its own page. Projects: the full list of projects. People: everyone at cciD, plus the link about internships and opportunities. About: the end of the home page.
`;

const line = (...parts) => parts.filter(Boolean).join(' · ');

function themesText() {
  return themes.map((t) => [
    `### ${t.number} ${t.en} (${t.title})`,
    `- Question: ${t.questionEn.replace(/\n/g, ' ')} / ${t.question.replace(/\n/g, ' ')}`,
    `- EN: ${t.introEn} ${t.premiseEn}`,
    `- KO: ${t.intro} ${t.premise}`,
    ...t.evidence.map(([title, , focusEn, , descEn]) => `- Project: ${title} (${focusEn}). ${descEn}`),
  ].join('\n')).join('\n\n');
}

function projectsText() {
  return withScheduled(visibleScheduled()).map((p) => `- ${line(p.year, `${p.client} (${p.clientKo})`, p.title, p.titleKo !== p.title && p.titleKo)}${p.description ? `: ${p.description}` : ''}`).join('\n');
}

function peopleText() {
  return groups.filter((g) => g.members.length).map((g) => {
    const people = g.members.map(([, name, , rawRole, rawBio]) => {
      const role = roleOverrides[name] ?? rawRole;
      const bio = (bioOverrides[name] ?? rawBio).replace(/formerly\s*\n/i, '').replace(/\s*\n\s*/g, '; ').trim();
      return `- ${line(name, role)}${bio ? ` (${bio})` : ''}`;
    });
    return [`### ${g.category}`, ...people].join('\n');
  }).join('\n\n');
}

// 서버가 처음 부를 때 한 번 만든다. 데이터는 빌드에 묶여 있어 요청마다 달라지지 않는다.
let cached = '';
export function knowledge() {
  if (!cached) {
    cached = [
      ABOUT.trim(),
      '## Research themes\n' + themesText(),
      '## Projects (newest first)\n' + projectsText(),
      '## People\n' + peopleText(),
      '### Director, full biography\n' + directorBio.join('\n'),
    ].join('\n\n');
  }
  return cached;
}
