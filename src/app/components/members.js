"use client";

import { useEffect, useState } from "react";
import { pxGrotesk } from "@/fonts/fonts";
import { sheetsStatic } from "@/app/data/sheetsStatic";
import GreyPlaceholder from "@/app/components/common/GreyPlaceholder";
import Reveal from "@/app/components/common/Reveal";

// Manual photo overrides (keyed by name). These take precedence over the
// sheet image — used when a member has no sheet photo or the sheet URL is broken.
const LOCAL_PHOTOS = {
  "Yoonha Jeong": "/img/members/yoonha-jeong.png",
  "Ingee Jeong": "/img/members/ingee-jeong.png",
  "Chanwoo Lee": "/img/members/chanwoo-lee.png",
  "Yoonseo Oh": "/img/members/yoonseo-oh.png",
  "Hyebin Park": "/img/members/hyebin-park.png",
  "Sooyoun Jo": "/img/members/sooyoun-jo.png",
  "Hayeon Jeon": "/img/members/hayeon-jeon.png",
  "Hyosun Son": "/img/members/hyosun-son.png",
  "Da in Kim": "/img/members/dain-kim.png",
  "Eunseol Kim": "/img/members/eunseol-kim.png",
  "Jeremy Lee": "/img/members/jeremy-lee.png",
  "Ji min Rhee": "/img/members/jeremy-lee.png",
  "Juhae Kim": "/img/members/juhae-kim.png",
  "Yunhyeong Park": "/img/members/yunhyeong-park.png",
  "Seojin Hong": "/img/members/seojin-hong.png",
  "Minjeong Joo": "/img/members/minjeong-joo.png",
  "Sara Kang": "/img/members/sara-kang.png",
  "Minseo Kang": "/img/members/minseo-kang.png",
  "Taeho Kim": "/img/members/taeho-kim.png",
  "Changmin Kim": "/img/members/changmin-kim.png",
  "Yunso Jung": "/img/members/yunso-jung.png",
};

// Sheet photos mirrored locally (downloaded from the Google Drive thumbnail URLs
// in the sheet). Used as a fast fallback so cards don't wait on Google Drive,
// which throttles thumbnail requests and made some photos pop in late.
// LOCAL_PHOTOS (hand-picked) still wins over these.
const SHEET_PHOTOS = {
  "Kyuha Shim, FRSA": "/img/members/sheet/kyuha-shim-frsa.png",
  "Taery Kim": "/img/members/sheet/taery-kim.png",
  "Boram Lee": "/img/members/sheet/boram-lee.png",
  "Jiyeon Lee": "/img/members/sheet/jiyeon-lee.png",
  "Hankak Lee": "/img/members/sheet/hankak-lee.png",
  "Kiryung Nam": "/img/members/sheet/kiryung-nam.png",
  "Yunhyeong Park": "/img/members/sheet/yunhyeong-park.png",
  "Suhyeon Cho": "/img/members/sheet/suhyeon-cho.png",
  "Hyunji Lee": "/img/members/sheet/hyunji-lee.png",
  "Jiyu Shin": "/img/members/sheet/jiyu-shin.png",
  "Taeeun Kim": "/img/members/sheet/taeeun-kim.png",
  "Minseo Kang": "/img/members/sheet/minseo-kang.png",
  "Seojin Hong": "/img/members/sheet/seojin-hong.png",
  "Minjeong Joo": "/img/members/sheet/minjeong-joo.png",
  "Sara Kang": "/img/members/sheet/sara-kang.png",
  "Minji Park": "/img/members/sheet/minji-park.png",
  "Seungju Lee": "/img/members/sheet/seungju-lee.png",
  "Euna Jang": "/img/members/sheet/euna-jang.png",
  "Jiwon Park": "/img/members/sheet/jiwon-park.png",
  "Inyoung Kim": "/img/members/sheet/inyoung-kim.png",
  "Juwan Kim": "/img/members/sheet/juwan-kim.png",
  "Hyeji Jeong": "/img/members/sheet/hyeji-jeong.png",
  "Heeyun Sul": "/img/members/heeyun-sul.png",
};

// Members hidden from the mobile People view only (still shown on desktop).
const MOBILE_HIDDEN = new Set(["Jiyeon Lee"]);

// Members hidden everywhere (both mobile and desktop). Filtered out at build time.
const HIDDEN_MEMBERS = new Set(["Ji min Rhee", "Eunseol Kim", "Taeho Kim"]);

// Per-member object-position override for the circular avatar crop, so heads/faces
// aren't cut off. Tall portraits default to center; these shift the crop window up.
const PHOTO_POSITION = {
  "Changmin Kim": "center 18%",
  "Taeho Kim": "center 18%",
};
function photoPosition(name) {
  return PHOTO_POSITION[(name || "").trim()];
}

