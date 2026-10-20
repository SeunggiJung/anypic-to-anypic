export type FormatId =
  | "png"
  | "jpg"
  | "webp"
  | "avif"
  | "gif"
  | "bmp"
  | "ico"
  | "tiff"
  | "heic"
  | "svg";

export type Compression = "lossy" | "lossless" | "both" | "none" | "vector";

/**
 * 언어와 무관한 형식 메타데이터. 설명 텍스트(summary, description …)는
 * lib/i18n/content/<언어>/formats.ts 에 있다.
 */
export interface ImageFormat {
  id: FormatId;
  /** 화면에 보여줄 이름 (언어 공통) */
  name: string;
  mime: string;
  /** 첫 번째가 대표 확장자 */
  extensions: string[];
  /** 입력으로 읽을 수 있는가 */
  input: boolean;
  /** 출력으로 만들 수 있는가 (AVIF는 브라우저 지원 여부를 별도로 감지) */
  output: boolean;
  /** 품질 슬라이더가 의미 있는 출력 형식인가 */
  hasQuality: boolean;
  transparency: boolean;
  animation: boolean;
  compression: Compression;
  year: number;
}

export const FORMATS: Record<FormatId, ImageFormat> = {
  png: {
    id: "png", name: "PNG", mime: "image/png", extensions: ["png"],
    input: true, output: true, hasQuality: false, transparency: true, animation: false, compression: "lossless", year: 1996,
  },
  jpg: {
    id: "jpg", name: "JPG", mime: "image/jpeg", extensions: ["jpg", "jpeg", "jpe", "jfif"],
    input: true, output: true, hasQuality: true, transparency: false, animation: false, compression: "lossy", year: 1992,
  },
  webp: {
    id: "webp", name: "WebP", mime: "image/webp", extensions: ["webp"],
    input: true, output: true, hasQuality: true, transparency: true, animation: true, compression: "both", year: 2010,
  },
  avif: {
    id: "avif", name: "AVIF", mime: "image/avif", extensions: ["avif"],
    input: true, output: true, hasQuality: true, transparency: true, animation: true, compression: "both", year: 2019,
  },
  gif: {
    id: "gif", name: "GIF", mime: "image/gif", extensions: ["gif"],
    input: true, output: true, hasQuality: false, transparency: true, animation: true, compression: "lossless", year: 1987,
  },
  bmp: {
    id: "bmp", name: "BMP", mime: "image/bmp", extensions: ["bmp", "dib"],
    input: true, output: true, hasQuality: false, transparency: false, animation: false, compression: "none", year: 1990,
  },
  ico: {
    id: "ico", name: "ICO", mime: "image/x-icon", extensions: ["ico"],
    input: true, output: true, hasQuality: false, transparency: true, animation: false, compression: "lossless", year: 1985,
  },
  tiff: {
    id: "tiff", name: "TIFF", mime: "image/tiff", extensions: ["tiff", "tif"],
    input: true, output: false, hasQuality: false, transparency: true, animation: false, compression: "both", year: 1986,
  },
  heic: {
    id: "heic", name: "HEIC", mime: "image/heic", extensions: ["heic", "heif"],
    input: true, output: false, hasQuality: false, transparency: true, animation: false, compression: "lossy", year: 2015,
  },
  svg: {
    id: "svg", name: "SVG", mime: "image/svg+xml", extensions: ["svg"],
    input: true, output: false, hasQuality: false, transparency: true, animation: true, compression: "vector", year: 2001,
  },
};

/**
 * 형식 간 비교 문단을 만들 때 쓰는 수치형 특성.
 * - appSupport: 편집 프로그램·문서 도구·업로드 폼에서의 일반적인 지원 정도 (1 낮음 ~ 5 거의 모든 곳)
 * - photoSize: 같은 사진을 저장했을 때의 대략적인 상대 용량 (JPG = 1). 사진이 아닌 경우엔 해당 없음(null)
 * - browserOpen: 주요 브라우저가 <img>로 바로 표시할 수 있는가
 */
export const TRAITS: Record<FormatId, { appSupport: number; photoSize: number | null; browserOpen: boolean }> = {
  png: { appSupport: 5, photoSize: 3, browserOpen: true },
  jpg: { appSupport: 5, photoSize: 1, browserOpen: true },
  webp: { appSupport: 3, photoSize: 0.7, browserOpen: true },
  avif: { appSupport: 2, photoSize: 0.5, browserOpen: true },
  gif: { appSupport: 5, photoSize: 2.5, browserOpen: true },
  bmp: { appSupport: 4, photoSize: 12, browserOpen: true },
  ico: { appSupport: 3, photoSize: null, browserOpen: true },
  tiff: { appSupport: 2, photoSize: 6, browserOpen: false },
  heic: { appSupport: 2, photoSize: 0.5, browserOpen: false },
  svg: { appSupport: 3, photoSize: null, browserOpen: true },
};

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export const INPUT_FORMATS = FORMAT_IDS.filter((id) => FORMATS[id].input);
export const OUTPUT_FORMATS = FORMAT_IDS.filter((id) => FORMATS[id].output);

export function getFormat(id: string): ImageFormat | undefined {
  return (FORMATS as Record<string, ImageFormat | undefined>)[id];
}

/** 확장자 → 형식 (확장자로 형식을 추정해야 할 때만 사용. 판별은 detectFormat 우선) */
export function formatFromExtension(ext: string): FormatId | undefined {
  const e = ext.toLowerCase().replace(/^\./, "");
  return FORMAT_IDS.find((id) => FORMATS[id].extensions.includes(e));
}

/** 출력 파일 확장자 */
export function outputExtension(id: FormatId): string {
  return FORMATS[id].extensions[0];
}
