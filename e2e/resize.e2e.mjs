import { chromium } from "playwright-core";
import fs from "node:fs";

const SITE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
const BASE = SITE + "/ko";
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ channel: "chrome", headless: true });

/** 256×128 불투명 이미지: 왼쪽 절반 빨강, 오른쪽 절반 파랑 */
async function makeSource(page) {
  return page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#ff0000"; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#0000ff"; g.fillRect(128, 0, 128, 128);
    const b = await new Promise((r) => c.toBlob(r));
    const u = new Uint8Array(await b.arrayBuffer()); let s = ""; u.forEach((x) => (s += String.fromCharCode(x))); return btoa(s);
  });
}

/** 변환 후 첫 번째 결과 파일을 내려받아 {w,h,px(x,y)} 로 읽는다 */
async function run({ file, format = "PNG", mode, w, h, height, fit, fill, color, preset, alignName, pixel }) {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(BASE + "/");
  const input = file ?? { name: "src.png", mimeType: "image/png", buffer: Buffer.from(await makeSource(page), "base64") };
  await page.locator("input[type=file]").setInputFiles(input);
  await page.getByText(input.name).waitFor();
  await page.getByRole("radio", { name: format, exact: true }).click();
  if (mode) await page.getByLabel("크기", { exact: true }).selectOption(mode);
  if (preset) await page.getByRole("button", { name: preset }).click();
  if (w) { const f = page.getByLabel("가로", { exact: true }); await f.fill(String(w)); }
  if (h) { const f = page.getByLabel("세로", { exact: true }); await f.fill(String(h)); }
  if (height) { await page.getByLabel("세로 기준(px)", { exact: true }).fill(String(height)); }
  if (fit) await page.locator("#opt-fit").selectOption(fit);
  if (alignName) await page.getByRole("radio", { name: alignName, exact: true }).click();
  if (pixel) await page.getByLabel(/도트/).check();
  if (fill) await page.getByLabel(/배경색으로 채우기/).check();
  if (color) await page.locator("#opt-bg").fill(color);
  await page.getByRole("button", { name: /변환하기/ }).click();
  const section = page.locator("section[aria-labelledby=result-heading]");
  await section.waitFor();
  const [dl] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "다운로드" }).click()]);
  const bytes = fs.readFileSync(await dl.path());
  const info = await page.evaluate(async ({ b64, mime }) => {
    const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([u8], { type: mime }));
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext("2d"); g.drawImage(bmp, 0, 0);
    window.__d = g.getImageData(0, 0, bmp.width, bmp.height).data; window.__w = bmp.width;
    return { w: bmp.width, h: bmp.height };
  }, { b64: bytes.toString("base64"), mime: { PNG: "image/png", JPG: "image/jpeg", ICO: "image/x-icon", WebP: "image/webp" }[format] });
  const px = (x, y) => page.evaluate(([x, y]) => { const i = (y * window.__w + x) * 4; return Array.from(window.__d.slice(i, i + 4)); }, [x, y]);
  const text = await section.innerText();
  return { ...info, px, bytes, text, page };
}
const near = (p, [r, g, b, a], tol = 12) => Math.abs(p[0] - r) <= tol && Math.abs(p[1] - g) <= tol && Math.abs(p[2] - b) <= tol && (a === undefined || Math.abs(p[3] - a) <= tol);

