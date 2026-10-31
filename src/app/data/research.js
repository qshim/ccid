import { sheetsStatic } from './sheetsStatic';

// Editorial positions and selected work, grounded in the existing published project record.
// Dates and performance outcomes are not inferred.
// wip: true 를 넣으면 그 테마 카드가 액자 모드(회색 매트, 뎁스 없음)로 보인다 — 진행 중인 작업을 보여줄 때만.
export const themes = [
  {
    id: 'interfaces', number: '01', title: '차세대 사용자 인터페이스', en: 'Next-generation interfaces', short: 'Future interfaces',
    question: '인터페이스가 우리를 이해한다면,\n무엇이 달라질까요?', questionEn: 'What changes when an interface\nunderstands us?',
    intro: "Gen UI의 설계 원칙부터 삼성의 모바일과 TV, 현대\u2060·\u2060기아의 미래 모빌리티까지. 사용자의 의도를 실제로 작동하는 인터페이스로 연결합니다.",
    introEn: "From Gen UI principles to Samsung’s mobile and TV, and future mobility for Hyundai and Kia. We translate user intent into working interfaces.",
    tags: ['Generative UI', 'Adaptive interfaces', 'Multimodal interaction'],
    image: '/img/2026/samsung-gen-ui.webp', images: ['/img/2026/samsung-gen-ui.webp', '/img/2025/mx_galaxy_ai_0.webp', '/img/2025/kia_0.webp', '/img/2025/kia_1.webp'], imageAlt: '생성형 사용자 인터페이스의 개념 이미지',
    premise: "삼성전자의 Generative UI 연구에서는 사용자 맥락과 의도, 디바이스와 작업 흐름에 대응하는 프레임워크를 다뤘습니다. Gen UI 원칙, 로직 파이프라인, 인터랙티브 프로토타입을 연결하며 인터페이스가 생성되고 변화하는 방식을 설계합니다.",
    premiseEn: "Our Generative UI work with Samsung Electronics addresses user context, intent, devices, and task flows. We connect Gen UI principles, logic pipelines, and interactive prototypes to design how interfaces are generated and how they adapt.",

    position: "인터페이스의 다음 형태를\n작동하는 시스템으로.",
    positionEn: "The next interface,\nas a working system.",
    evidence: [["Generative User Interface", "Gen UI 원칙 · 로직 파이프라인 · 인터랙티브 프로토타입", "Gen UI principles · Logic pipelines · Interactive prototypes", "AI 네이티브 경험을 위한 생성형 UI 프레임워크. 사용자 맥락과 의도에 따라 인터페이스가 적응하는 원칙과 구조를 설계합니다.", "A generative UI framework for AI-native experiences, defining how interfaces adapt to user context and intent."], ["Next-Gen Large-Screen Editor UX Research", "사용성 조사 · 사용자 리서치 · AI UX 컨셉", "Usability research · User research · AI UX concepts", "차세대 대화면 에디터를 위한 사용성 조사와 MZ 세대 리서치. 사용자의 편집 행동을 제품 경험의 방향과 AI 컨셉으로 연결했습니다.", "Usability research with Gen Z and millennial users for a next-generation large-screen editor, connecting editing behavior to product experience directions and AI concepts."], ["2030 e-MPV Interior AI UX Research", "선행 UX · 컨셉 프레임워크", "Advanced UX · Concept framework", "2030 e-MPV 내장 경험을 위해 Smart, Care, Trust의 핵심 프레임워크를 정의하고, 세 요소의 관계에서 미래 모빌리티 컨셉을 도출했습니다.", "Defined a Smart, Care, and Trust framework for the 2030 e-MPV interior, developing future mobility concepts from the relationships between them."]],
  },
  {
    id: 'creative-intelligence', number: '02', title: '인간과 AI의 창의적 협업', en: 'Human–AI co-creation', short: 'Creative intelligence',
    question: 'AI와 함께 만드는 일은\n어떻게 달라질까요?', questionEn: 'How does making change\nwhen we create with AI?',
    intro: "현대자동차그룹의 내재화된 AI 디자인 파이프라인과 산자부 R&D 생성형 AI 워크플로우. 생성, 리뷰, 판단을 하나의 프로세스로 설계합니다.",
    introEn: "An in-house AI design pipeline for Hyundai Motor Group and a generative AI workflow for MOTIE R&D. Connecting generation, review, and judgment in one process.",
    tags: ['Human–AI collaboration', 'Generative workflows', 'Design tools'],
    image: '/img/2025/hd_ai_driven_design.webp', images: ['/img/2025/hd_ai_driven_design.webp', '/img/2026/hd-design-axes.webp', '/img/2025/motie_2.webp', '/img/2025/motie_1.webp'], imageAlt: 'AI 기반 디자인 탐색 프로세스의 개념 이미지',
    premise: "AI 도입의 설계 단위는 팀의 작업 과정 전체입니다. 현대자동차그룹과의 연구에서는 컨셉 탐색, 디자인 리뷰, 평가를 연결하는 워크플로우를 다뤘습니다. 생성형 탐색과 3D 재구성, 디자이너의 검토를 연결해 AI가 실제 디자인 프로세스 안에서 작동하도록 설계합니다.",
    premiseEn: "We design AI adoption at the scale of a team’s entire workflow. Our work with Hyundai Motor Group connects concept exploration, design review, and evaluation, bringing generative exploration, 3D reconstruction, and designer judgment into the design process.",

    position: "생성에서 판단까지,\n디자인 프로세스를 다시 설계합니다.",
    positionEn: "From generation to judgment.\nRedesigning the design process.",
    evidence: [["AI Design Workflow from 2D to 3D for In-house Studios", "AI 디자인 워크플로우 · 3D 재구성 · 의사결정 지원", "AI design workflows · 3D reconstruction · Decision support", "보안이 요구되는 사내 환경에서 생성형 탐색, 3D 재구성, 디자이너 리뷰를 디자인 프로세스에 통합하는 연구입니다.", "Research into a secure in-house design workflow integrating generative exploration, 3D reconstruction, and designer review."], ["AI-Driven Exterior Design Process", "외장 디자인 · 글로벌 디자인 협업", "Exterior design · Global design collaboration", "글로벌 디자인센터 간 커뮤니케이션을 위한 AI 기반 외장 디자인 워크플로우. 컨셉 탐색부터 리뷰와 평가까지 공동 의사결정의 흐름으로 연결했습니다.", "An AI-assisted exterior design workflow for communication across global design centers, connecting exploration, review, and evaluation into shared decision-making."], ["AI Design Generation Pipeline", "맥락 기반 생성 · 이미지–3D 파이프라인", "Contextual generation · Image-to-3D pipeline", "채팅의 감정·행동·상황을 해석하는 Contextual Emoji Asset 시스템과 이미지 기반 3D 생성 파이프라인을 다루는 국가 R&D 과제입니다.", "National R&D on a Contextual Emoji Asset system that interprets emotion, action, and situation in chat, alongside an image-to-3D generation pipeline."]],
  },
  {
    id: 'spatial-experiences', number: '03', title: '공간과 일상의 새로운 경험', en: 'Spatial and everyday experiences', short: 'Spatial experiences',
    question: '기술이 공간을 만나면,\n어떤 경험이 시작될까요?', questionEn: 'What begins when technology\nbecomes part of a place?',
    intro: "LG의 고객과 공감하는 AI 경험, COEX의 공공 AI 인터페이스, 현대차 정몽구 재단과 《Shared World》 기획전, 자하 하디드 아키텍츠와 함께한 DDP 45133 브랜딩과 전시까지. 브랜드의 비전을 공간 경험으로 구현합니다.",
    introEn: "From an AI experience that empathizes with LG’s customers, a public AI interface at COEX, and the Shared World exhibition with the Hyundai Motor Chung Mong-Koo Foundation to the DDP 45133 brand and exhibition with Zaha Hadid Architects. Translating brand visions into spatial experiences.",
    tags: ['Spatial interaction', 'Customer experience', 'Participatory systems'],
    image: '/img/2025/lg_affectionate_intelligence_0.webp', images: ['/img/2026/onso-shared-world.webp', '/img/2025/lg_affectionate_intelligence_0.webp', '/img/2025/lg_affectionate_intelligence_3.webp', '/img/2025/lg_affectionate_intelligence_4.webp', '/img/2025/lg_affectionate_intelligence_5.webp', '/img/2025/coex_0.webp', '/img/2025/coex_1.webp', '/img/2025/coex_2.webp', '/img/2025/ddp_0.webp', '/img/2025/ddp_1.webp', '/img/2025/ddp_2.webp', '/img/2025/ddp_3.webp', '/img/2025/ddp_4.webp', '/img/2025/ddp_5.webp', '/img/2025/ddp_6.webp'], imageAlt: 'LG Affectionate Intelligence 공간 경험 이미지',
    premise: "공간은 브랜드와 기술이 직접 경험되는 접점입니다. LG의 Affectionate Intelligence를 전하는 금성전파사와, COEX 미디어 파사드를 공공 AI 인터페이스로 재해석한 GangnamEyes에서는 스토리텔링, 생성형 미디어, 참여형 시스템을 연결해 각 장소에 맞는 인터랙션을 설계했습니다. 서울디자인재단과는 자하 하디드 아키텍츠와 협력해 DDP 45133의 브랜드와 런칭 전시를 만들고, 디지털 트윈 기반의 DDP 멤버십 컨셉까지 설계했습니다. 현대차 정몽구 재단 온드림 소사이어티의 《Shared World》는 한국예술종합학교 미술원 CRAFT Lab과 cciD가 함께 만든 전시입니다.",
    premiseEn: "Space is where people experience a brand and its technology directly. From Geumseong Electronics for LG’s Affectionate Intelligence to GangnamEyes at the COEX media facade, we connect storytelling, generative media, and participatory systems into interactions specific to each place. For the Seoul Design Foundation, we created the DDP 45133 brand and its launch exhibition in collaboration with Zaha Hadid Architects, and designed a digital twin-based membership concept for the DDP. Shared World at the Hyundai Motor Chung Mong-Koo Foundation’s ONDREAM SOCIETY is an exhibition made together by CRAFT Lab and cciD at the Korea National University of Arts.",

    position: "브랜드의 비전이\n사람의 경험이 되는 순간.",
    positionEn: "When a brand’s vision\nbecomes a lived experience.",
    evidence: [["Affectionate Intelligence CX Design", "브랜드 경험 · 공간 CX · 참여형 인터랙션", "Brand experience · Spatial CX · Participatory interaction", "LG의 Affectionate Intelligence 비전을 금성전파사라는 몰입형 공간 경험으로 전개했습니다. 스토리텔링, 인터랙티브 시스템, 미디어 아트와 관객 참여를 통합했습니다.", "Translated LG’s Affectionate Intelligence vision into Geumseong Electronics, an immersive spatial CX platform integrating storytelling, interactive systems, media art, and participation."], ["AI-Driven AR Interaction Platform", "공공 AI 인터페이스 · 생성형 콘텐츠", "Public AI interface · Generative content", "COEX K-POP Square 미디어 파사드를 도시 규모의 AI 인터페이스로 재해석한 GangnamEyes. AI 인프라와 미디어 운영, 생성형 콘텐츠, 관객 참여를 연결했습니다.", "GangnamEyes reimagines the COEX K-POP Square media facade as an urban-scale AI interface, connecting AI infrastructure, media operations, generative content, and audience participation."], ["DDP 45133 Branding & Digital Twin Service", "브랜딩 · 전시 큐레이션 · 디지털 트윈", "Branding · Exhibition curation · Digital twin", "서울디자인재단의 DDP 45133 브랜딩을 맡아 자하 하디드 아키텍츠와 협력한 런칭 전시를 큐레이션하고, 브랜드 전략의 핵심인 디지털 트윈 기반 DDP 멤버십 컨셉을 설계했습니다.", "Created the DDP 45133 brand for the Seoul Design Foundation, curated its launch exhibition in collaboration with Zaha Hadid Architects, and designed a digital twin-based DDP membership concept at the core of the brand strategy."]],
  },
  {
    id: 'human-understanding', number: '04', title: '사람을 이해하는 디자인', en: 'Design that understands people', short: 'Human understanding',
    question: '사람의 경험을 이해하는\n더 깊은 방법은 무엇일까요?', questionEn: 'How can we understand\nexperience more deeply?',
    intro: "삼성 TV의 감성 품질과 미래 모빌리티의 AI UX. 사람에 대한 리서치를 제품과 브랜드의 디자인 판단으로 연결합니다.",
    introEn: "Emotional quality for Samsung TV. AI UX for future mobility. Turning human research into design decisions for products and brands.",
    tags: ['Qualitative research', 'Emotional evaluation', 'Design strategy'],
    image: '/img/2025/vd_23_0.webp', images: ['/img/2025/vd_23_0.webp', '/img/2025/vd_0.webp', '/img/2025/vd_1.webp', '/img/2025/vd_2.webp'], imageAlt: 'Smart TV 사용자 경험 연구의 개념 이미지',
    premise: "리서치는 디자인의 방향을 결정할 수 있어야 합니다. 삼성전자 VD와는 감성 품질과 삼성다움을 평가하고, 북미 Smart TV 경험을 정성적으로 분석했습니다. 사용자 행동과 감정의 차이를 읽는 언어와 평가 기준을 만들어, 제품 경험과 브랜드의 방향을 구체화합니다.",
    premiseEn: "Research needs to inform design direction. With Samsung Electronics VD, we evaluated emotional quality and Samsung-ness and investigated Smart TV experiences in North America. We develop vocabulary and criteria that connect human behavior and feeling to product and brand decisions.",

    position: "사람에 대한 이해를,\n디자인의 판단 근거로.",
    positionEn: "Human understanding.\nA basis for design decisions.",
    evidence: [["Samsung-ness Emotional Quality Research", "감성 품질 평가 · 브랜드 경험 전략", "Emotional quality evaluation · Brand experience strategy", "감성 평가 방법론으로 양산을 앞둔 차세대 제품 UX의 여러 디자인 방향을 검증하고, 브랜드의 고유성과 가치를 높이는 안을 선별해 최종 결정을 이끌었습니다.", "Used emotional evaluation to weigh competing design directions for production-bound, next-generation product UX, selecting those that best strengthen the brand’s distinctiveness and value and guiding the final decisions."], ["Smart TV UX Emotional Evaluation", "북미 사용자 리서치 · 감성 UX 평가", "North American user research · Emotional UX evaluation", "북미 시장의 Smart TV 경험을 다이어리 스터디와 정성 조사로 분석했습니다. Lean-forward·lean-back 경험을 살피며 감성 UX 어휘와 평가 방법론을 정립했습니다.", "Investigated Smart TV experiences in North America through diary studies and qualitative inquiry, developing emotional UX vocabulary and evaluation methods around lean-forward and lean-back viewing."], ["2030 e-MPV Interior AI UX Research", "미래 모빌리티 · Smart / Care / Trust", "Future mobility · Smart / Care / Trust", "Smart, Care, Trust의 상호관계를 바탕으로, 기아 2030 e-MPV의 선행 내장 경험을 위한 AI UX 컨셉을 도출했습니다.", "Developed AI UX concepts for Kia’s 2030 e-MPV interior from the relationships between Smart, Care, and Trust."]],
  },
];

