// 사람인지 가늠하는 판정. 브라우저(human.js)와 서버(/api/talk/pass)가 같은 함수를 쓴다.
// 입력은 숫자로 된 요약뿐이다 — 좌표나 입력한 글자는 들어오지 않는다.
//
// 사람의 손은 고르지 않다. 그 고르지 않음을 본다:
//   커서  — 이벤트가 촘촘하고, 길이 휘고, 속도가 들쭉날쭉하다. 자동화는 한 번에 순간 이동하거나
//           (computer-use 류), 같은 속도의 곧은 선으로 움직인다(테스트 도구 류).
//   휠    — 값이나 간격이 조금씩 다르다(트랙패드는 관성으로 줄어든다). 자동화는 같은 값을 같은 간격으로.
//   터치  — 스크롤 한 번에 touchmove 가 여러 번 온다. 자동화의 탭은 시작·끝뿐이다. 스크롤 없이 메뉴만
//           눌러 들어온 사람도 있어, 간격이 고르지 않은 탭이 세 번 넘으면 사람으로 본다.
//   타자  — 글자 사이 간격이 흔들린다. 자동화는 간격이 일정하거나 키 이벤트 없이 글자를 넣는다.
//           (간격의 표준편차만 보면 "같은 간격 + 한 번의 긴 멈춤"이 사람처럼 보여서, 같은 간격의 비율도 본다.)
//   둘러보기 — 섹션에 머물며 읽고, 페이지를 옮겨 다닌다. 혼자서는 약한 증거라 휠과 함께만 쓴다.
//   메뉴  — 메뉴의 "Let's talk" 을 직접 누르고 들어왔다(스크립트가 보낸 클릭은 세지 않는다). 사이트를 열자마자
//           메뉴로 바로 온 사람은 다른 손길이 거의 없어, 이것만으로도 사람으로 본다.
// 자동화 표지(navigator.webdriver)나 크롤러·AI 에이전트의 User-Agent 는 바로 아니라고 본다.
//
// 이것은 비용을 지키는 문턱이지 보안 경계는 아니다. 마음먹은 공격은 서버의 IP 한도와 계정 예산이 막는다.

export const BOT_UA = /\b(?:bot|crawler|spider)\b|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|CCBot|Bytespider|Amazonbot|Applebot|meta-externalagent|HeadlessChrome|PhantomJS|python-requests|python-httpx|aiohttp|curl\/|Wget|node-fetch|axios\/|Go-http-client|Scrapy/i;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function scoreHuman(raw = {}, ua = '') {
  const x = {
    elapsed: num(raw.elapsed),
    webdriver: raw.webdriver === true,
    mouse: { moves: num(raw.mouse?.moves), path: num(raw.mouse?.path), turns: num(raw.mouse?.turns), cv: num(raw.mouse?.cv), jumps: num(raw.mouse?.jumps) },
    wheel: { n: num(raw.wheel?.n), distinct: num(raw.wheel?.distinct), gapStd: num(raw.wheel?.gapStd) },
    touch: { seqs: num(raw.touch?.seqs), taps: num(raw.touch?.taps), tapGapStd: num(raw.touch?.tapGapStd) },
    keys: { n: num(raw.keys?.n), gapStd: num(raw.keys?.gapStd), uniform: num(raw.keys?.uniform) },
    views: num(raw.views),
    pages: num(raw.pages),
    menu: num(raw.menu),
  };
  if (x.webdriver || BOT_UA.test(ua)) return { human: false, why: 'automation' };
  if (x.elapsed < 2500) return { human: false, why: 'too-soon' };

  const mouse = x.mouse.moves >= 20 && x.mouse.path >= 300 && x.mouse.turns >= 3 && x.mouse.cv >= 0.3 && x.mouse.jumps <= Math.max(2, x.mouse.moves * 0.1);
  const touch = x.touch.seqs >= 1 || (x.touch.taps >= 3 && x.touch.tapGapStd >= 60);
  const keys = x.keys.n >= 8 && x.keys.gapStd >= 18 && x.keys.uniform <= 0.45;
  const wheel = x.wheel.n >= 3 && (x.wheel.distinct >= 2 || x.wheel.gapStd >= 25);
  const browse = x.views >= 2 || x.pages >= 2;
  const menu = x.menu >= 1;

  const human = mouse || touch || keys || (wheel && browse) || menu;
  return { human, why: human ? [mouse && 'mouse', touch && 'touch', keys && 'keys', wheel && browse && 'wheel+browse', menu && 'menu'].filter(Boolean).join(',') : 'no-signal' };
}
