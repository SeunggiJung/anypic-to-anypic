import { chromium } from "playwright-core";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const SAMPLES = process.env.E2E_SAMPLES ?? fileURLToPath(new URL("./samples", import.meta.url));
const BASE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
let failures = 0;
const check = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) failures++; };
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function logoPng(page) {
  return Buffer.from(await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 300; c.height = 300; const g = c.getContext("2d");
    g.fillStyle = "#e11d48"; g.beginPath(); g.arc(150, 120, 90, 0, 7); g.fill();
    g.fillStyle = "#1d4ed8"; g.fillRect(60, 200, 180, 70);
    g.fillStyle = "#ffffff"; g.font = "bold 56px Arial"; g.fillText("LOGO", 80, 252);
    const b = await new Promise((r) => c.toBlob(r)); const u = new Uint8Array(await b.arrayBuffer()); let s = ""; u.forEach((x) => (s += String.fromCharCode(x))); return btoa(s);
  }), "base64");
}
async function makeLogo() {
  const seed = await browser.newPage(); await seed.goto(`${BASE}/ko/`); const logo = await logoPng(seed); await seed.close(); return logo;
}

async function run({ lang = "ko", url, files, opts = async () => {} }) {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(`${BASE}/${lang}/${url ?? "png-to-svg/"}`);
  await page.locator("input[type=file]").setInputFiles(files);
  await page.getByText(files[0].name).waitFor();
  await opts(page);
  const panel = await page.locator("main").innerText(); // 변환 전 화면(옵션 패널)의 텍스트
  await page.getByRole("button", { name: lang === "ko" ? /변환하기/ : /Convert \d/ }).click();
  const section = page.locator("section[aria-labelledby=result-heading]");
  await section.waitFor({ timeout: 90000 });
  return { page, section, panel };
}
async function download(page, section) {
  const [dl] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: /^(다운로드|Download)$/ }).first().click()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), "utf8") };
}
/** SVG 텍스트를 실제로 그려서 픽셀을 읽는다 */
async function rasterize(page, svg, w, h) {
  return page.evaluate(async ({ svg, w, h }) => {
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
    window.__d = g.getImageData(0, 0, w, h).data; window.__w = w; return true;
  }, { svg, w, h });
}
const px = (page, x, y) => page.evaluate(([x, y]) => { const i = (y * window.__w + x) * 4; return Array.from(window.__d.slice(i, i + 4)); }, [x, y]);
const near = (p, [r, g, b, a], tol = 40) => Math.abs(p[0] - r) <= tol && Math.abs(p[1] - g) <= tol && Math.abs(p[2] - b) <= tol && (a === undefined || Math.abs(p[3] - a) <= tol);

const logo = await makeLogo();
const LOGO = { name: "logo.png", mimeType: "image/png", buffer: logo };

// 1) 로고: 변환 전 안내 + 결과
{
  const { page, section, panel: main } = await run({ files: [LOGO] });
  check(main.includes("SVG(벡터) 변환 전에 알아 두세요") && main.includes("추정") && main.includes("사진이나 그라데이션") && main.includes("글자는 글꼴이 아니라 도형") && main.includes("한 변 최대 1024px"), "SVG 선택 시 변환 전 주의사항이 표시됨");
  const t = await section.innerText();
  check(/logo\.svg/.test(t) && /300×300/.test(t), "결과: logo.svg, 300×300 표시");
  const { name, text } = await download(page, section);
  check(name === "logo.svg" && text.startsWith("<svg "), `다운로드 파일이 SVG (${name}, ${(text.length / 1024).toFixed(1)}KB)`);
  check(/width="300" height="300" viewBox="0 0 300 300"/.test(text) && text.includes("<path") && !text.includes("desc=") && !/<script/i.test(text), "width/height/viewBox가 있고 path 포함, 불필요한 속성·스크립트 없음");
  await rasterize(page, text, 300, 300);
  check(near(await px(page, 150, 60), [225, 29, 72, 255]) && near(await px(page, 100, 235), [29, 78, 216, 255]) && (await px(page, 5, 5))[3] === 0 && (await px(page, 295, 295))[3] === 0, "결과를 그려 보면 원(빨강)·사각형(파랑)이 맞고 배경은 투명");
  check(!/사진처럼 색이 많은/.test(t) && !/1024px 이내로/.test(t), "로고에는 사진·해상도 축소 경고가 나오지 않음");
  check(/원본보다 약 [\d.]+배 큽니다/.test(t), "작은 PNG 로고가 더 큰 SVG가 되면 용량 경고가 나옴: " + (t.match(/원본보다 약 [\d.]+배 큽니다/) ?? [""])[0]);
  check((await section.locator("img").count()) === 1, "SVG 결과 미리보기 이미지 표시");
  await page.close();
}

// 2) 사진: 경고(사진처럼 색이 많음 / 해상도 축소 / 원본보다 큼)
{
  const photo = fs.readFileSync(SAMPLES + "/photo.png");
  const t0 = Date.now();
  const { page, section } = await run({ files: [{ name: "photo.png", mimeType: "image/png", buffer: photo }] });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const t = await section.innerText();
  check(t.includes("결과를 확인하세요") && t.includes("사진처럼 색이 많은 이미지"), "사진: '사진처럼 색이 많은 이미지' 경고");
  check(t.includes("1024px 이내로 줄여서"), "사진: 큰 이미지라 해상도를 줄였다는 안내 (1280×854 > 1024)");
  check(/결과\(SVG\)가 원본보다 약 [\d.]+배 큽니다/.test(t), "사진: 결과가 원본보다 크다는 안내: " + (t.match(/원본보다 약 [\d.]+배 큽니다/) ?? [""])[0]);
  const { text } = await download(page, section);
  check(/width="1280" height="854" viewBox="0 0 1024 683"/.test(text), `표시 크기는 원본(1280×854), 추적 해상도는 1024 폭 (${(text.length / 1024 / 1024).toFixed(1)}MB, ${secs}초)`);
  await page.close();
}

