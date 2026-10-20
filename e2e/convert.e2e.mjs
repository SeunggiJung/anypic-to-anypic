import { chromium } from "playwright-core";
import { unzipSync } from "../node_modules/fflate/esm/browser.js";
import { detectFormat } from "../lib/detectFormat.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SITE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
const BASE = SITE + "/ko";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a2a-"));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

/** 4x4 비압축 RGB TIFF (리틀 엔디안) */
function makeTiff() {
  const w = 4, h = 4;
  const pixels = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) pixels.set([255, i * 15, 0], i * 3);
  const entries = [
    [256, 3, 1, w], [257, 3, 1, h], [258, 3, 3, 0], [259, 3, 1, 1],
    [262, 3, 1, 2], [273, 4, 1, 0], [277, 3, 1, 3], [278, 3, 1, h], [279, 4, 1, pixels.length],
  ];
  const ifdSize = 2 + entries.length * 12 + 4;
  const bpsOffset = 8 + ifdSize;
  const dataOffset = bpsOffset + 6;
  entries[2][3] = bpsOffset;
  entries[5][3] = dataOffset;
  const buf = Buffer.alloc(dataOffset + pixels.length);
  buf.write("II", 0); buf.writeUInt16LE(42, 2); buf.writeUInt32LE(8, 4);
  buf.writeUInt16LE(entries.length, 8);
  entries.forEach(([tag, type, count, value], i) => {
    const o = 10 + i * 12;
    buf.writeUInt16LE(tag, o); buf.writeUInt16LE(type, o + 2); buf.writeUInt32LE(count, o + 4);
    if (type === 3 && count === 1) buf.writeUInt16LE(value, o + 8); else buf.writeUInt32LE(value, o + 8);
  });
  buf.writeUInt16LE(8, bpsOffset); buf.writeUInt16LE(8, bpsOffset + 2); buf.writeUInt16LE(8, bpsOffset + 4);
  pixels.copy(buf, dataOffset);
  return buf;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#e11"/><circle cx="50" cy="25" r="20" fill="#fff"/></svg>`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(BASE);

const fixtures = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 400; c.height = 300;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 400, 300);
  grad.addColorStop(0, "#08f"); grad.addColorStop(1, "#f80");
  g.fillStyle = grad; g.fillRect(100, 0, 300, 300); // 왼쪽 100px은 투명
  const toB64 = async (type) => {
    const blob = await new Promise((r) => c.toBlob(r, type, 0.9));
    if (blob.type !== type) return null;
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; buf.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  };
  return { png: await toB64("image/png"), jpg: await toB64("image/jpeg"), webp: await toB64("image/webp") };
});
check(fixtures.png && fixtures.jpg && fixtures.webp, "테스트 이미지 생성(png/jpg/webp)");

const files = [
  { name: "alpha.png", mimeType: "image/png", buffer: Buffer.from(fixtures.png, "base64") },
  { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from(fixtures.jpg, "base64") },
  { name: "web.webp", mimeType: "image/webp", buffer: Buffer.from(fixtures.webp, "base64") },
  { name: "liar.jpg", mimeType: "image/jpeg", buffer: Buffer.from(fixtures.png, "base64") }, // 실제로는 PNG
  { name: "scan.tif", mimeType: "image/tiff", buffer: makeTiff() },
  { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) },
  { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
];
await page.locator("input[type=file]").setInputFiles(files);

await page.getByText("logo.svg").waitFor();
const body = await page.locator("main").innerText();
check(body.includes("실제로는 PNG 파일"), "확장자 불일치 감지 및 안내 (liar.jpg → PNG)");
check(body.includes("지원하지 않는 형식"), "txt 파일은 지원 불가 안내");
check(/scan\.tif[\s\S]*TIFF/.test(body), "TIFF 감지");
check(/logo\.svg[\s\S]*SVG/.test(body), "SVG 감지");

