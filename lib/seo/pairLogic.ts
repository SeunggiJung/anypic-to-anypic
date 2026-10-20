import { FORMATS, TRAITS, type FormatId, type ImageFormat } from "../formats";
import type { FormatText } from "../formatText";

/** 조합 페이지 콘텐츠 생성기가 언어와 무관하게 공유하는 타입과 판단 로직 */

export interface Change {
  title: string;
  body: string;
}

export interface PairContent {
  title: string;
  description: string;
  h1: string;
  lead: string[];
  /** 두 형식 각각의 소개 (형식 설명 페이지의 첫 문단) */
  fromIntro: string;
  toIntro: string;
  table: Array<{ label: string; from: string; to: string }>;
  changes: Change[];
  when: string[];
  tips: string[];
  faq: Array<{ q: string; a: string }>;
}

/** 형식 메타데이터 + 해당 언어의 설명 텍스트 */
export type FullFormat = ImageFormat & FormatText;

export function fullFormat(id: FormatId, text: Record<FormatId, FormatText>): FullFormat {
  return { ...FORMATS[id], ...text[id] };
}

export type Kind = "lossless" | "lossy" | "vector";

export function kindOf(id: FormatId): Kind {
  if (id === "svg") return "vector";
  if (id === "jpg" || id === "heic" || id === "webp" || id === "avif") return "lossy";
  return "lossless";
}

/** 같은 사진을 저장했을 때 to가 from의 몇 배 용량인지 (비교할 수 없으면 null) */
export function sizeRatio(from: FormatId, to: FormatId): number | null {
  const a = TRAITS[from].photoSize;
  const b = TRAITS[to].photoSize;
  return a && b ? b / a : null;
}