// Per-member crop zoom (transform scale). Used to match head sizes across a row
// when a source photo is framed wider/further back than its neighbours. Falls
// back to the small 1.04 nudge used for locally-hosted member photos.
const PHOTO_SCALE = {
  "Yeju Chung": 1.32, // 110% of the previous 1.2
};
// Transform-origin per scaled member, so zooming the crop anchors near the top
// of the head instead of the center (center-origin scaling crops the forehead).
const PHOTO_ORIGIN = {
  "Yeju Chung": "center 20%",
};
function photoTransform(name, imageSrc) {
  const s = PHOTO_SCALE[(name || "").trim()];
  if (s) return `scale(${s})`;
  if (imageSrc && String(imageSrc).startsWith("/img/members/")) return "scale(1.04)";
  return undefined;
}
function photoOrigin(name) {
  return PHOTO_ORIGIN[(name || "").trim()];
}

// 프로젝트 리딩 선생님들은 로스터에 없는 애드혹 항목이라("최덕수 선생님" 같은
// 한글 문자열이 곧 id다) 영문 이름 키로는 사진이 잡히지 않는다. 한글 이름 →
// 파일 경로를 따로 두고, "선생님" 호칭이 붙어도 같은 항목으로 해석한다.
const ADHOC_PHOTOS = {
  "최덕수": "/img/members/adhoc/duksoo-choi.png",
  "이태헌": "/img/members/adhoc/taeheon-lee.png",
  "윤선빈": "/img/members/adhoc/sunbin-yoon.png",
  "안예윤": "/img/members/adhoc/yeyoon-ahn.png",
  "조슈아": "/img/members/adhoc/joshua-cho.png",
};

// Exported for reuse (Lab Ops researcher UI) — keeps photo overrides single-source.
export function resolvePhoto(name, image) {
  const key = (name || "").trim();
  const bare = key.replace(/\s*선생님\s*$/, "");
  return (
    LOCAL_PHOTOS[key] ||
    SHEET_PHOTOS[key] ||
    ADHOC_PHOTOS[bare] ||
    String(image || "").trim() ||
    ""
  );
}

function normalizeRole(role) {
  return (role || "").replace(/Design\s+at\s+/i, "Design at\n");
}

function normalizeBio(bio) {
  const raw = (bio || "").trim();
  if (!raw) return "";
  // "Company. Role" -> "Company, Role" (a comma reads cleaner than a mid-line period).
  const commafy = (s) => s.replace(/\.\s+/g, ", ");
  const rawLines = raw.split("\n");
  // Block-header pattern: a line saying just "formerly" (optionally with
  // trailing punctuation) precedes a list of past affiliations — normalize each
  // of those to the inline "former X" form so the single pass below handles them.
  const headerIdx = rawLines.findIndex((l) => /^\s*formerly[\s:.,]*$/i.test(l));
  let lines;
  if (headerIdx !== -1) {
    const before = rawLines.slice(0, headerIdx);
    const past = rawLines.slice(headerIdx + 1).map((l) => {
      const t = l.trim();
      return t ? `former ${t}` : l;
    });
    lines = [...before, ...past];
  } else {
    lines = rawLines;
  }
  // Inline "former X" -> "Prev. X"; convert "Company. Role" -> "Company, Role".
  lines = lines.map((l) => {
    const m = l.match(/^(\s*)former\s+(.*)$/i);
    if (m) return `${m[1]}Prev. ${commafy(m[2])}`;
    return commafy(l);
  });
  return lines.join("\n").trim();
}