const outputs = [
  ["PNG", "png", "png"], ["JPG", "jpg", "jpg"], ["WebP", "webp", "webp"],
  ["GIF", "gif", "gif"], ["BMP", "bmp", "bmp"], ["ICO", "ico", "ico"], ["AVIF", "avif", "avif"],
];
const resultSection = page.locator("section[aria-labelledby=result-heading]");

async function downloadZip() {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "전체 ZIP 다운로드" }).click()]);
  const p = path.join(tmp, dl.suggestedFilename());
  await dl.saveAs(p);
  return unzipSync(new Uint8Array(fs.readFileSync(p)));
}

const support = await page.evaluate(async () => {
  const test = (m) => new Promise((r) => { const c = document.createElement("canvas"); c.width = c.height = 2; c.toBlob((b) => r(b?.type === m), m); });
  return { avif: await test("image/avif"), webp: await test("image/webp") };
});
console.log("브라우저 지원:", JSON.stringify(support));

await page.getByRole("button", { name: /변환하기/ }).click();
for (const [label, id, ext] of outputs) {
  if (id !== "png") {
    const btn = resultSection.getByRole("button", { name: label, exact: true });
    if (!(await btn.count())) {
      check(id === "avif" && !support.avif, `${label} 재변환 버튼 없음 = 브라우저 미지원`);
      continue;
    }
    await btn.click();
  }
  await resultSection.locator("li p", { hasText: `.${ext}` }).first().waitFor({ timeout: 60000 });
  await resultSection.getByText(/개 (변환 )?완료/).waitFor();
  const entries = await downloadZip();
  const names = Object.keys(entries);
  const detected = names.map((n) => [n, detectFormat(entries[n])]);
  const okAll = detected.length === 6 && detected.every(([, f]) => f === id);
  check(okAll, `${label}: ZIP ${names.length}개 파일이 모두 실제 ${id} 형식 (${detected.map(([n, f]) => `${n}:${f}`).join(", ")})`);
}

// 투명 PNG → JPG: 투명 영역이 흰색으로 채워지는지
await resultSection.getByRole("button", { name: "JPG", exact: true }).click();
await resultSection.locator("li p", { hasText: ".jpg" }).first().waitFor();
await resultSection.getByText(/개 (변환 )?완료/).waitFor();
const jpgEntries = await downloadZip();
const alphaJpg = Buffer.from(jpgEntries["alpha.jpg"]).toString("base64");
const px = await page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext("2d"); g.drawImage(bmp, 0, 0);
  return { w: bmp.width, h: bmp.height, p: Array.from(g.getImageData(10, 10, 1, 1).data) };
}, alphaJpg);
check(px.p[0] > 240 && px.p[1] > 240 && px.p[2] > 240, `투명 영역이 흰 배경으로 채워짐 (${px.p})`);
check(px.w === 400 && px.h === 300, `원본 크기 유지 (${px.w}x${px.h})`);
check(!!jpgEntries["logo.jpg"] && !!jpgEntries["scan.jpg"], "SVG, TIFF → JPG 변환됨");

// 옵션 패널로 돌아가 리사이즈
await page.getByRole("button", { name: "옵션을 바꿔서 다시 변환" }).click();
await page.getByRole("radio", { name: "WebP" }).click();
await page.getByLabel("크기", { exact: true }).selectOption("width");
await page.getByLabel("가로 기준(px)", { exact: true }).fill("200");
await page.getByRole("button", { name: /변환하기/ }).click();
await resultSection.locator("li p", { hasText: ".webp" }).first().waitFor();
const listText = await resultSection.innerText();
check(/alpha\.webp[\s\S]*200×150/.test(listText), "가로 200px 리사이즈 → 200×150");
check(/logo\.webp[\s\S]*200×100/.test(listText), "SVG도 벡터 상태로 200×100 리사이즈");
check(/%/.test(listText) && /→/.test(listText), "변환 전후 크기 비교 표시");

check(errors.length === 0, `콘솔/페이지 오류 없음 ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ""}`);
await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
