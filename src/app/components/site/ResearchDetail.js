"use client";
import Link from 'next/link';
import Image from 'next/image';
import ProjectImages from './ProjectImages';
import { themes, collaborations } from '@/app/data/research';
import { useSiteLanguage, Arrow } from './SiteShell';
import CollaborationRows from './CollaborationRows';

export default function ResearchDetail({ theme }) {
  const { lang } = useSiteLanguage();
  const ko = lang === 'ko';
  const related = collaborations.filter(c => c.themes.includes(theme.id));
  const next = themes[(themes.findIndex(t => t.id === theme.id) + 1) % themes.length];
  const selected = theme.evidence.flatMap(e => {
    const project = related.find(c => c.title === e[0]);
    return project ? [{ project, scope: ko ? e[1] : e[2], contribution: ko ? e[3] : e[4] }] : [];
  });

  return <main id="main" className="research-detail">
    <div className="detail-intro site-section">
      <Link href="/#research" className="back-link">← {ko ? '연구 주제 전체' : 'All research themes'}</Link>
      <div className="detail-number eyebrow">Research theme / {theme.number}</div>
      <h1>{ko ? theme.title : theme.en}</h1>
      <div className="detail-summary">
        <p>{ko ? theme.intro : theme.introEn}</p>
        <div className="tag-list">{theme.tags.map(t => <span key={t}>{t}</span>)}</div>
      </div>
    </div>
    <figure className="detail-image site-section">
      <ProjectImages images={theme.images || [theme.image]} alt={theme.imageAlt} width={1600} height={1000} priority sizes="100vw" />
      <figcaption>{ko ? '일부 이미지는 기밀 유지를 위해 프로젝트를 설명하고자 생성하였습니다.' : 'Some visuals are conceptual representations of confidential work.'}</figcaption>
    </figure>
    <section className="detail-position site-section">
      <div className="detail-section-label eyebrow">Our perspective</div>
      <div>
        <h2>{ko ? theme.position : theme.positionEn}</h2>
        <p className="detail-premise">{ko ? theme.premise : theme.premiseEn}</p>
      </div>
    </section>
    <section className="selected-engagements site-section">
      <div className="section-kicker"><span className="eyebrow">Selected engagements</span><span className="micro">Strategy into practice.</span></div>
      <div className="engagements-heading"><h2>{ko ? '대표 프로젝트' : 'Selected work'}<span className="heading-period">.</span></h2><p>{ko ? theme.question : theme.questionEn}</p></div>
      {selected.map(({ project, scope, contribution }, index) => <article className="engagement" key={project.id}>
        <div className="engagement-index micro">{String(index + 1).padStart(2, '0')}</div>
        <div className="engagement-work"><h3>{ko ? project.titleKo : project.title}</h3><div className="engagement-client"><span>{ko ? project.clientKo : project.client}</span><span>{project.year}</span></div></div>
        <div className="engagement-contribution"><p>{contribution}</p><span>{scope}</span></div>
      </article>)}
    </section>
    <section className="detail-related site-section">
      <div className="section-kicker"><span className="eyebrow">Project record</span><span className="micro">{related.length} projects</span></div>
      <h2>{ko ? '이 분야의 프로젝트' : 'Projects in this field'}</h2>
      <CollaborationRows items={related} expanded />
      <Link className="text-link" href="/collaborations">{ko ? '전체 프로젝트' : 'All projects'}<Arrow /></Link>
    </section>
    <Link className="next-theme site-section" href={`/research/${next.id}`}>
      <span className="eyebrow">Next research theme / {next.number}</span><h2>{ko ? next.title : next.en}</h2><Arrow />
    </Link>
  </main>;
}
