"use client";
import Link from 'next/link';
import { themes } from '@/app/data/research';
import { useSiteLanguage, Arrow } from './SiteShell';
export default function CollaborationRows({ items, expanded = false }) {
  const { lang } = useSiteLanguage();
  return <div className="collaboration-table"><div className="collaboration-heading" aria-hidden="true"><span>{lang === 'ko' ? '프로젝트' : 'Project'}</span><span>{lang === 'ko' ? '기관' : 'Organization'}</span><span>{lang === 'ko' ? '기간' : 'Year'}</span></div>{items.map(item => <article className="collaboration-row" key={item.id}><div className="collaboration-title"><h3>{lang === 'ko' ? item.titleKo : item.title}</h3>{expanded && <div className="row-themes">{item.themes.map(id => { const theme = themes.find(t => t.id === id); return <Link key={id} href={`/research/${id}`}>{lang === 'ko' ? theme.title : theme.short}<Arrow diagonal /></Link>; })}</div>}</div><span className="collaboration-client">{lang === 'ko' ? item.clientKo : item.client}</span><span className="collaboration-year">{item.year}</span></article>)}</div>;
}
