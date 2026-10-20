import { chromium } from "playwright-core";
import fs from "node:fs";

const ORIGIN = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ channel: "chrome", headless: true });

/** 새 컨텍스트(저장소 초기화) + 브라우저 언어 지정 */
async function newPage(locale) {
  const ctx = await browser.newContext({ locale, viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !r.url().endsWith("/xyz/") && errors.push(`HTTP ${r.status()} ${r.url()}`));
  return { page, errors, ctx };
}

// 1) 루트 접속 → 브라우저 언어로 리다이렉트
for (const [locale, expected] of [["ko-KR", "/ko/"], ["en-US", "/en/"], ["fr-FR", "/ko/"], ["en-GB", "/en/"]]) {
  const { page, ctx } = await newPage(locale);
  await page.goto(ORIGIN + "/");
  await page.waitForURL(`**${expected}`);
  check(new URL(page.url()).pathname === expected, `루트(/) + 브라우저 언어 ${locale} → ${expected}`);
  await ctx.close();
}

// 2) 언어 전환 버튼
{
  const { page, errors } = await newPage("ko-KR");
  await page.goto(ORIGIN + "/ko/webp-to-jpg/");
  check((await page.locator("html").getAttribute("lang")) === "ko", "html lang=ko");
  check((await page.locator("h1").innerText()).includes("WebP를 JPG로 변환"), "한국어 H1");

  await page.getByRole("button", { name: /언어 선택/ }).click();
  const items = await page.locator("ul[id] a[hreflang]").allInnerTexts();
  check(items.length === 2 && items.some((t) => t.includes("English")) && items.some((t) => t.includes("한국어")), `메뉴에 모든 언어 표시: ${items.join(", ")}`);
  await page.getByRole("link", { name: "English" }).click();
  await page.waitForURL("**/en/webp-to-jpg/");
  check((await page.locator("html").getAttribute("lang")) === "en", "전환 후 html lang=en");
  check((await page.locator("h1").innerText()).includes("WebP to JPG Converter"), "영어 H1: " + (await page.locator("h1").innerText()));
  check((await page.getByRole("banner").innerText()).includes("Guides"), "영어 헤더 메뉴");
  check((await page.evaluate(() => localStorage.getItem("lang"))) === "en", "선택한 언어가 저장됨");

  // 저장된 언어는 브라우저 언어(ko)보다 우선
  await page.goto(ORIGIN + "/");
  await page.waitForURL("**/en/");
  check(true, "저장된 언어(en)로 루트 리다이렉트 (브라우저 언어 ko보다 우선)");

  // 3) 영어 변환 흐름
  await page.goto(ORIGIN + "/en/");
  const png = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 40; c.height = 30;
    const g = c.getContext("2d"); g.fillStyle = "#08f"; g.fillRect(10, 0, 30, 30);
    const b = await new Promise((r) => c.toBlob(r));
    const u = new Uint8Array(await b.arrayBuffer()); let s = ""; u.forEach((x) => (s += String.fromCharCode(x))); return btoa(s);
  });
  await page.locator("input[type=file]").setInputFiles([
    { name: "photo.jpg", mimeType: "image/png", buffer: Buffer.from(png, "base64") },
    { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hi") },
  ]);
  await page.getByText("photo.jpg").waitFor();
  const body = await page.locator("main").innerText();
  check(body.includes("is actually a PNG file"), "영어 확장자 불일치 안내");
  check(body.includes("Unsupported format"), "영어 지원 불가 안내");
  check(body.includes("Your files are never uploaded"), "영어 개인정보 문구");
  await page.getByRole("radio", { name: "JPG" }).click();
  await page.getByRole("button", { name: /Convert 1 file to JPG/ }).click();
  const res = page.locator("section[aria-labelledby=result-heading]");
  await res.waitFor();
  const rt = await res.innerText();
  check(rt.includes("1 done") && rt.includes("Download") && /smaller|larger|No change/.test(rt), "영어 결과 화면: " + rt.replace(/\n/g, " | ").slice(0, 110));
  check(!/[가-힣]/.test(await page.locator("main").innerText()), "영어 페이지 본문에 한글 없음");

  // 테마 + 언어 모두 새로고침 후 유지
  await page.reload();
  check(new URL(page.url()).pathname === "/en/", "새로고침 후에도 /en/");
  check(errors.length === 0, `콘솔/네트워크 오류 없음 ${errors.slice(0, 3).join(" ; ")}`);
}

