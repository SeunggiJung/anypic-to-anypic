import type { FormatId } from "./formats";

/** 판별에 필요한 앞부분 바이트 수 (ftyp 호환 브랜드·SVG 헤더 확인용) */
export const SNIFF_BYTES = 1024;

const AVIF_BRANDS = ["avif", "avis"];
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];
const BMP_DIB_SIZES = [12, 40, 52, 56, 64, 108, 124];

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  if (b.length < offset + sig.length) return false;
  return sig.every((v, i) => b[offset + i] === v);
}

function ascii(b: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < Math.min(end, b.length); i++) s += String.fromCharCode(b[i]);
  return s;
}

function detectIsoBmff(b: Uint8Array): FormatId | null {
  if (ascii(b, 4, 8) !== "ftyp") return null;
  const boxSize = (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
  const end = boxSize >= 16 && boxSize <= b.length ? boxSize : Math.min(b.length, 64);
  const major = ascii(b, 8, 12);
  const brands = [major];
  // 16바이트부터 4바이트씩 호환 브랜드 목록
  for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(b, i, i + 4));

  // AVIF 파일은 호환 브랜드에 mif1이 같이 들어 있으므로 avif를 먼저 확인
  if (brands.some((x) => AVIF_BRANDS.includes(x))) return "avif";
  if (brands.some((x) => HEIC_BRANDS.includes(x))) return "heic";
  return null;
}

function detectSvg(b: Uint8Array): FormatId | null {
  let text = new TextDecoder("utf-8").decode(b.subarray(0, SNIFF_BYTES));
  text = text.replace(/^﻿/, "").trimStart();
  if (text.startsWith("<svg")) return "svg";
  if (text.startsWith("<?xml") || text.startsWith("<!--") || text.startsWith("<!DOCTYPE svg")) {
    return /<svg[\s>]/i.test(text) ? "svg" : null;
  }
  return null;
}

/** 파일 앞부분 바이트(매직 넘버)로 실제 이미지 형식을 판별한다. 알 수 없으면 null. */
export function detectFormat(bytes: Uint8Array): FormatId | null {
  const b = bytes;
  if (b.length < 2) return null;

  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "webp";
  if (startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  if (startsWith(b, [0x00, 0x00, 0x01, 0x00])) return "ico";

  // 'BM' 두 글자는 우연히 일치하기 쉬우므로 DIB 헤더 크기까지 확인
  if (startsWith(b, [0x42, 0x4d])) {
    if (b.length < 18) return "bmp";
    const dib = b[14] | (b[15] << 8) | (b[16] << 16) | (b[17] << 24);
    if (BMP_DIB_SIZES.includes(dib)) return "bmp";
  }

  const iso = detectIsoBmff(b);
  if (iso) return iso;

  return detectSvg(b);
}

export async function detectFormatFromFile(file: Blob): Promise<FormatId | null> {
  const buf = await file.slice(0, SNIFF_BYTES).arrayBuffer();
  return detectFormat(new Uint8Array(buf));
}
