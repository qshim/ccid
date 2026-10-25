"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { pxGrotesk, pretendardR } from '@/fonts/fonts';
import './site.css';
import './portraits.css';
import TalkAgent from './talk/TalkAgent';
import GradualBlur from './GradualBlur';

const Language = createContext({ lang: 'ko' });
export function useSiteLanguage() { return useContext(Language); }
export function Arrow({ diagonal = false, className = '' }) {
  return <svg className={`site-arrow ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M3 12h17m-7-7 7 7-7 7'} stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function languageSnapshot() {
  try { return localStorage.getItem('ccid-language') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
}
function subscribeLanguage(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener('ccid-language-change', callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('ccid-language-change', callback); };
}
export function SiteShell({ children }) {
  const lang = useSyncExternalStore(subscribeLanguage, languageSnapshot, () => 'ko');
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState('');
  const headerRef = useRef(null);
  const cancelScroll = useRef(null);
  const menuButton = useRef(null);
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add('ccid-public');
    return () => { document.documentElement.classList.remove('ccid-public'); cancelScroll.current?.(); };
  }, []);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const research = document.getElementById('research');
      const about = document.getElementById('about');
      const marker = window.innerHeight * .35;
      setSection(about && about.getBoundingClientRect().top <= marker ? 'about' : research && research.getBoundingClientRect().top <= marker ? 'research' : '');
      // 맨 위(0)에서 research 가 마커에 닿는 지점까지를 0→1 로 읽는다. 헤더의 회색
      // 층과 블러 세기가 이 값을 따라가므로, 켜지고 꺼지는 것이 아니라 스크롤에
      // 붙어 서서히 짙어지고 되돌아간다.
      const el = headerRef.current;
      if (el) {
        const span = research ? research.getBoundingClientRect().top + window.scrollY - marker : window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, span)));
        el.style.setProperty('--head-p', p.toFixed(3));
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (e) => {
      if (e.key === 'Escape') { setMenu(false); menuButton.current?.focus(); }
      if (e.key === 'Tab') {
        const items = [...document.querySelectorAll('.site-header a, .site-header button')].filter(el => el.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', keydown); };
  }, [menu]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
  const navigate = (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setMenu(false);
    cancelScroll.current?.();
    const url = new URL(href, window.location.origin);
    if (url.pathname !== pathname || !url.hash) return;
    const target = document.getElementById(url.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (window.location.hash !== url.hash) window.history.pushState(null, '', href);
    const start = window.scrollY;
    const header = document.querySelector('.site-header').offsetHeight;
    const end = Math.max(0, Math.min(start + target.getBoundingClientRect().top - header - 16, document.documentElement.scrollHeight - window.innerHeight));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : Math.min(780, 420 + Math.abs(end - start) * .06);
    let frame;
    const started = performance.now();
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
      cancelScroll.current = null;
    };
    const tick = now => {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({ top: start + (end - start) * eased, behavior: 'instant' });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        stop();
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };
    cancelScroll.current = stop;
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    frame = requestAnimationFrame(tick);
  };
  const changeLanguage = () => {
    const next = lang === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem('ccid-language', next); } catch { return; }
    window.dispatchEvent(new Event('ccid-language-change'));
  };
  const links = [
    { href: '/#research', text: 'Research', active: pathname.startsWith('/research') || (pathname === '/' && section === 'research') },
    { href: '/collaborations', text: 'Projects', active: pathname === '/collaborations' },
    { href: '/people', text: 'People', active: pathname === '/people' },
    { href: '/#about', text: 'About', active: pathname === '/' && section === 'about' },
  ];
  return <Language.Provider value={{ lang }}><div className={`ccid-site ${pretendardR.className}`} style={{ '--display-font': pxGrotesk.style.fontFamily }}>
    <a className="site-skip" href="#main">{lang === 'ko' ? '본문으로 건너뛰기' : 'Skip to content'}</a>
    <header ref={headerRef} className={`site-header ${scrolled ? 'is-scrolled' : ''} ${menu ? 'menu-is-open' : ''}`}>
      <GradualBlur position="top" height="112px" strength={1.3} divCount={6} curve="ease-in" opacity={.5} style={{ top: 0, height: 112, bottom: 'auto' }} />
      <Link className="wordmark" href="/" aria-label="cciD home" onClick={e => navigate(e, "/")}>cciD<span className="wordmark-dot" /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{links.map(l => <Link key={l.href} href={l.href} onClick={e => navigate(e, l.href)} className={l.active ? 'is-active' : ''} aria-current={l.active ? 'page' : undefined}>{l.text}</Link>)}</nav>
      <div className="header-actions"><button className="language-button" onClick={changeLanguage} aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}>{lang === 'ko' ? 'EN' : 'KO'}</button><button ref={menuButton} className="menu-toggle" aria-controls="mobile-navigation" aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(v => !v)}><span /><span /></button></div>
      {menu && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{links.map((l, i) => <Link key={l.href} href={l.href} onClick={e => navigate(e, l.href)} className={l.active ? 'is-active' : ''} aria-current={l.active ? 'page' : undefined}><span className="micro">0{i + 1}</span>{l.text}<Arrow /></Link>)}<button type="button" onClick={() => { setMenu(false); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); window.dispatchEvent(new Event('ccid-open-contact')); }}><span className="micro" aria-hidden="true" />Let’s talk <Arrow diagonal /></button><p>Center for Creative Intelligence Design</p></nav>}
    </header>
    <div inert={menu || undefined}>
    {children}
    <footer className="site-footer" id="contact"><div className="footer-top"><span className="eyebrow">A conversation is a beginning.</span><p>{lang === 'ko' ? '함께 탐구하고 싶은 질문이 있나요?' : 'What would you like to explore together?'}</p><TalkAgent lang={lang} /></div><div className="footer-bottom"><div className="footer-brand"><Link href="/" className="wordmark">cciD</Link></div><p className="footer-name">Center for Creative Intelligence Design<span className="footer-copy">© {new Date().getFullYear()} cciD</span></p><div><a href="mailto:hello.ccid@gmail.com">hello.ccid@gmail.com</a><a href="tel:+8227469620">+82 2 746 9620</a></div><p>{lang === 'ko' ? '한국예술종합학교 석관동 캠퍼스' : 'Korea National University of Arts'}<br />{lang === 'ko' ? '서울 성북구 화랑로32길 146-37' : '146-37 Hwarang-ro 32-gil, Seoul'}</p></div></footer></div>
  </div></Language.Provider>;
}
