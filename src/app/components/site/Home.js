"use client";
import Link from 'next/link';
import Image from 'next/image';
import { themes, collaborations } from '@/app/data/research';
import { useSiteLanguage, Arrow } from './SiteShell';
import QuestionField from './QuestionField';
import DecodeText from './DecodeText';
import ProjectImages from './ProjectImages';
import RevealLines from './RevealLines';
import CollaborationRows from './CollaborationRows';

function TypedCaption({ text, offset = 0, secondary = false }) {
  let character = offset;
  return <span className={`image-caption-line${secondary ? ' is-secondary' : ''}`}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">{text.split(' ').map((word, index) => <span className="typed-word" key={index}>{Array.from(word).map((letter, i) => <span className="typed-letter" key={i} style={{ '--letter-delay': `${character++ * 18}ms` }}>{letter}</span>)}{' '}</span>)}</span>
  </span>;
}

export default function Home() {
  const { lang } = useSiteLanguage();
  const ko = lang === 'ko';
  return <main id="main">
    <section className="home-hero">
      <h1>{ko ? <>컴퓨테이셔널 디자인을<br /><span>사람의 경험으로.</span></> : <>From computational design<br /><span>to human experience.</span></>}</h1>
      <div className="hero-lower"><div className="hero-statement"><span className="eyebrow">Research. Strategy. Implementation.</span><p><DecodeText text={ko ? '리서치로 방향을 정하고,\n내일을 디자인합니다.' : 'Research sets the direction.\nDesign builds tomorrow.'} /></p><div className="hero-description"><DecodeText text={ko ? 'cciD는 컴퓨테이셔널 디자인과 생성형 AI 기반의 사용자 경험 디자인 및 리서치로 내일의 고객과 사용자를 인터랙션 디자인으로 연결하는 인간 중심의 디자인 센터입니다. 기업의 기술이 제품과 브랜드 안에서 어떤 경험을 만들어야 하는지 실험하고 정의하고 구현합니다.' : 'cciD is a human-centred design centre that connects tomorrow’s customers and users through interaction design, working from computational design and generative-AI user experience research. We experiment with, define, and build the experiences a company’s technology should create inside its products and brands.'} /></div></div><QuestionField /></div>
    </section>

    <section className="research-section site-section" id="research">
      <div className="section-kicker"><span className="eyebrow">01 / Research themes</span></div>
      <div className="theme-grid">{themes.map((theme, index) => <Link data-reveal className={`theme-card theme-card-${index}`} href={`/research/${theme.id}`} key={theme.id}><div className="theme-image"><ProjectImages images={theme.images || [theme.image]} alt={theme.imageAlt} width={1100} height={740} sizes="(max-width: 700px) 92vw, 48vw" /><span className="image-caption"><TypedCaption text={theme.short} /><TypedCaption text={theme.tags[0]} offset={theme.short.length + 4} secondary /></span><span className="image-number">{theme.number}</span><span className="image-open"><svg className="site-arrow drawn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path className="arrow-shaft" pathLength="1" d="M5 19 19 5" /><path className="arrow-wing" pathLength="1" d="M19 5H5" /><path className="arrow-wing" pathLength="1" d="M19 5V19" /></svg></span></div><h3><DecodeText text={ko ? theme.question : theme.questionEn} /></h3><p className="theme-track-record"><DecodeText text={ko ? theme.intro : theme.introEn} /></p><div className="theme-card-bottom"><span><DecodeText text={ko ? theme.title : theme.en} /></span><Arrow /></div></Link>)}</div>
      
    </section>

    <section className="collaboration-section site-section" id="collaborations"><div className="section-kicker"><span className="eyebrow">02 / Projects</span></div><div className="section-heading"><h2><DecodeText onView text={ko ? '서로 다른 산업.' : 'Across industries.'} /><br /><em><DecodeText onView text={ko ? '구체적인 실행.' : 'Into practice.'} /></em></h2><div><RevealLines as="p" text={ko ? '제품 경험의 전략부터 AI 워크플로우와 공간 인터랙션까지. 기업과 기관의 실제 과제에 참여해 온 cciD의 프로젝트 이력입니다.' : 'Product experience strategy, AI workflows, and spatial interaction. A record of cciD’s work on real challenges with businesses and institutions.'} /><Link className="text-link" href="/collaborations">{ko ? '전체 프로젝트' : 'All projects'}<Arrow /></Link></div></div><CollaborationRows items={collaborations.slice(0,6)} /><Link className="archive-bottom-link" href="/collaborations"><span>{ko ? '프로젝트 전체 보기' : 'Explore all projects'} <Arrow /></span></Link></section>

    <section className="about-section site-section" id="about"><div className="section-kicker"><span className="eyebrow">03 / About cciD</span></div><div className="about-layout"><div><h2>{ko ? <>리서치로 방향을 정하고,<br /><em>디자인으로 구현합니다.</em></> : <>Research-led.<br /><em>Design-driven.</em></>}</h2><Link href="/people" className="text-link">{ko ? '함께하는 사람들' : 'Meet the people'}<Arrow /></Link></div><div className="about-body"><p className="about-lead">{ko ? 'cciD는 사용자 리서치, 생성형 AI, 인터랙션 디자인을 연결하는 디자인 연구센터입니다. 기술이 제품과 브랜드 안에서 어떤 경험이 되어야 하는지 정의하고 구현합니다.' : 'cciD is a design research center working across user research, generative AI, and interaction design. We define and build the experiences technology can create within products and brands.'}</p><RevealLines as="p" text={ko ? '삼성전자와는 차세대 UI와 감성 UX를, 현대자동차그룹과는 내재화된 AX 기반 디자인 프로세스를, LG전자와는 브랜드의 AI 비전을 공간 경험으로 다뤘습니다. 카네기멜론대학교(CMU)의 리서치를 통한 설계 원칙 검증과 디자인 전략 제안, MIT의 실제 상황에서 작동하는 프로토타입을 구현하는 방식을 접목한 것이 cciD의 방식입니다.' : 'Our work spans next-generation UI and emotional UX with Samsung Electronics, in-house AX-based design processes with Hyundai Motor Group, and spatial AI brand experiences with LG Electronics. cciD grafts together two traditions: Carnegie Mellon University’s way of validating design principles through research and turning them into design strategy, and MIT’s way of building prototypes that work in real conditions.'} /><div className="practice-steps"><span>Research</span><span>Strategy</span><span>Systems</span><span>Prototypes</span></div></div></div></section>
  </main>;
}