// 1) 256×128 → 256×256 (비율 유지 + 여백): 요청하신 대표 사례
{
  const r = await run({ mode: "fixed", w: 256, h: 256, fit: "contain" });
  check(r.w === 256 && r.h === 256, `contain PNG: 256×256 (${r.w}×${r.h})`);
  check(near(await r.px(128, 10), [0, 0, 0, 0]) && near(await r.px(128, 250), [0, 0, 0, 0]), "위·아래 여백은 투명");
  check(near(await r.px(10, 128), [255, 0, 0, 255]) && near(await r.px(246, 128), [0, 0, 255, 255]), "이미지는 중앙에 원본 그대로(좌 빨강/우 파랑)");
  check((await r.px(128, 63))[3] === 0 && (await r.px(128, 64))[3] === 255 && (await r.px(128, 191))[3] === 255 && (await r.px(128, 192))[3] === 0, "이미지 영역은 정확히 y=64..191 (중앙 정렬)");
  check(r.text.includes("256×256"), "결과 목록에 256×256 표시");
  await r.page.close();
}
// 2) JPG는 투명이 없으므로 배경색(기본 흰색)
{
  const r = await run({ format: "JPG", mode: "fixed", w: 256, h: 256, fit: "contain" });
  check(near(await r.px(128, 10), [255, 255, 255], 6), "JPG 여백은 흰색 배경");
  await r.page.close();
}
// 3) PNG라도 '배경색으로 채우기' + 색 지정
{
  const r = await run({ mode: "fixed", w: 256, h: 256, fit: "contain", fill: true, color: "#00ff00" });
  check(near(await r.px(128, 10), [0, 255, 0, 255]), "PNG 여백을 지정한 초록색으로 채움");
  await r.page.close();
}
// 4) cover: 꽉 채우고 넘치는 부분 잘라냄
{
  const r = await run({ mode: "fixed", w: 256, h: 256, fit: "cover" });
  check(r.w === 256 && r.h === 256 && (await r.px(128, 5))[3] === 255 && (await r.px(5, 5))[3] === 255 && (await r.px(250, 250))[3] === 255, "cover: 여백 없이 꽉 참");
  check(near(await r.px(60, 128), [255, 0, 0, 255]) && near(await r.px(200, 128), [0, 0, 255, 255]), "cover: 중앙 기준으로 자름(좌 빨강/우 파랑 유지)");
  await r.page.close();
}
// 5) stretch: 비율 무시
{
  const r = await run({ mode: "fixed", w: 100, h: 300, fit: "stretch" });
  check(r.w === 100 && r.h === 300 && near(await r.px(10, 5), [255, 0, 0, 255]) && near(await r.px(90, 295), [0, 0, 255, 255]), `stretch: 100×300 강제 (${r.w}×${r.h})`);
  await r.page.close();
}
// 6) center: 원본 크기 유지 + 중앙 (캔버스가 더 작으면 잘림)
{
  const r = await run({ mode: "fixed", w: 128, h: 128, fit: "center" });
  check(r.w === 128 && r.h === 128 && near(await r.px(60, 64), [255, 0, 0, 255]) && near(await r.px(70, 64), [0, 0, 255, 255]), "center: 원본 크기 그대로 가운데를 잘라냄(경계 x=64)");
  await r.page.close();
}
// 7) 세로 기준
{
  const r = await run({ mode: "height", height: 64 });
  check(r.w === 128 && r.h === 64, `세로 64px 기준 → 128×64 (${r.w}×${r.h})`);
  await r.page.close();
}
// 8) 프리셋 버튼
{
  const r = await run({ mode: "fixed", preset: "512×512", fit: "contain" });
  check(r.w === 512 && r.h === 512 && (await r.px(256, 100))[3] === 0 && near(await r.px(10, 256), [255, 0, 0, 255]), `프리셋 512×512 + contain (확대): ${r.w}×${r.h}`);
  await r.page.close();
}
// 9) ICO: 지정 크기가 256을 넘으면 256 정사각형으로
{
  const r = await run({ format: "ICO", mode: "fixed", w: 512, h: 512, fit: "contain" });
  check(r.w === 256 && r.h === 256 && r.bytes[6] === 0 /* 폭 0 = 256 */, `ICO: 512 지정 → 256×256 (${r.w}×${r.h})`);
  await r.page.close();
}
// 10) SVG: 벡터 상태로 지정 크기에 맞춰 그림 + 여백
{
  const svg = { name: "v.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#ff0000"/></svg>') };
  const r = await run({ file: svg, mode: "fixed", w: 200, h: 200, fit: "contain" });
  check(r.w === 200 && r.h === 200 && (await r.px(100, 20))[3] === 0 && near(await r.px(100, 100), [255, 0, 0, 255]) && (await r.px(100, 49))[3] === 0 && (await r.px(100, 51))[3] === 255, "SVG contain: 200×200, 가운데 200×100만 채워짐");
  await r.page.close();
  const r2 = await run({ file: svg, mode: "fixed", w: 300, h: 100, fit: "cover" });
  check(r2.w === 300 && r2.h === 100 && (await r2.px(5, 5))[3] === 255 && (await r2.px(295, 95))[3] === 255, "SVG cover: 300×100 꽉 참");
  await r2.page.close();
}
// 11) 숫자 입력: 지우고 다시 쓰기, 프리셋과 연동
{
  const page = await browser.newPage();
  await page.goto(BASE + "/");
  await page.locator("input[type=file]").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from(await makeSource(page), "base64") });
  await page.getByText("a.png").waitFor();
  await page.getByLabel("크기", { exact: true }).selectOption("fixed");
  const w = page.getByLabel("가로", { exact: true });
  await w.press("Control+A"); await w.press("Backspace");
  check((await w.inputValue()) === "", "입력칸을 완전히 지울 수 있음");
  await w.pressSequentially("300");
  check((await w.inputValue()) === "300", "300 입력");
  await w.press("Tab");
  await page.getByRole("button", { name: "128×128" }).click();
  check((await w.inputValue()) === "128" && (await page.getByLabel("세로", { exact: true }).inputValue()) === "128", "프리셋 클릭 시 값 반영");
  await w.fill("99999"); await w.press("Tab");
  check((await w.inputValue()) === "16384", "최대값(16384)으로 제한: " + (await w.inputValue()));
  await page.close();
}