// 3) 크기 지정(직접 지정 + 여백) → width/height 속성
{
  const { page, section } = await run({
    files: [LOGO],
    opts: async (p) => { await p.getByLabel("크기", { exact: true }).selectOption("fixed"); await p.getByLabel("가로", { exact: true }).fill("400"); await p.getByLabel("세로", { exact: true }).fill("200"); await p.locator("#opt-fit").selectOption("contain"); },
  });
  const { text } = await download(page, section);
  check(/width="400" height="200" viewBox="0 0 \d+ \d+"/.test(text), "직접 지정 400×200: SVG 표시 크기가 400×200");
  await rasterize(page, text, 400, 200);
  check((await px(page, 5, 100))[3] === 0 && near(await px(page, 200, 60), [225, 29, 72, 255]), "contain: 좌우 여백은 투명, 가운데에 원이 있음");
  await page.close();
}

// 4) 색 수 설정이 결과에 영향
{
  const photo = fs.readFileSync(SAMPLES + "/photo.png");
  const size = async (colors) => {
    const { page, section } = await run({ files: [{ name: "p.png", mimeType: "image/png", buffer: photo }], opts: async (p) => { await p.locator("#opt-svg-colors").fill(String(colors)); } });
    const { text } = await download(page, section); await page.close(); return text.length;
  };
  const a = await size(4), b = await size(32);
  check(b > a * 1.3, `색 수 4 → 32 로 늘리면 결과가 커짐 (${(a / 1024).toFixed(0)}KB → ${(b / 1024).toFixed(0)}KB)`);
}

// 5) 배경색 채우기
{
  const { page, section } = await run({ files: [LOGO], opts: async (p) => { await p.getByLabel(/배경색으로 채우기/).check(); await p.locator("#opt-bg").fill("#00ff00"); } });
  const { text } = await download(page, section);
  await rasterize(page, text, 300, 300);
  check(near(await px(page, 5, 5), [0, 255, 0, 255], 20), "'배경색으로 채우기' + 초록색: 배경이 초록으로 채워진 SVG");
  await page.close();
}

// 6) SVG 입력 → SVG 출력은 막는다
{
  const svg = { name: "v.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>') };
  const { page, section } = await run({ files: [svg] });
  check((await section.innerText()).includes("SVG는 이미 벡터 형식입니다"), "SVG → SVG는 오류로 안내");
  await page.close();
}

// 7) 여러 장 + ZIP (확장자 svg)
{
  const { page, section } = await run({ files: [{ ...LOGO, name: "a.png" }, { ...LOGO, name: "b.png" }] });
  const [dl] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "전체 ZIP 다운로드" }).click()]);
  check(/anypic-svg\.zip$/.test(dl.suggestedFilename()), "여러 장 ZIP 다운로드: " + dl.suggestedFilename());
  await page.close();
}

// 8) 설정 기억 (색 수/디테일)
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${BASE}/ko/png-to-svg/`);
  const f = { ...LOGO, name: "l.png" };
  await page.locator("input[type=file]").setInputFiles(f); await page.getByText("l.png").waitFor();
  await page.locator("#opt-svg-colors").fill("7"); await page.locator("#opt-svg-detail").selectOption("high");
  await page.reload(); await page.locator("input[type=file]").setInputFiles(f); await page.getByText("l.png").waitFor();
  check((await page.locator("#opt-svg-colors").inputValue()) === "7" && (await page.locator("#opt-svg-detail").inputValue()) === "high", "색 수·디테일 설정이 기억됨");
  await ctx.close();
}

// 9) 영어 UI
{
  const photo = fs.readFileSync(SAMPLES + "/photo.png");
  const { page, panel } = await run({ lang: "en", files: [{ name: "photo.png", mimeType: "image/png", buffer: photo }] });
  const all = await page.locator("main").innerText();
  check(panel.includes("Before you convert to SVG") && /estimate/.test(panel) && !/[가-힣]/.test(panel), "영어: 변환 전 안내가 영어로 표시, 한글 없음");
  check(all.includes("This looks like an image with many colors") && /larger than the original/.test(all) && /Please check the result/.test(all) && !/[가-힣]/.test(all), "영어: 결과 경고가 영어로 표시, 한글 없음");
  await page.close();
}

// 10) 사진 형식 힌트 (JPG 업로드 시)
{
  const seed = await browser.newPage(); await seed.goto(`${BASE}/ko/`);
  const jpg = Buffer.from(await seed.evaluate(async () => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; c.getContext("2d").fillRect(0, 0, 40, 40); const b = await new Promise((r) => c.toBlob(r, "image/jpeg")); const u = new Uint8Array(await b.arrayBuffer()); let s = ""; u.forEach((x) => (s += String.fromCharCode(x))); return btoa(s); }), "base64"); await seed.close();
  const page = await browser.newPage(); await page.goto(`${BASE}/ko/jpg-to-svg/`);
  await page.locator("input[type=file]").setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: jpg }); await page.getByText("x.jpg").waitFor();
  check((await page.locator("main").innerText()).includes("JPG·HEIC·TIFF는 사진인 경우가 많습니다"), "JPG를 올리면 '사진인 경우가 많다' 힌트 표시");
  await page.close();
}
await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