export default function Members() {
  const [membersInfo, setMembersInfo] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = sheetsStatic;
    const categorizedMembers = (data?.members || []).reduce((acc, member) => {
      const category = member[0];
      if (HIDDEN_MEMBERS.has(String(member[1] || "").trim())) return acc;
      if (!acc[category]) acc[category] = [];
      acc[category].push(member);
      return acc;
    }, {});

    setMembersInfo(categorizedMembers);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className={`${pxGrotesk.className} text-lg md:text-xl`}>Loading members...</p>
      </div>
    );
  }

  // Display order. Categories not listed here keep their sheet order, after the listed ones.
  const CATEGORY_ORDER = [
    "Director",
    "Advisory Board",
    "Former Advisors",
    "Student Researchers",
    "Research Interns",
    "Alumni",
  ];
  const categories = Object.entries(membersInfo).sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });
  const allMembers = categories.flatMap(([, list]) => (Array.isArray(list) ? list : [])).filter(Boolean);

  // Compact vertical card — photo on top, smaller text. Used for the 2-column
  // Leadership grid on mobile.
  const renderCompactCard = (member, photoClass = "w-[88px] h-[88px]") => {
    const [, name, image, role, bio] = member;
    const imageSrc = resolvePhoto(name, image);
    // Mobile-only: break "Generative AI for <rest>" onto two lines so the long
    // role reads cleanly in the narrow compact card (e.g. Kiryung Nam, Yunhyeong Park).
    const nRole = normalizeRole(role).replace(/Generative AI for\s+/i, "Generative AI for\n");
    const nBio = normalizeBio(bio);
    return (
      <div className="min-w-0 flex flex-col items-center text-center">
        <div className={`relative overflow-hidden rounded-full ${photoClass}`}>
          <GreyPlaceholder className="absolute inset-0 w-full h-full" />
          {imageSrc && (
            <img
              src={imageSrc}
              alt={name || "member"}
              className={`absolute inset-0 w-full h-full object-cover filter grayscale brightness-[0.95] contrast-[1.05]`}
              style={{ objectPosition: photoPosition(name), transform: photoTransform(name, imageSrc), transformOrigin: photoOrigin(name) }}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
        <p className={`${pxGrotesk.className} pt-2 text-[15px] leading-[1.08] font-semibold text-black w-full`}>
          {name || ""}
        </p>
        {nRole && (
          <p className={`${pxGrotesk.className} leading-[1.08] font-medium text-[#888] whitespace-pre-wrap w-full text-[13px] mt-[3px]`}>
            {nRole}
          </p>
        )}
        {nBio && (
          <div className={`${pxGrotesk.className} text-[10px] leading-[1.3] font-light text-black/70 whitespace-pre-wrap w-full mt-[3px]`}>
            {nBio}
          </div>
        )}
      </div>
    );
  };

  const renderMemberCard = (member) => {
    const [category, name, image, role, bio] = member;
    const imageSrc = resolvePhoto(name, image);
    const isFeatured = category === "Director";
    const normalizedRole = normalizeRole(role);
    const normalizedBio = normalizeBio(bio);

    return (
      <div className="group min-w-0 flex items-start gap-6">
        <div className="flex-none">
          <div
            className={`relative overflow-hidden rounded-full transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
              isFeatured ? "w-[132px] h-[132px]" : "w-[97px] h-[97px]"
            }`}
          >
            <GreyPlaceholder className="absolute inset-0 w-full h-full" />
            {imageSrc && (
              <img
                src={imageSrc}
                alt={name || "member"}
                className={`absolute inset-0 w-full h-full object-cover filter grayscale brightness-[0.95] contrast-[1.05]`}
                style={{ objectPosition: photoPosition(name), transform: photoTransform(name, imageSrc), transformOrigin: photoOrigin(name) }}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {/* 소셜 아이콘(LinkedIn, Instagram)은 일단 숨김 처리 */}
            {/*
            <div className="pointer-events-none absolute left-3 bottom-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span aria-hidden="true">
                <svg width="39" height="40" viewBox="0 0 39 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="37" height="37" rx="9" stroke="#FFFFFF" strokeWidth="2" />
                  <path
                    d="M12.32 28V15.592H14.264V28H12.32ZM12.32 13.24V10.84H14.264V13.24H12.32ZM18.8578 15.592V17.224H18.9058C19.8658 15.944 21.1778 15.304 22.8418 15.304C24.1538 15.304 25.1778 15.648 25.9138 16.336C26.6498 17.024 27.0178 18.008 27.0178 19.288V28H25.0738V19.456C25.0738 18.656 24.8258 18.04 24.3298 17.608C23.8338 17.16 23.1458 16.936 22.2658 16.936C21.2738 16.936 20.4578 17.256 19.8178 17.896C19.1778 18.536 18.8578 19.36 18.8578 20.368V28H16.9138V15.592H18.8578Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </span>
              <span aria-hidden="true">
                <svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="37" height="37" rx="9" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="19" cy="22" r="6" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="27.5" cy="11.5" r="2.5" fill="#FFFFFF" />
                </svg>
              </span>
            </div>
            */}
          </div>
        </div>

        <div
          className={`min-w-0 flex-1 flex flex-col items-start text-left ${
            ["Student Researchers", "Alumni", "Research Interns"].includes(category) ? "pt-5" : ""
          }`}
        >
          <p className={`${pxGrotesk.className} text-[15px] sm:text-[16px] leading-[1.08] font-semibold text-black truncate w-full`}>
            {name || ""}
          </p>
          {normalizedRole && (
            <p
              className={`${pxGrotesk.className} leading-[1.08] font-medium text-[#888] whitespace-pre-wrap w-full text-[13px] sm:text-[14px] mt-[3px]`}
            >
              {normalizedRole}
            </p>
          )}
          {normalizedBio && (
            <div
              className={`${pxGrotesk.className} text-[10px] sm:text-[13px] leading-[1.3] font-light whitespace-pre-wrap w-full ${
                ["Student Researchers", "Alumni", "Research Interns"].includes(category)
                  ? "text-[#888] mt-[4px]"
                  : "text-black/70 mt-[3px]"
              }`}
            >
              {normalizedBio}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full text-black">
      <div className="w-full">
        <div className="h-[3.875rem] flex items-end pb-1.5">
          <p className={`${pxGrotesk.className} tracking-[-0.03em] leading-[1.22] whitespace-nowrap text-[1.375rem] md:text-[1.5rem] lg:text-[1.625rem]`}>People</p>
        </div>

        {/* Mobile: grouped by category (photo + name only) */}
        <div className="sm:hidden pt-4">
          {categories.map(([category, members], catIdx) => {
            const list = Array.isArray(members)
              ? members.filter((m) => m && String(m[1] || "").trim())
              : [];
            if (list.length === 0) return null;
            // Advisory Board shows role + bio in a 2-column compact grid;
            // Director is featured; the rest are a photo + name grid.
            const isLeadership = category === "Advisory Board";
            return (
              <div
                key={`m-cat-${category}`}
                className={
                  catIdx === 0
                    ? ""
                    : category === "Student Researchers"
                    ? "mt-8 pt-8"
                    : "pt-12"
                }
              >
                <div
                  className={`${pxGrotesk.className} text-[14px] leading-[1.2] font-medium text-black/60 pb-3`}
                >
                  {category}
                </div>
                {category === "Director" ? (
                  // Director: centered card with a larger photo on mobile.
                  <div className="flex flex-col gap-7">
                    {list.map((m, idx) => (
                      <div key={`md-${category}-${idx}-${m?.[1] || "m"}`} className="min-w-0">
                        {renderCompactCard(m, "w-[128px] h-[128px]")}
                      </div>
                    ))}
                  </div>
                ) : isLeadership ? (
                  // Leadership: 2-column compact cards (role + bio).
                  <div className="grid grid-cols-2 gap-x-4 gap-y-7">
                    {list.filter((m) => !MOBILE_HIDDEN.has(m?.[1])).map((m, idx) => (
                      <div key={`mc-${idx}-${m?.[1] || "m"}`} className="min-w-0">
                        {renderCompactCard(m)}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Other categories: photo + name grid, 3 per row with
                  // photos sized to match the Leadership cards (88px).
                  <div className="grid grid-cols-3 gap-x-3 gap-y-6">
                    {list.map((member, idx) => {
                      const [, name, image] = member;
                      const imageSrc = resolvePhoto(name, image);
                      return (
                        <div key={`m-${category}-${idx}-${name || "n"}`} className="min-w-0">
                          <div className="w-[88px] h-[88px] mx-auto overflow-hidden rounded-full bg-[#F6F0FF]">
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={name || "member"}
                                className={`w-full h-full object-cover filter grayscale brightness-[0.95] contrast-[1.05]`}
                                style={{ objectPosition: photoPosition(name), transform: photoTransform(name, imageSrc), transformOrigin: photoOrigin(name) }}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <GreyPlaceholder className="w-full h-full" />
                            )}
                          </div>
                          <div
                            className={`${pxGrotesk.className} pt-2 leading-[1.2] font-medium text-black text-[11px] text-center`}
                          >
                            {name || ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block pt-[1rem]">
          {categories.map(([category, members], catIdx) => {
            const list = Array.isArray(members)
              ? members.filter((m) => m && String(m[1] || "").trim())
              : [];
            if (list.length === 0) return null;
            return (
              <div key={category} className="pb-[48px]">
                <div
                  className={`${pxGrotesk.className} text-[15px] leading-[1.2] font-medium text-black/60 mb-4`}
                >
                  {category}
                </div>
                <div
                  className={`grid gap-y-[20px] ${
                    category === "Director"
                      ? "grid-cols-1 gap-x-[48px]"
                      : ["Student Researchers", "Alumni", "Research Interns"].includes(category)
                      ? "grid-cols-2 lg:grid-cols-4 gap-x-[32px]"
                      : "grid-cols-2 lg:grid-cols-3 gap-x-[48px]"
                  }`}
                >
                  {list.map((m, idx) => (
                    <Reveal
                      key={`${category}-${idx}-${m?.[1] || "m"}`}
                      className="min-w-0"
                      delay={Math.min(idx, 7) * 55}
                    >
                      {renderMemberCard(m)}
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
