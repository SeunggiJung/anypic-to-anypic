import { describe, expect, it } from "vitest";
import { detectFormat } from "./detectFormat";

const bytes = (...v: number[]) => new Uint8Array(v);
const text = (s: string) => new TextEncoder().encode(s);

function ftyp(major: string, compat: string[] = []): Uint8Array {
  const brands = [major, "\0\0\0\0", ...compat].map((s) => text(s));
  const size = 8 + brands.reduce((n, x) => n + x.length, 0);
  const out = new Uint8Array(size + 8);
  out.set([0, 0, 0, size], 0);
  out.set(text("ftyp"), 4);
  let o = 8;
  for (const b of brands) {
    out.set(b, o);
    o += b.length;
  }
  return out;
}

describe("detectFormat", () => {
  it("PNG", () => {
    expect(detectFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("png");
  });
  it("JPEG", () => {
    expect(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe("jpg");
  });
  it("GIF", () => {
    expect(detectFormat(text("GIF89a\x01\x00"))).toBe("gif");
    expect(detectFormat(text("GIF87a\x01\x00"))).toBe("gif");
  });
  it("WebP", () => {
    expect(detectFormat(new Uint8Array([...text("RIFF"), 1, 2, 3, 4, ...text("WEBPVP8 ")]))).toBe("webp");
  });
  it("RIFF but not WebP (WAV)", () => {
    expect(detectFormat(new Uint8Array([...text("RIFF"), 1, 2, 3, 4, ...text("WAVEfmt ")]))).toBeNull();
  });
  it("BMP", () => {
    const b = new Uint8Array(30);
    b.set([0x42, 0x4d]);
    b[14] = 40;
    expect(detectFormat(b)).toBe("bmp");
  });
  it("'BM' text is not BMP", () => {
    expect(detectFormat(text("BMW is a car brand, not an image"))).toBeNull();
  });
  it("ICO", () => {
    expect(detectFormat(bytes(0, 0, 1, 0, 1, 0))).toBe("ico");
  });
  it("TIFF little/big endian", () => {
    expect(detectFormat(bytes(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0))).toBe("tiff");
    expect(detectFormat(bytes(0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8))).toBe("tiff");
  });
  it("AVIF (major brand avif)", () => {
    expect(detectFormat(ftyp("avif", ["mif1", "miaf"]))).toBe("avif");
  });
  it("AVIF (major mif1, compat avif)", () => {
    expect(detectFormat(ftyp("mif1", ["avif", "miaf"]))).toBe("avif");
  });
  it("HEIC", () => {
    expect(detectFormat(ftyp("heic", ["mif1", "heic"]))).toBe("heic");
    expect(detectFormat(ftyp("heix"))).toBe("heic");
    expect(detectFormat(ftyp("mif1", ["heic"]))).toBe("heic");
  });
  it("MP4 is not an image", () => {
    expect(detectFormat(ftyp("isom", ["iso2", "mp41"]))).toBeNull();
  });
  it("SVG (plain, xml prolog, BOM)", () => {
    expect(detectFormat(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("svg");
    expect(detectFormat(text('<?xml version="1.0"?>\n<svg xmlns="x"></svg>'))).toBe("svg");
    expect(detectFormat(text('﻿  <svg viewBox="0 0 1 1"/>'))).toBe("svg");
  });
  it("XML that is not SVG", () => {
    expect(detectFormat(text('<?xml version="1.0"?><html></html>'))).toBeNull();
  });
  it("unknown / tiny input", () => {
    expect(detectFormat(new Uint8Array(0))).toBeNull();
    expect(detectFormat(bytes(1))).toBeNull();
    expect(detectFormat(text("hello world"))).toBeNull();
  });
});
