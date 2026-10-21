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

/** "파일이 열리지 않는 이유" FAQ를 넣을 만큼 열리지 않는 환경이 실제로 있는 원본 형식 */
const OPEN_ISSUE_FORMATS: FormatId[] = ["webp", "avif", "tiff", "heic"];
export const hasOpenIssues = (id: FormatId) => OPEN_ISSUE_FORMATS.includes(id);

/** EXIF(촬영 정보)가 실제로 들어 있을 수 있는 형식 */
const EXIF_FORMATS: FormatId[] = ["jpg", "heic", "tiff", "webp", "avif"];
export const mayHaveExif = (id: FormatId) => EXIF_FORMATS.includes(id);

/** 사진·스캔본이 대부분이라 투명 배경 관련 안내가 어색한 원본 형식 (형식상 투명이 가능해도 실제로는 거의 쓰이지 않음) */
const PHOTO_SOURCE_FORMATS: FormatId[] = ["heic", "tiff"];
export const isPhotoSource = (id: FormatId) => PHOTO_SOURCE_FORMATS.includes(id);

/** 투명한 원본이 흔한 형식이 투명 없는 형식으로 바뀔 때 (배경색 채우기 안내가 의미 있는 경우) */
export function losesTransparency(from: FullFormat, to: FullFormat): boolean {
  return from.transparency && !to.transparency && !isPhotoSource(from.id);
}

/** PNG와 손실 형식을 비교하는 조합 (색이 단순한 이미지에서는 PNG가 더 작을 수 있다는 단서가 의미 있는 경우) */
export function pngVersusLossy(from: FormatId, to: FormatId): boolean {
  return (from === "png" && kindOf(to) === "lossy") || (to === "png" && kindOf(from) === "lossy");
}

/** 같은 사진을 저장했을 때 to가 from의 몇 배 용량인지 (비교할 수 없으면 null) */
export function sizeRatio(from: FormatId, to: FormatId): number | null {
  const a = TRAITS[from].photoSize;
  const b = TRAITS[to].photoSize;
  return a && b ? b / a : null;
}
