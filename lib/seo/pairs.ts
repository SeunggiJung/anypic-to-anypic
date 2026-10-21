import { INPUT_FORMATS, OUTPUT_FORMATS, type FormatId } from "../formats";
import type { OutputFormat } from "../converters/types";

export interface Pair {
  slug: string;
  from: FormatId;
  to: OutputFormat;
  /** false면 페이지는 남기되 noindex이며 sitemap·내부 링크에서 뺀다 (변환 기능은 메인 변환기에서 그대로 쓸 수 있음) */
  indexable: boolean;
}

/**
 * 검색 수요가 거의 없거나 내용이 맞지 않아 색인 대상에서 뺄 조합.
 * - 사진·래스터 → SVG: 사이트 스스로 "사진에는 트레이싱이 맞지 않다"고 안내한다. png-to-svg(로고 용도)만 유지.
 * - 수요가 낮은 조합: 변환해야 할 이유가 거의 없는 형식 쌍.
 */
const NOINDEX_SLUGS = new Set([
  "jpg-to-svg",
  "webp-to-svg",
  "avif-to-svg",
  "gif-to-svg",
  "bmp-to-svg",
  "ico-to-svg",
  "tiff-to-svg",
  "heic-to-svg",
  "heic-to-ico",
  "tiff-to-ico",
  "heic-to-gif",
  "tiff-to-gif",
  "heic-to-bmp",
  "tiff-to-bmp",
  "avif-to-bmp",
  "avif-to-gif",
]);

/**
 * 랜딩 페이지를 만들 출력 형식.
 * AVIF는 브라우저의 Canvas가 AVIF 저장을 지원하는 환경이 아직 드물어서, 대부분의 방문자가
 * 도구를 쓸 수 없는 페이지가 되므로 랜딩 페이지는 만들지 않는다. (변환기 본체에서는 지원 시 선택 가능)
 */
const LANDING_OUTPUTS = (OUTPUT_FORMATS as OutputFormat[]).filter((f) => f !== "avif");

/** 페이지가 만들어지는 모든 조합 (noindex 포함) */
export const PAIRS: Pair[] = INPUT_FORMATS.flatMap((from) =>
  LANDING_OUTPUTS.filter((to) => to !== from).map((to) => {
    const slug = `${from}-to-${to}`;
    return { slug, from, to, indexable: !NOINDEX_SLUGS.has(slug) };
  }),
);

/** sitemap과 내부 링크에 쓰는 색인 대상 조합 */
export const INDEXABLE_PAIRS: Pair[] = PAIRS.filter((p) => p.indexable);

export function getPair(slug: string): Pair | undefined {
  return PAIRS.find((p) => p.slug === slug);
}

/** 내부 링크용: 색인 대상 조합만 돌려준다 */
export function getIndexablePair(slug: string): Pair | undefined {
  const pair = getPair(slug);
  return pair?.indexable ? pair : undefined;
}
