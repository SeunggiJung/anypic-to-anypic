import { INPUT_FORMATS, OUTPUT_FORMATS, type FormatId } from "../formats";
import type { OutputFormat } from "../converters/types";

export interface Pair {
  slug: string;
  from: FormatId;
  to: OutputFormat;
}

/**
 * 랜딩 페이지를 만들 출력 형식.
 * AVIF는 브라우저의 Canvas가 AVIF 저장을 지원하는 환경이 아직 드물어서, 대부분의 방문자가
 * 도구를 쓸 수 없는 페이지가 되므로 랜딩 페이지는 만들지 않는다. (변환기 본체에서는 지원 시 선택 가능)
 */
const LANDING_OUTPUTS = (OUTPUT_FORMATS as OutputFormat[]).filter((f) => f !== "avif");

export const PAIRS: Pair[] = INPUT_FORMATS.flatMap((from) =>
  LANDING_OUTPUTS.filter((to) => to !== from).map((to) => ({ slug: `${from}-to-${to}`, from, to })),
);

export function getPair(slug: string): Pair | undefined {
  return PAIRS.find((p) => p.slug === slug);
}
