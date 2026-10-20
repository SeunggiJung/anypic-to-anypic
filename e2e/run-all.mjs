// 모든 e2e를 순서대로 실행하고 요약한다.  node e2e/run-all.mjs   (대상: SITE, 기본 http://localhost:4173)
// 로컬 확인: `npm run build` 후 `npx serve out -l 4173` 을 띄워 두고 실행한다.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const suites = [
  ["convert.e2e.mjs", "변환 회귀 (PNG/JPG/WebP/GIF/BMP/ICO 출력, TIFF·SVG 입력, ZIP)"],
  ["heic.e2e.mjs", "실제 HEIC → JPG"],
  ["resize.e2e.mjs", "크기 조절·정렬·도트·설정 기억"],
  ["svg.e2e.mjs", "PNG 등 → SVG(트레이싱), 경고"],
  ["i18n.e2e.mjs", "언어 전환·루트 리다이렉트·404·sitemap·링크"],
];

if (!fs.existsSync(here + "samples/sample.heic") || !fs.existsSync(here + "samples/photo.png")) {
  console.log("샘플 파일이 없어 먼저 준비합니다 (e2e/get-samples.mjs)...");
  const r = spawnSync(process.execPath, [here + "get-samples.mjs"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const results = [];
for (const [file, label] of suites) {
  console.log(`\n▶ ${label}  (${file})`);
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", here + file], { stdio: "inherit", env: process.env });
  results.push([label, r.status === 0]);
}

console.log("\n===== 요약 =====");
for (const [label, ok] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