const mapping = {
  'AI Design Workflow from 2D to 3D for In-house Studios': ['AI 기반 2D–3D 통합 설계전환 체계 및 내재화 핵심기술 개발', ['creative-intelligence']],
  'Generative User Interface': ['생성형 사용자 인터페이스 연구', ['interfaces']],
  'Affectionate Intelligence CX Design': ['Affectionate Intelligence 고객 경험 디자인', ['spatial-experiences']],
  'AI-Driven AR Interaction Platform': ['AI 에이전트 기반 공공 공간 인터랙션', ['spatial-experiences', 'interfaces']],
  'AI-Driven Exterior Design Process': ['생성형 AI 기반 외장 디자인 프로세스 연구', ['creative-intelligence']],
  'AI Design Generation Pipeline': ['AI 기반 창작 도구 및 생성 파이프라인 연구', ['creative-intelligence', 'interfaces']],
  'Next-Gen Large-Screen Editor UX Research': ['차세대 대화면 에디터 UX 연구', ['interfaces', 'human-understanding']],
  'Samsung-ness Emotional Quality Research': ['감성 품질 평가 및 삼성다움 연구', ['human-understanding']],
  '2030 e-MPV Interior AI UX Research': ['2030 e-MPV 선행 내장 AI UX 연구', ['interfaces', 'human-understanding']],
  'Smart TV UX Emotional Evaluation': ['Smart TV 감성 UX 평가', ['human-understanding']],
  'DDP 45133 Branding & Digital Twin Service': ['DDP 45133 브랜딩 및 디지털 트윈 서비스', ['spatial-experiences']],
  'Melting Point: Immersive Installation': ['Melting Point 몰입형 브랜드 경험', ['spatial-experiences']],
};
const clients = { 'Hyundai Motor Group': '현대자동차그룹', 'Samsung Electronics': '삼성전자', 'LG Electronics': 'LG전자', 'CJ CGV & Naver Cloud': 'CJ CGV · 네이버클라우드', 'Ministry of Trade, Industry and Energy': '산업통상자원부', 'Samsung Electronics MX': '삼성전자 MX', 'Samsung Electronics VD': '삼성전자 VD', 'KIA': '기아', 'Seoul Design Foundation': '서울디자인재단', 'Lotte & Häagen-Dazs': '롯데 · 하겐다즈' };
// Preserve published sheet titles and years. Monthly dates and outcomes are not inferred.
// 시트의 works 탭에 아직 없는 실적. 한예종 교수 페이지의 "주요 국내 R&D 프로젝트"와
// 대조해 빠진 것을 코드에서 채운다. 시트에 옮겨 넣으면 이 배열은 지운다.
// (설명은 과제명에서만 옮겼다 — 기간·성과는 추론하지 않는다.)
const extraCollaborations = [
  { id: 'collab-x1', year: '2026', client: 'ZER01NE', clientKo: '제로원 ZER01NE',
    title: 'Intent-Based Adaptive GenUI for SDV', titleKo: 'SDV를 위한 사용자 의도 기반 적응형 GenUI',
    themes: ['interfaces'],
    description: 'A generative UI that adapts to driver intent in software-defined vehicles, developed through the ZER01NE Sprint program.' },
  { id: 'collab-x2', year: '2026', client: 'Samsung Electronics CDO', clientKo: '삼성전자 CDO',
    title: 'Generative UI Process & UX Value Validation', titleKo: 'Generative UI 디자인 프로세스 및 사용자 경험 가치 검증',
    themes: ['interfaces', 'human-understanding'],
    description: 'Defining a Generative UI design process and validating the user experience value it creates.' },
  { id: 'collab-x3', year: '2026', client: 'Samsung Electronics VD', clientKo: '삼성전자 VD',
    title: 'AI TV Flexible UI Principles & Adaptive Interaction', titleKo: 'AI TV Flexible UI 구성 원칙 및 Adaptive Interaction 연구',
    themes: ['interfaces'],
    description: '' },
];