// 13) 정렬 위치
{
  let r = await run({ mode: "fixed", w: 256, h: 256, fit: "contain", alignName: "아래" });
  check((await r.px(128, 100))[3] === 0 && (await r.px(128, 127))[3] === 0 && (await r.px(128, 128))[3] === 255 && (await r.px(128, 255))[3] === 255, "contain + 아래 정렬: 이미지는 y=128..255, 위쪽만 여백");
  await r.page.close();
  r = await run({ mode: "fixed", w: 256, h: 256, fit: "contain", alignName: "위" });
  check((await r.px(128, 0))[3] === 255 && (await r.px(128, 127))[3] === 255 && (await r.px(128, 128))[3] === 0, "contain + 위 정렬: 이미지는 y=0..127, 아래쪽만 여백");
  await r.page.close();
  r = await run({ mode: "fixed", w: 256, h: 256, fit: "cover", alignName: "왼쪽" });
  check(near(await r.px(120, 128), [255, 0, 0, 255]) && near(await r.px(250, 128), [255, 0, 0, 255]) , "cover + 왼쪽 정렬: 왼쪽(빨강)이 남고 오른쪽(파랑)이 잘림");
  await r.page.close();
  r = await run({ mode: "fixed", w: 256, h: 256, fit: "cover", alignName: "오른쪽" });
  check(near(await r.px(5, 128), [0, 0, 255, 255]) && near(await r.px(250, 128), [0, 0, 255, 255]), "cover + 오른쪽 정렬: 오른쪽(파랑)이 남음");
  await r.page.close();
  r = await run({ mode: "fixed", w: 256, h: 256, fit: "contain", alignName: "왼쪽 위", w2: 0 });
  check((await r.px(5, 5))[3] === 255 && (await r.px(5, 200))[3] === 0, "왼쪽 위 정렬 격자 버튼 동작");
  await r.page.close();
}
// 14) 도트 모드: 2×1(빨강|파랑)을 8×4로 확대
{
  const mk = async () => {
    const p = await browser.newPage(); await p.goto(BASE + "/");
    const b64 = await p.evaluate(async () => { const c = document.createElement("canvas"); c.width = 2; c.height = 1; const g = c.getContext("2d"); g.fillStyle = "#f00"; g.fillRect(0, 0, 1, 1); g.fillStyle = "#00f"; g.fillRect(1, 0, 1, 1); const bl = await new Promise((r) => c.toBlob(r)); const u = new Uint8Array(await bl.arrayBuffer()); let s = ""; u.forEach((x) => (s += String.fromCharCode(x))); return btoa(s); });
    await p.close();
    return { name: "dot.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") };
  };
  const dot = await mk();
  const on = await run({ file: dot, mode: "fixed", w: 8, h: 4, fit: "stretch", pixel: true });
  const a = await on.px(3, 2), b = await on.px(4, 2);
  check(near(a, [255, 0, 0, 255], 2) && near(b, [0, 0, 255, 255], 2), `도트 모드: 경계가 선명 (x=3 ${a}, x=4 ${b})`);
  await on.page.close();
  const off = await run({ file: dot, mode: "fixed", w: 8, h: 4, fit: "stretch" });
  const c1 = await off.px(3, 2), c2 = await off.px(4, 2);
  check(!near(c1, [255, 0, 0, 255], 2) || !near(c2, [0, 0, 255, 255], 2), `일반 모드는 보간됨 (x=3 ${c1}, x=4 ${c2})`);
  await off.page.close();
}
// 15) 설정 기억 / 랜딩 우선 / 초기화
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  const b64 = await makeSource(page);
  const file = { name: "m.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") };
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("m.png").waitFor();
  await page.getByRole("radio", { name: "WebP", exact: true }).click();
  await page.getByLabel("크기", { exact: true }).selectOption("fixed");
  await page.getByLabel("가로", { exact: true }).fill("333");
  await page.getByLabel("세로", { exact: true }).fill("222");
  await page.locator("#opt-fit").selectOption("cover");
  await page.getByRole("radio", { name: "왼쪽 위", exact: true }).click();
  await page.locator("#opt-quality").fill("55");
  await page.reload();
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("m.png").waitFor();
  check((await page.getByRole("radio", { name: "WebP", exact: true }).getAttribute("aria-checked")) === "true", "새로고침 후 출력 형식(WebP) 기억");
  check((await page.getByLabel("크기", { exact: true }).inputValue()) === "fixed" && (await page.getByLabel("가로", { exact: true }).inputValue()) === "333" && (await page.getByLabel("세로", { exact: true }).inputValue()) === "222", "크기 설정 기억 (직접 지정 333×222)");
  check((await page.locator("#opt-fit").inputValue()) === "cover" && (await page.getByRole("radio", { name: "왼쪽 위", exact: true }).getAttribute("aria-checked")) === "true" && (await page.locator("#opt-quality").inputValue()) === "55", "맞춤 방식·정렬·품질 기억");
  // 랜딩 페이지는 출력 형식만 자기 것을 쓰고 나머지 설정은 기억된 값
  await page.goto(BASE + "/webp-to-jpg/");
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("m.png").waitFor();
  check((await page.getByRole("radio", { name: "JPG", exact: true }).getAttribute("aria-checked")) === "true" && (await page.getByLabel("가로", { exact: true }).inputValue()) === "333", "랜딩은 출력 JPG 우선 + 나머지 설정은 기억값");
  await page.goto(BASE + "/");
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("m.png").waitFor();
  check((await page.getByRole("radio", { name: "WebP", exact: true }).getAttribute("aria-checked")) === "true", "랜딩 방문이 '마지막 형식'(WebP)을 덮어쓰지 않음");
  await page.getByRole("button", { name: "설정 초기화" }).click();
  check((await page.getByLabel("크기", { exact: true }).inputValue()) === "original" && (await page.getByRole("radio", { name: "WebP", exact: true }).getAttribute("aria-checked")) === "true", "초기화: 크기는 원본으로, 출력 형식은 유지");
  // 깨진 저장값에도 정상 동작
  await page.evaluate(() => localStorage.setItem("anypic:options:v1", "{broken"));
  await page.reload();
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("m.png").waitFor();
  check((await page.getByLabel("크기", { exact: true }).inputValue()) === "original", "깨진 저장값은 기본값으로 복구");
  // 서버로 나가는 요청에 설정이 없음(정적 사이트) — 저장은 localStorage뿐
  await ctx.close();
}

// 12) 영어 UI
{
  const page = await browser.newPage();
  await page.goto(SITE + "/en/");
  await page.locator("input[type=file]").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from(await makeSource(page), "base64") });
  await page.getByText("a.png").waitFor();
  await page.getByLabel("Size", { exact: true }).selectOption("fixed");
  const txt = await page.locator("main").innerText();
  check(txt.includes("How to fit") && txt.includes("Common sizes") && !/[가-힣]/.test(txt), "영어 UI에 맞춤 옵션 표시, 한글 없음");
  await page.close();
}
await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
