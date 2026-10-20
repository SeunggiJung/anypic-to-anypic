import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "./converters/types";
import { sanitizeOptions } from "./optionsStore";

describe("sanitizeOptions", () => {
  it("비어 있거나 이상한 값이면 기본값", () => {
    expect(sanitizeOptions(null)).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions("x")).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions({})).toEqual(DEFAULT_OPTIONS);
  });
  it("올바른 값은 그대로 유지", () => {
    const saved = {
      ...DEFAULT_OPTIONS,
      output: "webp" as const,
      quality: 70,
      resize: { mode: "fixed" as const, width: 256, height: 256, percent: 50, fit: "cover" as const, alignX: 0 as const, alignY: 1 as const },
      background: "#00ff00",
      fillBackground: true,
      pixelArt: true,
    };
    expect(sanitizeOptions(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });
  it("범위를 벗어난 숫자는 허용 범위로, 알 수 없는 항목은 기본값으로", () => {
    const o = sanitizeOptions({
      output: "tiff", // 출력 불가 형식
      quality: 500,
      resize: { mode: "bogus", width: 99999, height: -4, percent: 0, fit: "x", alignX: 0.3, alignY: "top" },
      background: "red",
      fillBackground: "yes",
    });
    expect(o.output).toBe(DEFAULT_OPTIONS.output);
    expect(o.quality).toBe(100);
    expect(o.resize).toMatchObject({ mode: "original", width: 16384, height: 1, percent: 1, fit: "contain", alignX: 0.5, alignY: 0.5 });
    expect(o.background).toBe("#ffffff");
    expect(o.fillBackground).toBe(false);
  });
});