// 시트의 발주처 표기가 실제와 다른 건만 과제명 기준으로 덮는다.
const clientOverrides = {
  'Generative User Interface': ['Samsung Electronics CDO', '삼성전자 CDO'],
};

// 시트보다 먼저 바꾼 과제명. 시트의 works 탭을 고치면 이 줄은 지운다.
const renamedTitles = {
  'AI Design Program Management': 'AI Design Workflow from 2D to 3D for In-house Studios',
};

export const collaborations = (sheetsStatic.works?.[1] || []).slice(1).flatMap((cell, index) => {
  const separator = cell.indexOf(':');
  if (separator < 0) return [];
  const client = cell.slice(0, separator).trim();
  const sheetTitle = cell.slice(separator + 1).trim();
  const title = renamedTitles[sheetTitle] || sheetTitle;
  const year = String(sheetsStatic.works[0][index + 1] || '');
  if (client === 'Meta Wave' || !/^\d{4}$/.test(year)) return [];
  const mapped = mapping[title];
  const override = clientOverrides[title];
  return [{ id: `collab-${index}`, title, titleKo: mapped?.[0] || title, client: override?.[0] || client, clientKo: override?.[1] || clients[client] || client, year, themes: mapped?.[1] || [], description: sheetsStatic.works[2]?.[index + 1] || '' }];
}).concat(extraCollaborations).sort((a, b) => Number(b.year) - Number(a.year));

// 공개일이 지난 예약 프로젝트(scheduled.js, 서버 전용)를 페이지가 넘겨주면 같은 순서로
// 합친다. 정렬은 안정적이라 같은 해 안에서는 기존 순서 뒤에 붙는다.
export const withScheduled = (extra = []) => extra.length
  ? [...collaborations, ...extra].sort((a, b) => Number(b.year) - Number(a.year))
  : collaborations;
