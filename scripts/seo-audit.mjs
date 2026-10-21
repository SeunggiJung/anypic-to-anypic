// 빌드 결과(out/)의 SEO 기본 요건을 점검한다: npm run seo:audit
// 제목·설명(길이/중복), h1, canonical, hreflang 상호 참조, JSON-LD, OG 이미지, 내부 링크, sitemap 일치.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const problems = [];
const warn = (page, msg) => problems.push({ page, msg });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const rel = (file) => path.relative(OUT, file).split(path.sep).join("/");
const toUrl = (file) => "/" + rel(file).replace(/index\.html$/, "");
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const first = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : null; };

const pages = walk(OUT)
  .filter((f) => f.endsWith("index.html"))
  .map((f) => ({ url: toUrl(f), html: fs.readFileSync(f, "utf8") }))
  .filter((p) => p.url !== "/" && !["/404/", "/_not-found/"].includes(p.url)); // 루트는 리다이렉트 전용, 404는 색인 대상 아님
const urls = new Set(pages.map((p) => p.url));
const files = new Set(walk(OUT).map((f) => "/" + rel(f)));

// 의도적으로 noindex인 페이지(의미 없는 조합 등): sitemap과 색인 대상 페이지의 내부 링크에서 빠져 있어야 한다
const isNoindex = (html) => /<meta name="robots" content="[^"]*noindex/.test(html);
const noindexUrls = new Set(pages.filter((p) => isNoindex(p.html)).map((p) => p.url));

const titles = new Map();
const descs = new Map();
const hreflangs = new Map();
let jsonLdCount = 0;

for (const { url, html } of pages) {
  const title = first(html, /<title>(.*?)<\/title>/);
  const desc = first(html, /<meta name="description" content="(.*?)"\/?>/);
  const canonical = first(html, /<link rel="canonical" href="(.*?)"\/?>/);
  const lang = first(html, /<html[^>]*\slang="(.*?)"/);

  if (!title) warn(url, "title 없음");
  else {
    if (title.length > 70) warn(url, `title이 김 (${title.length}자): ${title}`);
    titles.set(title, [...(titles.get(title) ?? []), url]);
  }
  if (!desc) warn(url, "meta description 없음");
  else {
    if (desc.length < 50 || desc.length > 170) warn(url, `description 길이 ${desc.length}자 (권장 50~170)`);
    descs.set(desc, [...(descs.get(desc) ?? []), url]);
  }
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) warn(url, `h1이 ${h1}개`);
  if (!canonical || !canonical.endsWith(url)) warn(url, `canonical 불일치: ${canonical}`);
  if (!lang) warn(url, "html lang 없음");
  // noindex,follow는 의도된 설정이다. 링크까지 막는 nofollow가 붙은 경우만 문제
  if (/<meta name="robots" content="[^"]*noindex[^"]*nofollow|<meta name="robots" content="[^"]*nofollow[^"]*noindex/.test(html)) {
    warn(url, "noindex,nofollow가 설정됨");
  }
  if (!/<meta property="og:image" content="/.test(html)) warn(url, "og:image 없음");
  if (!/<meta name="twitter:card" content="summary_large_image"/.test(html)) warn(url, "twitter:card 없음");

  // hreflang 수집
  const alts = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi)].map((m) => [m[1], new URL(m[2]).pathname]);
  if (alts.length === 0) warn(url, "hreflang 없음");
  hreflangs.set(url, alts);

  // JSON-LD 유효성
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    jsonLdCount++;
    try { JSON.parse(m[1].replace(/\u003c/g, "<")); } catch { warn(url, "JSON-LD 파싱 실패"); }
  }

  // 내부 링크
  for (const m of html.matchAll(/<a [^>]*href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href.startsWith("/_next") || /\.[a-z0-9]+$/i.test(href)) { if (!files.has(href)) warn(url, `깨진 파일 링크 ${href}`); continue; }
    if (!urls.has(href)) warn(url, `깨진 내부 링크 ${href}`);
    else if (noindexUrls.has(href) && !noindexUrls.has(url)) warn(url, `noindex 페이지로 가는 내부 링크 ${href}`);
  }
  // 이미지 alt
  for (const m of html.matchAll(/<img ((?:(?!>).)*)>/g)) if (!/\salt=/.test(m[1])) warn(url, "alt 없는 img");
}

for (const [t, list] of titles) if (list.length > 1) warn(list[0], `title 중복 (${list.length}개 페이지): ${t}`);
for (const [d, list] of descs) if (list.length > 1) warn(list[0], `description 중복 (${list.length}개 페이지): ${d.slice(0, 60)}…`);

// hreflang은 서로 가리켜야 한다 (A가 B를 가리키면 B도 A를 가리킴)
for (const [url, alts] of hreflangs) {
  for (const [, target] of alts) {
    if (!urls.has(target)) { warn(url, `hreflang 대상이 없음 ${target}`); continue; }
    const back = (hreflangs.get(target) ?? []).some(([, u]) => u === url);
    if (!back) warn(url, `hreflang이 상호 참조되지 않음 → ${target}`);
  }
}

// sitemap ↔ 실제 페이지
const xml = fs.existsSync(path.join(OUT, "sitemap.xml")) ? fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8") : "";
const inSitemap = new Set([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
if (!xml) warn("/sitemap.xml", "sitemap.xml 없음");
for (const u of inSitemap) if (!urls.has(u)) warn("/sitemap.xml", `sitemap에 있지만 페이지가 없음 ${u}`);
for (const u of inSitemap) if (noindexUrls.has(u)) warn("/sitemap.xml", `noindex 페이지가 sitemap에 있음 ${u}`);
for (const u of urls) if (!inSitemap.has(u) && !noindexUrls.has(u)) warn(u, "sitemap에 없음");
const robots = fs.existsSync(path.join(OUT, "robots.txt")) ? fs.readFileSync(path.join(OUT, "robots.txt"), "utf8") : "";
if (!/Sitemap:/i.test(robots)) warn("/robots.txt", "Sitemap 지시문 없음");

console.log(`페이지 ${pages.length}개(noindex ${noindexUrls.size}개), sitemap URL ${inSitemap.size}개, JSON-LD ${jsonLdCount}개 점검`);
if (problems.length) {
  for (const p of problems.slice(0, 60)) console.log(`✗ ${p.page}  ${p.msg}`);
  if (problems.length > 60) console.log(`… 외 ${problems.length - 60}건`);
  console.log(`\n문제 ${problems.length}건`);
  process.exit(1);
}
console.log("✓ 문제 없음");
