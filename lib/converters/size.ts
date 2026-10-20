import { ConvertError, MAX_DIMENSION, MAX_PIXELS, type ResizeOptions } from "./types";

/** ICO가 담을 수 있는 최대 한 변 */
export const ICO_MAX = 256;

/**
 * 출력 캔버스와 원본을 그릴 위치를 계산한 결과.
 * 캔버스(width×height) 안에서 원본은 (dx, dy)에 dw×dh 크기로 그려진다.
 * 캔버스보다 크거나 음수 좌표여도 된다(넘치는 부분은 잘림 = cover/center).
 */
export interface Layout {
  width: number;
  height: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

const px = (v: number) => Math.max(1, Math.round(v));
/** 남는 공간(음수면 넘치는 양) 중 앞쪽에 둘 만큼. -0은 0으로 정리한다 */
const offset = (free: number, align: number) => Math.round(free * align) || 0;

function assertSize(width: number, height: number) {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) throw new ConvertError("tooBig");
}

/**
 * 원본 크기(sw×sh)와 리사이즈 옵션으로 출력 레이아웃을 계산한다. (브라우저 API를 쓰지 않는 순수 함수)
 * output이 "ico"면 마지막에 256×256 이하의 정사각형 캔버스에 중앙 정렬로 맞춘다.
 */
export function computeLayout(sw: number, sh: number, r: ResizeOptions, output?: string): Layout {
  let layout: Layout;

  if (r.mode === "fixed") {
    const cw = px(r.width);
    const ch = px(r.height);
    assertSize(cw, ch);
    let dw = cw;
    let dh = ch;
    if (r.fit === "contain" || r.fit === "cover") {
      const scale = r.fit === "contain" ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
      dw = px(sw * scale);
      dh = px(sh * scale);
    } else if (r.fit === "center") {
      dw = sw;
      dh = sh;
    }
    // 정렬: 남는(또는 넘치는) 공간 중 alignX/alignY 비율만큼을 앞쪽에 둔다 (0.5 = 가운데)
    layout = { width: cw, height: ch, dx: offset(cw - dw, r.alignX), dy: offset(ch - dh, r.alignY), dw, dh };
  } else {
    let scale = 1;
    if (r.mode === "width") scale = r.width / sw;
    else if (r.mode === "height") scale = r.height / sh;
    else if (r.mode === "percent") scale = r.percent / 100;
    const w = px(sw * scale);
    const h = px(sh * scale);
    assertSize(w, h);
    layout = { width: w, height: h, dx: 0, dy: 0, dw: w, dh: h };
  }

  return output === "ico" ? fitIcoSquare(layout) : layout;
}

/** 전체 레이아웃을 256 이하로 줄이고(확대는 안 함) 정사각형 캔버스 가운데에 놓는다. */
function fitIcoSquare(l: Layout): Layout {
  const longest = Math.max(l.width, l.height);
  const f = Math.min(1, ICO_MAX / longest);
  const side = px(longest * f);
  const ox = (side - l.width * f) / 2;
  const oy = (side - l.height * f) / 2;
  return {
    width: side,
    height: side,
    dx: Math.round(l.dx * f + ox),
    dy: Math.round(l.dy * f + oy),
    dw: px(l.dw * f),
    dh: px(l.dh * f),
  };
}
