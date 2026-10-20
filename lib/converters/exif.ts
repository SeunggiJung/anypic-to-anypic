/**
 * JPG → JPG 변환에서 "EXIF 유지"를 선택했을 때 원본의 APP1(Exif) 세그먼트를 새 파일에 옮긴다.
 * Canvas로 다시 그릴 때 EXIF 회전이 이미 적용되므로, 옮기는 세그먼트의 Orientation은 1로 되돌린다.
 */

/** 원본 JPEG에서 Exif APP1 세그먼트(마커 포함)를 꺼낸다. 없으면 null. */
export function extractExifSegment(jpeg: Uint8Array): Uint8Array | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= jpeg.length) {
    if (jpeg[i] !== 0xff) return null;
    const marker = jpeg[i + 1];
    if (marker === 0xda || marker === 0xd9) return null; // 이미지 데이터 시작: 더 볼 필요 없음
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (len < 2 || i + 2 + len > jpeg.length) return null;
    if (
      marker === 0xe1 &&
      jpeg[i + 4] === 0x45 && // E
      jpeg[i + 5] === 0x78 && // x
      jpeg[i + 6] === 0x69 && // i
      jpeg[i + 7] === 0x66 && // f
      jpeg[i + 8] === 0 &&
      jpeg[i + 9] === 0
    ) {
      return jpeg.slice(i, i + 2 + len);
    }
    i += 2 + len;
  }
  return null;
}

/** 세그먼트 안의 Orientation(0x0112) 값을 1(정상)로 바꾼 사본을 돌려준다. */
export function resetOrientation(segment: Uint8Array): Uint8Array {
  const seg = segment.slice();
  const tiff = 10; // marker(2) + length(2) + "Exif\0\0"(6)
  if (seg.length < tiff + 8) return seg;
  const little = seg[tiff] === 0x49 && seg[tiff + 1] === 0x49;
  const big = seg[tiff] === 0x4d && seg[tiff + 1] === 0x4d;
  if (!little && !big) return seg;

  const view = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);

  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > seg.length) return seg;
  const count = u16(ifd);
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > seg.length) break;
    if (u16(entry) === 0x0112) {
      view.setUint16(entry + 8, 1, little);
      break;
    }
  }
  return seg;
}

/** 인코딩된 JPEG에 Exif 세그먼트를 끼워 넣는다 (JFIF APP0 바로 뒤, 없으면 SOI 바로 뒤). */
export function injectExif(jpeg: Uint8Array, segment: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  let at = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) at = 4 + ((jpeg[4] << 8) | jpeg[5]);

  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, at), 0);
  out.set(segment, at);
  out.set(jpeg.subarray(at), at + segment.length);
  return out;
}
