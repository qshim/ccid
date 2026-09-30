"use client";
import { useState } from 'react';
import { collaborations, themes } from '@/app/data/research';
import { useSiteLanguage } from './SiteShell';
import CollaborationRows from './CollaborationRows';
export default function Archive() {
  const { lang } = useSiteLanguage(); const ko = lang === 'ko';
  const [theme, setTheme] = useState('all');
  const [year, setYear] = useState('all');
  const years = [...new Set(collaborations.map(c => c.year))];
  const filtered = collaborations.filter(c => (theme === 'all' || c.themes.includes(theme)) && (year === 'all' || c.year === year));
  return <main id="main" className="archive-page site-section"><div className="page-topline eyebrow">A shared body of inquiry / {years.at(-1)}—{years[0]}</div><h1 className="sr-only">Projects</h1><div className="archive-controls"><div className="filter-list" role="group" aria-label={ko ? '연구 주제 필터' : 'Filter by research theme'}><button aria-pressed={theme === 'all'} onClick={() => setTheme('all')}>{ko ? '전체' : 'All'}</button>{themes.map(t => <button key={t.id} aria-pressed={theme===t.id} onClick={() => setTheme(t.id)}>{ko ? t.title : t.short}</button>)}</div><label className="year-select"><span className="sr-only">{ko ? '연도 선택' : 'Select year'}</span><select value={year} onChange={e => setYear(e.target.value)}><option value="all">{ko ? '모든 연도' : 'All years'}</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label></div><div className="archive-results">{(theme !== 'all' || year !== 'all') && <button onClick={() => {setTheme('all');setYear('all');}}>{ko ? '필터 초기화' : 'Clear filters'} ×</button>}</div>{filtered.length ? <CollaborationRows items={filtered} expanded /> : <div className="archive-empty"><h2>{ko ? '이 조건에 해당하는 프로젝트가 없습니다.' : 'No projects match these filters.'}</h2><button className="text-link" onClick={() => {setTheme('all');setYear('all');}}>{ko ? '전체 프로젝트 보기' : 'View all projects'} →</button></div>}<p className="archive-note">{ko ? '기간은 공개된 기록의 연도를 기준으로 표기했습니다.' : 'Years reflect the dates available in the published record.'}</p></main>;
}
