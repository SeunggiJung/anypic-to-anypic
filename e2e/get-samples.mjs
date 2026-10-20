// e2e 테스트용 샘플 파일(저장소에는 넣지 않음, e2e/samples/ 는 .gitignore)을 준비한다.
//   sample.heic : libheif 예제 HEIC (1280×854, 701KB)
//   photo.png   : 위 HEIC를 이 사이트로 변환한 PNG (SVG 사진 경고 테스트에 사용)
// 사용: 사이트를 띄운 상태에서  node e2e/get-samples.mjs   (SITE 기본값 http://localhost:4173)
import { chromium } from "playwright-core";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
const DIR = process.env.E2E_SAMPLES ?? fileURLToPath(new URL("./samples", import.meta.url));
const HEIC_URL = "https://github.com/strukturag/libheif/raw/master/examples/example.heic";

fs.mkdirSync(DIR, { recursive: true });

const heicPath = DIR + "/sample.heic";
if (!fs.existsSync(heicPath)) {
  const res = await fetch(HEIC_URL);
  if (!res.ok) throw new Error(`HEIC 샘플을 내려받지 못했습니다: ${res.status}`);
  fs.writeFileSync(heicPath, Buffer.from(await res.arrayBuffer()));
  console.log("saved", heicPath);
}

const pngPath = DIR + "/photo.png";
if (!fs.existsSync(pngPath)) {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(SITE + "/ko/");
  await page.locator("input[type=file]").setInputFiles({ name: "photo.heic", mimeType: "image/heic", buffer: fs.readFileSync(heicPath) });
  await page.getByText("photo.heic").waitFor();
  await page.getByRole("radio", { name: "PNG", exact: true }).click();
  await page.getByRole("button", { name: /변환하기/ }).click();
  const section = page.locator("section[aria-labelledby=result-heading]");
  await section.waitFor({ timeout: 90000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "다운로드" }).click()]);
  await dl.saveAs(pngPath);
  await browser.close();
  console.log("saved", pngPath);
}
console.log("샘플 준비 완료:", DIR);
