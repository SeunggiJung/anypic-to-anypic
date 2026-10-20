import ImageTracer from "imagetracerjs";
import type { ConvertNote, SvgOptions, TraceDetail } from "./types";

/**
 * 래스터 이미지를 SVG로 바꾼다(트레이싱). 원본의 "변환"이 아니라 색 영역의 윤곽을 찾아 도형으로 다시 그리는 "추정"이라
 * 원본과 같지 않고, 사진처럼 색이 많은 이미지에는 맞지 않는다. 호출하는 쪽은 결과에 대한 주의사항(notes)을 사용자에게 보여 준다.
 */

/** 트레이싱에 쓰는 해상도(한 변 최대). 이보다 큰 이미지는 줄여서 추적하고, SVG는 viewBox로 원래 크기에 맞춘다. */
export const TRACE_MAX_SIDE = 1024;
/** 경로가 이 이상이면 브라우저가 멈출 수 있어 변환을 중단한다 */
export const MAX_PATHS = 200_000;
/** 이 이상이면 "경로가 매우 많다"고 알린다 */
export const COMPLEX_PATHS = 20_000;
/** 상위 16색이 불투명 픽셀의 이만큼 미만을 덮으면 사진처럼 색이 많은 이미지로 본다 */
export const PHOTO_COVERAGE = 0.6;

const DETAIL: Record<TraceDetail, { ltres: number; qtres: number; pathomit: number; blurradius: number }> = {
  low: { ltres: 2, qtres: 2, pathomit: 16, blurradius: 1 },
  medium: { ltres: 1, qtres: 1, pathomit: 8, blurradius: 0 },
  high: { ltres: 0.5, qtres: 0.5, pathomit: 2, blurradius: 0 },
};

export interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface ImageAnalysis {
  /** 채널당 4비트로 줄였을 때 상위 16색이 불투명 픽셀에서 차지하는 비율 (로고·아이콘은 1에 가깝고 사진은 낮다) */
  coverage: number;
  photoLike: boolean;
  opaquePixels: number;
}

export function analyzeImage(image: PixelData): ImageAnalysis {
  const { data } = image;
  const hist = new Map<number, number>();
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // 투명한 픽셀은 제외
    opaque++;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    hist.set(key, (hist.get(key) ?? 0) + 1);
  }
  if (opaque === 0) return { coverage: 1, photoLike: false, opaquePixels: 0 };
  const top = [...hist.values()].sort((a, b) => b - a).slice(0, 16).reduce((a, b) => a + b, 0);
  const coverage = top / opaque;
  return { coverage, photoLike: coverage < PHOTO_COVERAGE, opaquePixels: opaque };
}

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Bin {
  n: number;
  r: number;
  g: number;
  b: number;
}

/**
 * 트레이싱에 쓸 팔레트를 median cut으로 직접 만든다. (라이브러리의 자체 양자화는 색 수를 줄이면
 * 안티앨리어싱 가장자리 색이 팔레트 자리를 차지해 작은 영역의 색이 통째로 사라지거나 엉뚱한 색으로 바뀌는 일이 있어
 * 로고·아이콘에 쓸 수 없었다.)
 * - 불투명 픽셀만 대상으로 colors개의 색을 고르고, 각 색은 해당 픽셀들의 실제 평균이라 평면 색이 정확히 유지된다.
 * - 투명 픽셀이 있으면 완전 투명 항목을 따로 추가한다.
 */
