import { describe, expect, it } from "vitest";
import { analyzeImage, buildNotes, buildPalette, traceToSvg, type PixelData } from "./vectorize";

/** 간단한 RGBA 캔버스 */
function canvas(w: number, h: number, paint: (x: number, y: number) => [number, number, number, number]): PixelData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
}

/** 투명 배경 위의 빨간 원 + 파란 사각형 (로고 비슷) */
const logo = canvas(80, 80, (x, y) => {
  if ((x - 30) ** 2 + (y - 30) ** 2 < 20 ** 2) return [220, 30, 60, 255];
  if (x > 40 && x < 75 && y > 50 && y < 75) return [30, 70, 210, 255];
  return [0, 0, 0, 0];
});

/** 픽셀마다 다른 색(사진처럼 색이 매우 많은 이미지) */
const noise = canvas(64, 64, (x, y) => [(x * 37 + y * 11) % 256, (x * 5 + y * 53) % 256, (x * 91 + y * 7) % 256, 255]);

/** 안티앨리어싱된 가장자리(색이 섞인 중간색)가 있는 로고: 빨간 원 + 파란 사각형 + 흰 글자 흉내 */
const aaLogo = canvas(120, 120, (x, y) => {
  const dist = Math.hypot(x - 45, y - 40);
  const circle = Math.min(1, Math.max(0, 30 - dist + 0.5)); // 원의 커버리지(경계에서 0~1)
  const inRect = x >= 20 && x < 100 && y >= 80 && y < 110;
  if (inRect) return [29, 78, 216, 255];
  if (circle >= 1) return [225, 29, 72, 255];
  if (circle > 0) return [225, 29, 72, Math.round(circle * 255)]; // 반투명 가장자리
  return [0, 0, 0, 0];
});

describe("buildPalette (median cut)", () => {
  const has = (pal: ReturnType<typeof buildPalette>, [r, g, b]: number[]) => pal.some((c) => c.a === 255 && c.r === r && c.g === g && c.b === b);

  it("색 수를 아주 적게 잡아도 작은 영역의 색이 사라지지 않고 평면 색이 정확하다", () => {
    for (const k of [2, 3, 4, 6, 8, 16]) {
      const pal = buildPalette(aaLogo, k);
      expect(has(pal, [225, 29, 72]), `빨강 k=${k}`).toBe(true);
      expect(has(pal, [29, 78, 216]), `파랑 k=${k}`).toBe(true);
    }
  });
  it("투명 픽셀이 있으면 완전 투명 항목이 하나 들어가고, 없으면 들어가지 않는다", () => {
    expect(buildPalette(aaLogo, 4).filter((c) => c.a === 0)).toHaveLength(1);
    expect(buildPalette(canvas(8, 8, () => [10, 20, 30, 255]), 4).filter((c) => c.a === 0)).toHaveLength(0);
  });
  it("요청한 색 수를 넘지 않는다", () => {
    expect(buildPalette(noise, 8).filter((c) => c.a === 255).length).toBeLessThanOrEqual(8);
    expect(buildPalette(noise, 32).filter((c) => c.a === 255).length).toBeLessThanOrEqual(32);
  });
  it("같은 입력은 같은 팔레트(결정적)", () => {
    expect(buildPalette(noise, 16)).toEqual(buildPalette(noise, 16));
  });
});

describe("traceToSvg: 색 보존", () => {
  it("색 수가 적어도 로고의 색이 결과 SVG에 그대로 나온다", () => {
    for (const k of [4, 8, 16]) {
      const { svg } = traceToSvg(aaLogo, { colors: k, detail: "medium" }, 120, 120);
      expect(svg, `빨강 k=${k}`).toContain("rgb(225,29,72)");
      expect(svg, `파랑 k=${k}`).toContain("rgb(29,78,216)");
    }
  });
});

describe("analyzeImage", () => {
  it("로고처럼 색이 적으면 사진으로 보지 않는다", () => {
    const a = analyzeImage(logo);
    expect(a.photoLike).toBe(false);
    expect(a.coverage).toBeGreaterThan(0.95);
  });
  it("색이 매우 많으면 사진처럼 본다", () => {
    const a = analyzeImage(noise);
    expect(a.photoLike).toBe(true);
    expect(a.coverage).toBeLessThan(0.6);
  });
  it("전부 투명한 이미지는 사진으로 보지 않는다", () => {
    expect(analyzeImage(canvas(8, 8, () => [0, 0, 0, 0])).photoLike).toBe(false);
  });
});

describe("traceToSvg", () => {
  const out = traceToSvg(logo, { colors: 8, detail: "medium" }, 400, 400);

  it("표시 크기(width/height)와 원본 좌표계(viewBox)를 분리해 적는다", () => {
    expect(out.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="400" height="400" viewBox="0 0 80 80"/);
    expect(out.svg.endsWith("</svg>")).toBe(true);
  });
  it("원본의 색이 도형으로 나온다", () => {
    expect(out.svg).toContain("rgb(220,30,60)");
    expect(out.svg).toContain("rgb(30,70,210)");
    expect(out.paths).toBeGreaterThanOrEqual(2);
  });
  it("투명 배경은 경로로 남기지 않는다", () => {
    expect(out.svg).not.toMatch(/\sopacity="0"/);
  });
  it("불필요한 속성(desc)이 없고 스크립트가 없다", () => {
    expect(out.svg).not.toContain("desc=");
    expect(out.svg).not.toMatch(/<script|onload=|javascript:/i);
  });
  it("색 수와 디테일 설정이 결과에 영향을 준다", () => {
    const rich = traceToSvg(noise, { colors: 32, detail: "high" }, 64, 64);
    const simple = traceToSvg(noise, { colors: 4, detail: "low" }, 64, 64);
    expect(rich.paths).toBeGreaterThan(simple.paths);
  });
  it("같은 입력은 같은 결과(결정적)", () => {
    expect(traceToSvg(logo, { colors: 8, detail: "medium" }, 400, 400).svg).toBe(out.svg);
  });
});

describe("buildNotes", () => {
  it("사진·축소·경로 과다를 각각 알린다", () => {
    const notes = buildNotes({ coverage: 0.3, photoLike: true, opaquePixels: 100 }, 25_000, 0.5);
    expect(notes.map((n) => n.code)).toEqual(["svgPhotoLike", "svgDownscaled", "svgComplex"]);
  });
  it("문제가 없으면 아무것도 알리지 않는다", () => {
    expect(buildNotes({ coverage: 1, photoLike: false, opaquePixels: 100 }, 50, 1)).toEqual([]);
  });
});
