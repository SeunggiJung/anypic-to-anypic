import { describe, expect, it } from "vitest";
import { PAIRS } from "../../seo/pairs";
import type { PairContent } from "../../seo/pairLogic";
import { LOCALES } from "../config";
import { buildPairContent } from "../pairContent";
import { PAIR_NOTES as NOTES_EN } from "./en/pairNotes";
import { PAIR_NOTES as NOTES_KO } from "./ko/pairNotes";

function sentences(c: PairContent): Set<string> {
  const text = [
    ...c.lead,
    c.fromIntro,
    c.toIntro,
    ...c.changes.map((x) => x.body),
    ...c.when.map((w) => `${w}.`),
    ...c.tips,
    ...c.faq.map((f) => f.a),
  ].join(" ");
  return new Set(text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15));
}

describe("랜딩 페이지 조합", () => {
  it("입력 10종 × 출력 7종(AVIF 제외, SVG 포함) − 동일 형식 7쌍 = 63개", () => {
    expect(PAIRS).toHaveLength(63);
    expect(new Set(PAIRS.map((p) => p.slug)).size).toBe(63);
    expect(PAIRS.some((p) => p.to === "avif")).toBe(false);
    expect(PAIRS.some((p) => p.from === p.to)).toBe(false);
  });

  it("직접 쓴 팁의 조합 키가 모든 언어에서 같고 실제 조합이다", () => {
    const slugs = new Set(PAIRS.map((p) => p.slug));
    expect(Object.keys(NOTES_EN).sort()).toEqual(Object.keys(NOTES_KO).sort());
    for (const k of Object.keys(NOTES_KO)) expect(slugs.has(k), k).toBe(true);
    for (const k of Object.keys(NOTES_KO)) expect(NOTES_EN[k].tips.length, k).toBe(NOTES_KO[k].tips.length);
  });
});

for (const lang of LOCALES) {
  describe(`조합별 콘텐츠 [${lang}]`, () => {
    const contents = PAIRS.map((p) => ({ pair: p, c: buildPairContent(lang, p) }));

    it("제목·설명·H1이 모두 고유하다", () => {
      for (const key of ["title", "description", "h1"] as const) {
        expect(new Set(contents.map((x) => x.c[key])).size).toBe(contents.length);
      }
    });

    it("필수 구성요소가 충분하다", () => {
      for (const { pair, c } of contents) {
        expect(c.lead.length, pair.slug).toBe(3);
        expect(c.changes.length, pair.slug).toBeGreaterThanOrEqual(3);
        expect(c.when.length, pair.slug).toBeGreaterThanOrEqual(2);
        expect(c.faq.length, pair.slug).toBeGreaterThanOrEqual(3);
        expect(c.faq.length, pair.slug).toBeLessThanOrEqual(5);
        expect(c.table.length, pair.slug).toBe(7);
      }
    });

    it("템플릿 값이 비어 새어 나오지 않는다", () => {
      for (const { pair, c } of contents) {
        expect(JSON.stringify(c), pair.slug).not.toMatch(/undefined|NaN|null|\[object/);
      }
    });

    it("영어 페이지에 한글이, 한국어 페이지에 영어 문장이 섞이지 않는다", () => {
      if (lang !== "en") return;
      for (const { pair, c } of contents) expect(JSON.stringify(c), pair.slug).not.toMatch(/[가-힣]/);
    });

    it("페이지끼리 문장이 과하게 겹치지 않는다 (복붙형 중복 방지)", () => {
      const sets = contents.map((x) => sentences(x.c));
      let worst = { score: 0, a: "", b: "" };
      for (let i = 0; i < sets.length; i++) {
        for (let j = i + 1; j < sets.length; j++) {
          const inter = [...sets[i]].filter((s) => sets[j].has(s)).length;
          const score = inter / Math.min(sets[i].size, sets[j].size);
          if (score > worst.score) worst = { score, a: contents[i].pair.slug, b: contents[j].pair.slug };
        }
      }
      console.log(`[${lang}] 가장 유사한 두 페이지: ${worst.a} / ${worst.b} — ${(worst.score * 100).toFixed(0)}%`);
      expect(worst.score).toBeLessThan(0.6);
    });

    it("직접 쓴 팁이 있는 조합이 충분하다", () => {
      expect(contents.filter((x) => x.c.tips.length > 0).length).toBeGreaterThanOrEqual(20);
    });
  });
}
