"use client";
import { useState } from 'react';
import Image from 'next/image';
import { groups, directorBio, roleOverrides, bioOverrides } from '@/app/data/people';
import { resolvePhoto } from '@/app/components/members';
import { useSiteLanguage, Arrow } from './SiteShell';

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