// 4) hreflang / canonical / 구조화 데이터
{
  const { page } = await newPage("en-US");
  await page.goto(ORIGIN + "/en/formats/webp/");
  const alts = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => `${e.hreflang}=${e.getAttribute("href")}`));
  check(alts.some((a) => a.startsWith("ko=") && a.endsWith("/ko/formats/webp/")) && alts.some((a) => a.startsWith("en=") && a.endsWith("/en/formats/webp/")) && alts.some((a) => a.startsWith("x-default=")), "hreflang ko/en/x-default: " + alts.join(" "));
  check((await page.locator('link[rel=canonical]').getAttribute("href")).endsWith("/en/formats/webp/"), "canonical = /en/ 주소");
  check((await page.locator("title").innerText()).includes("What is WebP"), "영어 title: " + (await page.locator("title").innerText()));
  check((await page.locator('meta[property="og:locale"]').getAttribute("content")) === "en_US", "og:locale=en_US");
}

// 5) 모든 내부 링크(두 언어) 200 + 언어 접두사 유지
{
  const { page } = await newPage("en-US");
  for (const lang of ["ko", "en"]) {
    const hrefs = new Set();
    for (const p of ["/", "/about/", "/webp-to-jpg/", "/heic-to-png/", "/guides/", "/guides/webp-vs-jpg/", "/guides/what-is-heic/", "/formats/", "/formats/heic/", "/privacy/", "/terms/", "/contact/"]) {
      await page.goto(`${ORIGIN}/${lang}${p}`);
      for (const a of await page.locator("a[href^='/']").all()) hrefs.add((await a.getAttribute("href")).split("#")[0]);
    }
    const bad = [], wrongLang = [];
    for (const h of hrefs) {
      if (!h.startsWith(`/${lang}/`) && !h.startsWith("/_next")) wrongLang.push(h);
      const r = await page.request.get(ORIGIN + h);
      if (r.status() >= 400) bad.push(`${h} → ${r.status()}`);
    }
    // 언어 전환 메뉴 링크는 닫혀 있어 제외됨; 나머지는 같은 언어 안에서만 이동해야 한다
    check(bad.length === 0 && wrongLang.length === 0, `[${lang}] 내부 링크 ${hrefs.size}개 정상, 다른 언어로 새는 링크 없음 ${bad.concat(wrongLang).slice(0, 5)}`);
  }
}

// 6) 404: 주소의 언어로 표시
{
  const { page } = await newPage("ko-KR");
  const r = await page.goto(ORIGIN + "/en/xyz/");
  await page.getByRole("link", { name: /Go to the converter|변환기로 가기/ }).waitFor();
  const txt = await page.locator("body").innerText();
  check(r.status() === 404 && txt.includes("Page not found"), `/en/xyz/ → 404 영어 (status ${r.status()})`);
  await page.goto(ORIGIN + "/ko/xyz/");
  await page.getByRole("link", { name: /변환기로 가기/ }).waitFor();
  check((await page.locator("body").innerText()).includes("찾을 수 없는 페이지"), "/ko/xyz/ → 404 한국어");
}

// 7) sitemap에 두 언어 + alternates
{
  const xml = await (await fetch(ORIGIN + "/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  check(locs.filter((l) => l.includes("/ko/")).length === locs.filter((l) => l.includes("/en/")).length && locs.length > 140, `sitemap ${locs.length}개 URL (ko/en 동수)`);
  check(xml.includes('hreflang="en"') && xml.includes('hreflang="ko"') && xml.includes("x-default"), "sitemap hreflang alternates");
}

await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
