// 실제 HEIC 파일 → JPG 변환 검증. 샘플은 `node e2e/get-samples.mjs` 로 받는다.
import { chromium } from "playwright-core";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { detectFormat } from "../lib/detectFormat.ts";

const SITE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
const SAMPLES = process.env.E2E_SAMPLES ?? fileURLToPath(new URL("./samples", import.meta.url));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

const bytes = fs.readFileSync(SAMPLES + "/sample.heic");
check(detectFormat(new Uint8Array(bytes.subarray(0, 1024))) === "heic", "매직 넘버로 HEIC 감지 (major brand mif1)");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(SITE + "/ko/");
await page.locator("input[type=file]").setInputFiles({ name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: bytes });
await page.getByText("IMG_0001.HEIC").waitFor();
check((await page.locator("main li").first().innerText()).includes("HEIC"), "파일 목록에 HEIC 배지 표시");

await page.getByRole("radio", { name: "JPG", exact: true }).click();
await page.getByRole("button", { name: /변환하기/ }).click();
const section = page.locator("section[aria-labelledby=result-heading]");
await section.waitFor({ timeout: 90000 });
const text = (await section.innerText()).replace(/\n/g, " ");
check(text.includes("IMG_0001.jpg") && text.includes("1280×854"), "결과: IMG_0001.jpg, 1280×854");

const [dl] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "다운로드" }).click()]);
const out = fs.readFileSync(await dl.path());
check(detectFormat(new Uint8Array(out.subarray(0, 1024))) === "jpg", "다운로드 파일이 실제 JPG");

// 이미지가 비어 있지 않은지(밝기 분산)
const stats = await page.evaluate(async (b64) => {
  const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([u8], { type: "image/jpeg" }));
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  g.drawImage(bmp, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return { w: bmp.width, h: bmp.height, spread: max - min };
}, out.toString("base64"));
check(stats.w === 1280 && stats.h === 854 && stats.spread > 30, `출력 이미지 내용 확인 (${stats.w}×${stats.h}, 밝기 분산 ${stats.spread.toFixed(0)})`);
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 2).join(" ; ")}`);

await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
