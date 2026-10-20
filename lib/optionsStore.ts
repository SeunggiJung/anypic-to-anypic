import { OUTPUT_FORMATS } from "./formats";
import {
  DEFAULT_OPTIONS,
  type Align,
  type ConvertOptions,
  type FitMode,
  type OutputFormat,
  type ResizeMode,
  type TraceDetail,
} from "./converters/types";

/** 변환 옵션을 브라우저(localStorage)에 기억한다. 서버로는 전송되지 않는다. 형식이 바뀌면 키 버전을 올린다. */
const KEY = "anypic:options:v1";

const MODES: ResizeMode[] = ["original", "width", "height", "percent", "fixed"];
const FITS: FitMode[] = ["stretch", "contain", "cover", "center"];
const ALIGNS: Align[] = [0, 0.5, 1];
const DETAILS: TraceDetail[] = ["low", "medium", "high"];

const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** 저장된 값(또는 외부 입력)을 검증해 항상 올바른 ConvertOptions로 만든다. 잘못된 항목은 기본값으로 대체한다. */
export function sanitizeOptions(raw: unknown): ConvertOptions {
  const d = DEFAULT_OPTIONS;
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const r = (typeof o.resize === "object" && o.resize !== null ? o.resize : {}) as Record<string, unknown>;
  const s = (typeof o.svg === "object" && o.svg !== null ? o.svg : {}) as Record<string, unknown>;
  return {
    output: pick<OutputFormat>(o.output, OUTPUT_FORMATS as OutputFormat[], d.output),
    quality: int(o.quality, 1, 100, d.quality),
    resize: {
      mode: pick(r.mode, MODES, d.resize.mode),
      width: int(r.width, 1, 16384, d.resize.width),
      height: int(r.height, 1, 16384, d.resize.height),
      percent: int(r.percent, 1, 400, d.resize.percent),
      fit: pick(r.fit, FITS, d.resize.fit),
      alignX: pick(r.alignX, ALIGNS, d.resize.alignX),
      alignY: pick(r.alignY, ALIGNS, d.resize.alignY),
    },
    background: typeof o.background === "string" && /^#[0-9a-f]{6}$/i.test(o.background) ? o.background : d.background,
    fillBackground: bool(o.fillBackground, d.fillBackground),
    pixelArt: bool(o.pixelArt, d.pixelArt),
    svg: { colors: int(s.colors, 2, 64, d.svg.colors), detail: pick(s.detail, DETAILS, d.svg.detail) },
    stripExif: bool(o.stripExif, d.stripExif),
  };
}

function readRaw(): unknown {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null; // 저장소가 막혔거나 값이 깨진 경우
  }
}

export function loadOptions(): ConvertOptions {
  if (typeof window === "undefined") return DEFAULT_OPTIONS;
  return sanitizeOptions(readRaw());
}

/**
 * 옵션 저장. keepStoredOutput이면 출력 형식은 기존 저장값을 유지한다
 * (예: webp-to-jpg 랜딩 페이지가 미리 고른 형식이 "마지막으로 쓴 형식"을 덮어쓰지 않도록).
 */
export function saveOptions(options: ConvertOptions, keepStoredOutput = false) {
  try {
    const toSave = keepStoredOutput ? { ...options, output: sanitizeOptions(readRaw()).output } : options;
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch {
    // 저장 실패는 무시: 이번 방문에만 적용된다
  }
}
