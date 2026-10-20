import type { FormatId } from "../formats";

export type OutputFormat = Extract<FormatId, "png" | "jpg" | "webp" | "avif" | "gif" | "bmp" | "ico" | "svg">;

/** original: 그대로 · width/height: 한쪽 기준(비율 유지) · percent: 비율(%) · fixed: 가로×세로를 직접 지정 */
export type ResizeMode = "original" | "width" | "height" | "percent" | "fixed";

/**
 * fixed 모드에서 원본을 지정한 크기에 맞추는 방법
 * - stretch: 비율을 무시하고 늘리거나 줄여 맞춤
 * - contain: 비율을 유지하며 안에 맞추고 중앙 정렬, 남는 곳은 빈 배경(여백)
 * - cover: 비율을 유지하며 빈틈없이 채우고 넘치는 부분은 잘라냄
 * - center: 원본 크기 그대로 중앙에 배치 (캔버스가 작으면 잘리고, 크면 여백)
 */
export type FitMode = "stretch" | "contain" | "cover" | "center";

/** 정렬 위치: 0 = 왼쪽/위, 0.5 = 가운데, 1 = 오른쪽/아래 */
export type Align = 0 | 0.5 | 1;

export interface ResizeOptions {
  mode: ResizeMode;
  /** width·fixed 모드의 가로(px) */
  width: number;
  /** height·fixed 모드의 세로(px) */
  height: number;
  percent: number;
  fit: FitMode;
  /** contain/cover/center에서 이미지를 놓을 위치(가로). 여백은 반대쪽에 생기고, 자르기는 반대쪽이 잘린다 */
  alignX: Align;
  /** 위와 같음(세로) */
  alignY: Align;
}

/** SVG(벡터) 출력 옵션. 래스터 이미지를 트레이싱해서 만든다. */
export type TraceDetail = "low" | "medium" | "high";

export interface SvgOptions {
  /** 사용할 색 수 (2~64) */
  colors: number;
  /** low: 경로를 줄여 단순·작게 / high: 디테일 보존·크게 */
  detail: TraceDetail;
}

export interface ConvertOptions {
  output: OutputFormat;
  /** 1~100 (JPG/WebP/AVIF) */
  quality: number;
  resize: ResizeOptions;
  /** 투명 부분·여백을 채울 색 (#rrggbb). 투명을 지원하지 않는 출력 형식은 항상, 지원하는 형식은 fillBackground가 true일 때 쓴다 */
  background: string;
  /** 투명을 지원하는 형식(PNG/WebP/GIF/ICO)에서도 투명 대신 배경색으로 채울지 */
  fillBackground: boolean;
  /** 출력이 SVG일 때만 쓰인다 */
  svg: SvgOptions;
  /** true면 확대·축소할 때 보간하지 않고 픽셀을 그대로 키우거나 줄인다 (도트/픽셀 아트용) */
  pixelArt: boolean;
  /** false면 JPG → JPG에서만 원본 EXIF를 유지 */
  stripExif: boolean;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  output: "png",
  quality: 90,
  resize: { mode: "original", width: 1280, height: 720, percent: 50, fit: "contain", alignX: 0.5, alignY: 0.5 },
  background: "#ffffff",
  fillBackground: false,
  pixelArt: false,
  svg: { colors: 8, detail: "medium" },
  stripExif: true,
};

export interface ConvertRequest {
  id: number;
  /** 판별된 실제 입력 형식 */
  input: FormatId;
  /** 원본 파일(또는 메인 스레드에서 미리 래스터화한 Blob) */
  blob: Blob;
  options: ConvertOptions;
}

/** 변환 결과에 대해 사용자에게 알려야 할 주의사항 (SVG 트레이싱) */
export type ConvertNote =
  | { code: "svgPhotoLike" }
  | { code: "svgDownscaled"; value: number }
  | { code: "svgComplex"; value: number }
  /** 결과 SVG가 원본보다 value배 크다 (변환 후 파일 크기를 비교해 클라이언트가 추가) */
  | { code: "svgLarger"; value: number };

export type ConvertResponse =
  | { id: number; ok: true; blob: Blob; width: number; height: number; notes: ConvertNote[] }
  | { id: number; ok: false; code: ConvertErrorCode; message?: string };

export type ConvertErrorCode = "decode" | "encode" | "tooBig" | "tiff" | "svgSame" | "svgTooComplex" | "unknown";

export class ConvertError extends Error {
  constructor(
    public code: ConvertErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ConvertError";
  }
}

export const MAX_DIMENSION = 16384;
export const MAX_PIXELS = 268_435_456; // 16384 * 16384