export function buildPalette(image: PixelData, colors: number): PaletteColor[] {
  const { data } = image;
  const bins = new Map<number, Bin>();
  let hasTransparent = false;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      hasTransparent = true;
      continue;
    }
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const bin = bins.get(key);
    if (bin) {
      bin.n++;
      bin.r += data[i];
      bin.g += data[i + 1];
      bin.b += data[i + 2];
    } else {
      bins.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  const channel = (bin: Bin, c: 0 | 1 | 2) => (c === 0 ? bin.r : c === 1 ? bin.g : bin.b) / bin.n;
  const spreadOf = (box: Bin[]) => {
    let best: { c: 0 | 1 | 2; spread: number } = { c: 0, spread: 0 };
    for (const c of [0, 1, 2] as const) {
      let lo = 255;
      let hi = 0;
      for (const bin of box) {
        const v = channel(bin, c);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > best.spread) best = { c, spread: hi - lo };
    }
    return best;
  };
  const population = (box: Bin[]) => box.reduce((s, b) => s + b.n, 0);

  let boxes: Bin[][] = bins.size ? [[...bins.values()]] : [];
  const target = Math.min(64, Math.max(2, Math.round(colors)));
  while (boxes.length < target) {
    // 인구가 많고 색 차이가 큰 상자를 먼저 쪼갠다
    let pick = -1;
    let pickScore = 0;
    boxes.forEach((box, idx) => {
      if (box.length < 2) return;
      const score = population(box) * spreadOf(box).spread;
      if (score > pickScore) {
        pickScore = score;
        pick = idx;
      }
    });
    if (pick < 0) break; // 더 나눌 수 없음 (색이 이미 충분히 분리됨)

    const box = boxes[pick];
    const { c } = spreadOf(box);
    box.sort((x, y) => channel(x, c) - channel(y, c));
    const half = population(box) / 2;
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      acc += box[i].n;
      cut = i + 1;
      if (acc >= half) break;
    }
    boxes = [...boxes.slice(0, pick), box.slice(0, cut), box.slice(cut), ...boxes.slice(pick + 1)];
  }

  const palette = boxes.map((box) => {
    const n = population(box);
    return {
      r: Math.round(box.reduce((s, b) => s + b.r, 0) / n),
      g: Math.round(box.reduce((s, b) => s + b.g, 0) / n),
      b: Math.round(box.reduce((s, b) => s + b.b, 0) / n),
      a: 255,
    };
  });
  if (hasTransparent || palette.length === 0) palette.unshift({ r: 0, g: 0, b: 0, a: 0 });
  return palette;
}

export interface TraceResult {
  svg: string;
  paths: number;
}

/**
 * @param image 트레이싱할 픽셀 (TRACE_MAX_SIDE 이내로 줄여 둔 것)
 * @param outWidth/outHeight SVG에 적을 표시 크기(px). 벡터라 확대해도 선명하다.
 */
export function traceToSvg(image: PixelData, options: SvgOptions, outWidth: number, outHeight: number): TraceResult {
  const raw = ImageTracer.imagedataToSVG(image, {
    ...DETAIL[options.detail],
    pal: buildPalette(image, options.colors),
    colorquantcycles: 1, // 우리가 만든 팔레트를 그대로 쓴다 (라이브러리의 색 재평균을 끈다)
    strokewidth: 1, // 인접한 색 영역 사이의 틈을 가린다
    roundcoords: 1,
    viewbox: true,
    desc: false,
  });

  // 라이브러리가 만드는 완전 투명 영역(opacity="0") 경로는 쓸모없으므로 제거한다
  const body = raw
    .slice(raw.indexOf(">") + 1) // 여는 <svg ...> 태그는 우리가 직접 쓴다 (desc 같은 불필요한 속성 제거)
    .replace(/<path\b[^>]*?\sopacity="0"[^>]*?\/>/g, "");
  const paths = (body.match(/<path\b/g) ?? []).length;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" ` +
    `viewBox="0 0 ${image.width} ${image.height}" preserveAspectRatio="none">` +
    body;
  return { svg, paths };
}

/** 분석·경로 수·축소 여부로 사용자에게 알릴 주의사항을 만든다 */
export function buildNotes(analysis: ImageAnalysis, paths: number, scale: number): ConvertNote[] {
  const notes: ConvertNote[] = [];
  if (analysis.photoLike) notes.push({ code: "svgPhotoLike" });
  if (scale < 1) notes.push({ code: "svgDownscaled", value: TRACE_MAX_SIDE });
  if (paths >= COMPLEX_PATHS) notes.push({ code: "svgComplex", value: paths });
  return notes;
}
