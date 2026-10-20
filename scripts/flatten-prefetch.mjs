// 정적 export 후처리: 세그먼트 prefetch 파일의 이름 형식을 맞춘다.
//
// 일부 환경(예: Windows 빌드)에서 Next가 `about/__next.about/__PAGE__.txt` 처럼 중첩 경로로 쓰는데,
// 클라이언트는 `about/__next.about.__PAGE__.txt` 를 요청해 404가 난다(페이지 이동은 동작하지만
// 콘솔에 네트워크 오류가 쌓인다). 중첩된 파일을 평면 이름으로도 복사해 두 형식을 모두 제공한다.
// 이미 평면 파일이 있으면(= Next가 올바르게 쓴 환경) 아무것도 하지 않는다.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "out");
if (!fs.existsSync(OUT)) {
  console.error(`flatten-prefetch: '${OUT}' 폴더가 없습니다. 먼저 빌드하세요.`);
  process.exit(1);
}

let copied = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) {
      flatten(full, dir, entry.name);
    } else {
      walk(full);
    }
  }
}

/** `parent/__next.a/b/c.txt` → `parent/__next.a.b.c.txt` */
function flatten(dir, parent, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      flatten(full, parent, `${prefix}.${entry.name}`);
    } else {
      const target = path.join(parent, `${prefix}.${entry.name}`);
      if (!fs.existsSync(target)) {
        fs.copyFileSync(full, target);
        copied++;
      }
    }
  }
}

walk(OUT);
console.log(`flatten-prefetch: ${copied}개 파일을 평면 이름으로 복사했습니다.`);
