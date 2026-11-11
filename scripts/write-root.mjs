// 정적 export 후처리: 언어 접두사가 없는 루트(/)에 사이트 안내 + 언어별 입구 페이지를 만든다.
// 모든 실제 페이지는 /ko/, /en/ … 아래에 있으므로, 루트는 저장된 언어 → 브라우저 언어 → 기본 언어 순으로 보낸다.
// 스크립트나 meta refresh를 따라가지 않는 크롤러는 이 HTML만 보게 되므로, 빈 언어 선택 화면이 아니라
// 사이트 설명과 가이드·형식 설명·소개로 가는 링크를 본문에 담는다.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// 언어 목록은 lib/i18n/config.ts가 원천이다. .ts를 직접 import하면 Node 버전(타입 제거 지원 여부)에 의존하게 되므로
// 필요한 세 가지(LOCALES, DEFAULT_LOCALE, LOCALE_META)만 소스 텍스트에서 읽는다.
const configSource = fs.readFileSync(path.resolve("lib/i18n/config.ts"), "utf8");
const LOCALES = [...(configSource.match(/export const LOCALES = \[([^\]]*)\] as const/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const DEFAULT_LOCALE = configSource.match(/DEFAULT_LOCALE: Locale = "([^"]+)"/)?.[1];
const LOCALE_META = Object.fromEntries(
  [...configSource.matchAll(/(\w+): \{ label: "([^"]+)", htmlLang: "([^"]+)"/g)].map((m) => [m[1], { label: m[2], htmlLang: m[3] }]),
);
if (!LOCALES.length || !DEFAULT_LOCALE || LOCALES.some((l) => !LOCALE_META[l])) {
  console.error("write-root: lib/i18n/config.ts에서 언어 설정을 읽지 못했습니다. 형식이 바뀌었다면 이 스크립트를 고치세요.");
  process.exit(1);
}

const OUT = path.resolve("out");
if (!fs.existsSync(OUT)) {
  console.error("write-root: out/ 폴더가 없습니다. 먼저 빌드하세요.");
  process.exit(1);
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://anypic.example").replace(/\/$/, "");
// 루트는 /ko/ 등으로 보내는 입구라 hreflang 대안을 선언하지 않는다(언어 페이지가 서로 되가리키지 않으면 무시됨).
// noindex도 걸지 않는다: canonical이 기본 언어 페이지를 가리키므로 루트로 들어온 링크 신호가 그쪽으로 합쳐진다.
const DESCRIPTION = "Convert any image to PNG, JPG, WebP, GIF, BMP, ICO or SVG in your browser. Files never leave your device.";

const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 언어별 본문. 여기에 없는 언어는 언어 이름 링크와 가이드 목록만 나온다.
const TEXT = {
  ko: {
    intro:
      "어떤 이미지든 올리면 형식을 자동으로 감지해 PNG, JPG, WebP, GIF, BMP, ICO, SVG로 바꿔 주는 무료 이미지 변환기입니다. 변환은 모두 브라우저 안에서 이루어지고 파일은 서버로 전송되지 않습니다. 게임을 개발하는 개인 개발자가 직접 쓰려고 만들어 운영합니다.",
    converter: "변환기 열기",
    guides: "이미지 가이드",
    formats: "이미지 형식 설명",
    about: "소개",
  },
  en: {
    intro:
      "A free image converter: add any image, the format is detected for you, and it is saved as PNG, JPG, WebP, GIF, BMP, ICO or SVG. Everything runs inside your browser and your files are never uploaded. Built and run by a solo developer who makes games and needed the tool for that work.",
    converter: "Open the converter",
    guides: "Image guides",
    formats: "Image formats explained",
    about: "About",
  },
};

/** 공개된 가이드(템플릿·draft 제외)의 슬러그와 제목. lib/guides.ts의 getAllGuides와 같은 규칙. */
function guidesOf(locale) {
  const dir = path.resolve("content/guides", locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f) && !f.startsWith("_"))
    .map((f) => ({ slug: f.replace(/\.mdx?$/, ""), data: matter(fs.readFileSync(path.join(dir, f), "utf8")).data }))
    .filter((g) => g.data.title && g.data.draft !== true)
    .map((g) => ({ slug: g.slug, title: String(g.data.title) }));
}

const sections = LOCALES.map((l) => {
  const meta = LOCALE_META[l];
  const t = TEXT[l];
  const guides = guidesOf(l);
  const nav = t
    ? `<ul class="nav"><li><a href="/${l}/">${esc(t.converter)}</a></li><li><a href="/${l}/guides/">${esc(t.guides)}</a></li><li><a href="/${l}/formats/">${esc(t.formats)}</a></li><li><a href="/${l}/about/">${esc(t.about)}</a></li></ul>`
    : "";
  const guideList = guides.length
    ? `${t ? `<h3>${esc(t.guides)}</h3>` : ""}<ul>${guides.map((g) => `<li><a href="/${l}/guides/${g.slug}/">${esc(g.title)}</a></li>`).join("")}</ul>`
    : "";
  return `<section lang="${meta.htmlLang}"><h2><a href="/${l}/" hreflang="${meta.htmlLang}">${esc(meta.label)}</a></h2>${t ? `<p>${esc(t.intro)}</p>` : ""}${nav}${guideList}</section>`;
}).join("\n");

const script = `(function(){var L=${JSON.stringify(LOCALES)},t;try{t=localStorage.getItem("lang")}catch(e){}
if(L.indexOf(t)<0){t=${JSON.stringify(DEFAULT_LOCALE)};var n=navigator.languages||[navigator.language];
for(var i=0;i<n.length;i++){var b=String(n[i]).toLowerCase().split("-")[0];if(L.indexOf(b)>=0){t=b;break}}}
location.replace("/"+t+"/"+location.search+location.hash)})();`;

// 검색엔진·애드센스 소유 확인 태그. 확인 도구는 사이트 루트(/)를 검사하므로 /ko/ 등과 같은 태그를 여기에도 넣어야 한다.
// (값은 app/[lang]/layout.tsx가 쓰는 것과 같은 환경 변수)
const verification = [
  ["google-site-verification", process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION],
  ["naver-site-verification", process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION],
  ["msvalidate.01", process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION],
  ["google-adsense-account", process.env.NEXT_PUBLIC_ADSENSE_CLIENT],
]
  .filter(([, value]) => value)
  .map(([name, value]) => `<meta name="${name}" content="${esc(value)}">`)
  .join("\n");

// 애드센스 스크립트: components/AdSenseScript.tsx와 같은 조건(게시자 ID가 있을 때)으로 루트에도 넣는다
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const adsenseScript = adsenseClient
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}" crossorigin="anonymous"></script>`
  : "";

const html = `<!doctype html>
<html lang="${LOCALE_META[DEFAULT_LOCALE].htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnyPicToAnyPic – Free image converter that runs in your browser</title>
<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${SITE}/${DEFAULT_LOCALE}/">
${verification}
${adsenseScript}
<noscript><meta http-equiv="refresh" content="0;url=/${DEFAULT_LOCALE}/"></noscript>
<script>${script}</script>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:44rem;margin:0 auto;padding:2rem 1rem}h1{text-align:center}section{margin-top:2.5rem}ul{padding-left:1.25rem}ul.nav{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem}h2 a{font-size:1.25rem}</style>
</head>
<body><main><h1>AnyPicToAnyPic</h1>
${sections}
</main></body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), html, "utf8");
console.log("write-root: out/index.html (사이트 안내 + 언어별 입구 + 리다이렉트) 생성");
