import { describe, expect, it } from "vitest";
import { extractExifSegment, injectExif, resetOrientation } from "./exif";
import { computeLayout } from "./size";
import { ConvertError, type ResizeOptions } from "./types";

const R = (mode: ResizeOptions["mode"], extra: Partial<ResizeOptions> = {}): ResizeOptions => ({
  mode,
  width: 100,
  height: 100,
  percent: 100,
  fit: "contain",
  alignX: 0.5,
  alignY: 0.5,
  ...extra,
});

describe("computeLayout: 한쪽 기준 / 비율", () => {
  it("원본 유지", () => {
    expect(computeLayout(1000, 500, R("original"))).toEqual({ width: 1000, height: 500, dx: 0, dy: 0, dw: 1000, dh: 500 });
  });
  it("가로 기준은 비율 유지", () => {
    expect(computeLayout(1000, 500, R("width", { width: 400 }))).toMatchObject({ width: 400, height: 200 });
  });
  it("세로 기준은 비율 유지", () => {
    expect(computeLayout(1000, 500, R("height", { height: 100 }))).toMatchObject({ width: 200, height: 100 });
  });
  it("퍼센트", () => {
    expect(computeLayout(1001, 333, R("percent", { percent: 50 }))).toMatchObject({ width: 501, height: 167 });
  });
  it("최소 1px", () => {
    expect(computeLayout(10, 1, R("width", { width: 1 }))).toMatchObject({ width: 1, height: 1 });
  });
  it("너무 크면 tooBig", () => {
    expect(() => computeLayout(1000, 1000, R("width", { width: 20000 }))).toThrow(ConvertError);
    expect(() => computeLayout(10, 10, R("fixed", { width: 20000, height: 10 }))).toThrow(ConvertError);
  });
});

describe("computeLayout: 가로×세로 직접 지정 (fixed)", () => {
  it("contain: 256×128 → 256×256 은 중앙에 놓고 위아래를 여백으로 (확대·축소 없음)", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "contain" }))).toEqual({
      width: 256, height: 256, dx: 0, dy: 64, dw: 256, dh: 128,
    });
  });
  it("contain: 더 큰 캔버스면 비율을 유지하며 확대해 맞춘다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 512, height: 512, fit: "contain" }))).toEqual({
      width: 512, height: 512, dx: 0, dy: 128, dw: 512, dh: 256,
    });
  });
  it("contain: 세로로 긴 이미지는 좌우 여백", () => {
    expect(computeLayout(100, 400, R("fixed", { width: 200, height: 200, fit: "contain" }))).toEqual({
      width: 200, height: 200, dx: 75, dy: 0, dw: 50, dh: 200,
    });
  });
  it("cover: 비율을 유지하며 꽉 채우고 넘치는 부분은 음수 좌표로 잘린다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "cover" }))).toEqual({
      width: 256, height: 256, dx: -128, dy: 0, dw: 512, dh: 256,
    });
  });
  it("stretch: 비율을 무시하고 지정 크기로", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 100, height: 300, fit: "stretch" }))).toEqual({
      width: 100, height: 300, dx: 0, dy: 0, dw: 100, dh: 300,
    });
  });
  it("center: 원본 크기 그대로 중앙, 캔버스가 작으면 음수 좌표로 잘린다", () => {
    expect(computeLayout(64, 64, R("fixed", { width: 256, height: 256, fit: "center" }))).toEqual({
      width: 256, height: 256, dx: 96, dy: 96, dw: 64, dh: 64,
    });
    expect(computeLayout(300, 100, R("fixed", { width: 200, height: 200, fit: "center" }))).toMatchObject({ dx: -50, dy: 50, dw: 300, dh: 100 });
  });
});

