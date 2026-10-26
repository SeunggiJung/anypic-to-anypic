// 정적 export 후처리: 언어 접두사가 없는 루트(/)에 언어 선택 + 리다이렉트 페이지를 만든다.
// 모든 실제 페이지는 /ko/, /en/ … 아래에 있으므로, 루트는 저장된 언어 → 브라우저 언어 → 기본 언어 순으로 보낸다.
import fs from "node:fs";
import path from "node:path";

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
// 루트는 /ko/ 등으로 보내는 입구일 뿐이라 hreflang 대안을 선언하지 않는다(언어 페이지가 서로 되가리키지 않으면 무시됨).
// noindex도 걸지 않는다: canonical이 기본 언어 페이지를 가리키므로 루트로 들어온 링크 신호가 그쪽으로 합쳐진다.
const DESCRIPTION = "Convert any image to PNG, JPG, WebP, GIF, BMP, ICO or SVG in your browser. Files never leave your device.";

const script = `(function(){var L=${JSON.stringify(LOCALES)},t;try{t=localStorage.getItem("lang")}catch(e){}
if(L.indexOf(t)<0){t=${JSON.stringify(DEFAULT_LOCALE)};var n=navigator.languages||[navigator.language];
for(var i=0;i<n.length;i++){var b=String(n[i]).toLowerCase().split("-")[0];if(L.indexOf(b)>=0){t=b;break}}}
location.replace("/"+t+"/"+location.search+location.hash)})();`;

const links = LOCALES.map((l) => `<li><a href="/${l}/" hreflang="${LOCALE_META[l].htmlLang}" lang="${LOCALE_META[l].htmlLang}">${LOCALE_META[l].label}</a></li>`).join("");

// 검색엔진·애드센스 소유 확인 태그. 확인 도구는 사이트 루트(/)를 검사하므로 /ko/ 등과 같은 태그를 여기에도 넣어야 한다.
// (값은 app/[lang]/layout.tsx가 쓰는 것과 같은 환경 변수)
const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const verification = [
  ["google-site-verification", process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION],
  ["naver-site-verification", process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION],
  ["msvalidate.01", process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION],
  ["google-adsense-account", process.env.NEXT_PUBLIC_ADSENSE_CLIENT],
]
  .filter(([, value]) => value)
  .map(([name, value]) => `<meta name="${name}" content="${esc(value)}">`)
  .join("\n");

// 애드센스 스크립트: app/[lang]/layout.tsx와 같은 조건(게시자 ID가 있을 때)으로 루트에도 넣는다
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const adsenseScript = adsenseClient
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}" crossorigin="anonymous"></script>`
  : "";

const html = `<!doctype html>
<html lang="${LOCALE_META[DEFAULT_LOCALE].htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnyPicToAnyPic</title>
<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${SITE}/${DEFAULT_LOCALE}/">
${verification}
${adsenseScript}
<noscript><meta http-equiv="refresh" content="0;url=/${DEFAULT_LOCALE}/"></noscript>
<script>${script}</script>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}ul{list-style:none;padding:0;display:flex;gap:1rem}a{font-size:1.25rem}</style>
</head>
<body><main><h1 style="text-align:center">AnyPicToAnyPic</h1><ul>${links}</ul></main></body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), html, "utf8");
console.log("write-root: out/index.html (언어 선택 + 리다이렉트) 생성");
