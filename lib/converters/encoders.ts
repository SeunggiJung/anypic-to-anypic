import { GIFEncoder, applyPalette, quantize } from "gifenc";

/** 24비트 BMP (투명 없음 — 호출 전에 배경색으로 채워져 있어야 한다) */
export function encodeBmp(image: ImageData): Blob {
  const { width, height, data } = image;
  const rowSize = Math.ceil((width * 3) / 4) * 4; // 각 행은 4바이트 배수
  const pixelBytes = rowSize * height;
  const out = new Uint8Array(54 + pixelBytes);
  const view = new DataView(out.buffer);

  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, out.length, true);
  view.setUint32(10, 54, true); // 픽셀 데이터 시작 위치
  view.setUint32(14, 40, true); // BITMAPINFOHEADER
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // 양수 = 아래에서 위로 저장
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);

  for (let y = 0; y < height; y++) {
    let o = 54 + (height - 1 - y) * rowSize;
    let s = y * width * 4;
    for (let x = 0; x < width; x++, s += 4) {
      out[o++] = data[s + 2];
      out[o++] = data[s + 1];
      out[o++] = data[s];
    }
  }
  return new Blob([out], { type: "image/bmp" });
}

/** PNG 한 장을 ICO 컨테이너에 담는다 (Vista 이후 표준, 256×256까지). */
export async function encodeIco(png: Blob, width: number, height: number): Promise<Blob> {
  const data = new Uint8Array(await png.arrayBuffer());
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // 이미지 수
  header[6] = width >= 256 ? 0 : width; // 0 = 256
  header[7] = height >= 256 ? 0 : height;
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, data.length, true);
  view.setUint32(18, 22, true); // 이미지 데이터 위치
  return new Blob([header, data], { type: "image/x-icon" });
}

/** 정지 이미지 GIF. 반투명은 표현할 수 없어 투명/불투명 두 단계로 나눈다. */
export function encodeGif(image: ImageData): Blob {
  const { width, height, data } = image;

  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] <= 127) {
      hasAlpha = true;
      break;
    }
  }

  const format = hasAlpha ? "rgba4444" : "rgb565";
  const palette = quantize(data, 256, hasAlpha ? { format, oneBitAlpha: true } : { format });
  const index = applyPalette(data, palette, format);
  const transparentIndex = hasAlpha ? palette.findIndex((c) => c[3] === 0) : -1;

  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, {
    palette,
    ...(transparentIndex >= 0 ? { transparent: true, transparentIndex } : {}),
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}