describe("computeLayout: 정렬 위치", () => {
  it("contain: 위쪽 정렬이면 여백은 아래에만 생긴다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "contain", alignY: 0 }))).toMatchObject({ dx: 0, dy: 0, dw: 256, dh: 128 });
  });
  it("contain: 아래쪽 정렬이면 여백은 위에만 생긴다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "contain", alignY: 1 }))).toMatchObject({ dy: 128 });
  });
  it("contain: 세로로 긴 이미지를 오른쪽 정렬", () => {
    expect(computeLayout(100, 400, R("fixed", { width: 200, height: 200, fit: "contain", alignX: 1 }))).toMatchObject({ dx: 150, dw: 50 });
  });
  it("cover: 왼쪽 정렬이면 오른쪽이 잘린다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "cover", alignX: 0 }))).toMatchObject({ dx: 0, dw: 512 });
  });
  it("cover: 오른쪽 정렬이면 왼쪽이 잘린다", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 256, fit: "cover", alignX: 1 }))).toMatchObject({ dx: -256, dw: 512 });
  });
  it("center: 좌상단 정렬", () => {
    expect(computeLayout(64, 64, R("fixed", { width: 256, height: 256, fit: "center", alignX: 0, alignY: 0 }))).toMatchObject({ dx: 0, dy: 0, dw: 64, dh: 64 });
  });
  it("stretch는 정렬과 무관", () => {
    expect(computeLayout(64, 64, R("fixed", { width: 100, height: 50, fit: "stretch", alignX: 1, alignY: 1 }))).toMatchObject({ dx: 0, dy: 0, dw: 100, dh: 50 });
  });
});

describe("computeLayout: ICO (최대 256 정사각형)", () => {
  it("큰 이미지는 비율을 유지해 줄이고 가운데에 놓는다", () => {
    expect(computeLayout(1000, 500, R("original"), "ico")).toEqual({ width: 256, height: 256, dx: 0, dy: 64, dw: 256, dh: 128 });
  });
  it("작은 이미지는 확대하지 않고 정사각형 안에 가운데", () => {
    expect(computeLayout(64, 32, R("original"), "ico")).toEqual({ width: 64, height: 64, dx: 0, dy: 16, dw: 64, dh: 32 });
  });
  it("fixed 512×512 contain 은 전체를 0.5배로 줄여 256×256", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 512, height: 512, fit: "contain" }), "ico")).toEqual({
      width: 256, height: 256, dx: 0, dy: 64, dw: 256, dh: 128,
    });
  });
  it("fixed 256×128 은 정사각형 256으로 가운데", () => {
    expect(computeLayout(256, 128, R("fixed", { width: 256, height: 128, fit: "stretch" }), "ico")).toMatchObject({
      width: 256, height: 256, dy: 64, dw: 256, dh: 128,
    });
  });
});

/** Orientation=6 인 최소 Exif JPEG 조각 */
function makeExifJpeg(): Uint8Array {
  const tiff = [
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // 헤더(빅 엔디안), IFD0 오프셋 8
    0, 1, // 엔트리 1개
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, // Orientation = 6
    0, 0, 0, 0, // 다음 IFD 없음
  ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...payload, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

describe("exif", () => {
  it("Exif 세그먼트를 추출하고 Orientation을 1로 바꾼다", () => {
    const seg = extractExifSegment(makeExifJpeg());
    expect(seg).not.toBeNull();
    const fixed = resetOrientation(seg!);
    // 마커2 + 길이2 + 'Exif\0\0'6 = 10, TIFF 시작 후 IFD: 8 + 2 + (tag2+type2+count4) = 값 위치
    expect(fixed[10 + 8 + 2 + 8 + 1]).toBe(1);
    expect(seg![10 + 8 + 2 + 8 + 1]).toBe(6); // 원본 사본은 변하지 않음
  });
  it("Exif가 없으면 null", () => {
    expect(extractExifSegment(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
    expect(extractExifSegment(new Uint8Array([1, 2, 3]))).toBeNull();
  });
  it("JFIF 뒤에 끼워 넣는다", () => {
    const jfif = [0xff, 0xe0, 0, 4, 0x4a, 0x46];
    const jpeg = new Uint8Array([0xff, 0xd8, ...jfif, 0xff, 0xda, 0, 2]);
    const seg = new Uint8Array([0xff, 0xe1, 0, 2]);
    const out = injectExif(jpeg, seg);
    expect(Array.from(out.slice(0, 14))).toEqual([0xff, 0xd8, ...jfif, 0xff, 0xe1, 0, 2, 0xff, 0xda]);
  });
});
