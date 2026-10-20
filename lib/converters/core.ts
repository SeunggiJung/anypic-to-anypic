import * as UTIF from "utif";
import { FORMATS } from "../formats";
import { encodeBmp, encodeGif, encodeIco } from "./encoders";
import { extractExifSegment, injectExif, resetOrientation } from "./exif";
import { computeLayout } from "./size";
import { ConvertError, type ConvertRequest, type OutputFormat } from "./types";

/** Worker에서는 OffscreenCanvas, 지원하지 않는 환경(메인 스레드 폴백)에서는 <canvas> */
type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function context2d(canvas: AnyCanvas): Ctx2D {
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) throw new ConvertError("tooBig");
  return ctx;
}

async function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new ConvertError("encode"))),
      type,
      quality,
    );
  });
}

/** TIFF는 브라우저가 못 읽으므로 utif로 풀어서 비트맵으로 만든다. */
async function decodeTiff(blob: Blob): Promise<ImageBitmap> {
  try {
    const buf = await blob.arrayBuffer();
    const pages = UTIF.decode(buf);
    if (!pages.length) throw new Error("no pages");
    UTIF.decodeImage(buf, pages[0]);
    const { width, height } = pages[0];
    const rgba = UTIF.toRGBA8(pages[0]);
    if (!width || !height || rgba.length < width * height * 4) throw new Error("bad tiff");
    return await createImageBitmap(new ImageData(new Uint8ClampedArray(rgba), width, height));
  } catch {
    throw new ConvertError("tiff");
  }
}

async function decode(req: ConvertRequest): Promise<ImageBitmap> {
  if (req.input === "tiff") return decodeTiff(req.blob);
  try {
    return await createImageBitmap(req.blob);
  } catch {
    throw new ConvertError("decode");
  }
}

/** 큰 폭으로 줄일 때는 절반씩 줄여 가며 그려서 계단 현상(앨리어싱)을 막는다. */
function drawScaled(source: ImageBitmap, dx: number, dy: number, width: number, height: number, ctx: Ctx2D, smooth: boolean) {
  let current: CanvasImageSource = source;
  let cw = source.width;
  let ch = source.height;
  // 도트 모드는 보간을 쓰지 않으므로 한 번에 그린다
  while (smooth && cw / 2 >= width && ch / 2 >= height) {
    const nw = Math.ceil(cw / 2);
    const nh = Math.ceil(ch / 2);
    const step = createCanvas(nw, nh);
    const sctx = context2d(step);
    sctx.imageSmoothingEnabled = smooth;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(current, 0, 0, nw, nh);
    current = step as CanvasImageSource;
    cw = nw;
    ch = nh;
  }
  ctx.imageSmoothingEnabled = smooth;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, dx, dy, width, height);
}

const CANVAS_MIME: Partial<Record<OutputFormat, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

async function encodeWithCanvas(canvas: AnyCanvas, output: OutputFormat, quality: number): Promise<Blob> {
  const mime = CANVAS_MIME[output]!;
  const blob = await canvasToBlob(canvas, mime, FORMATS[output].hasQuality ? quality / 100 : undefined);
  // 지원하지 않는 형식을 요청하면 브라우저가 조용히 PNG를 돌려주므로 타입을 확인한다.
  if (blob.type !== mime) throw new ConvertError("encode", FORMATS[output].name);
  return blob;
}

function readPixels(canvas: AnyCanvas): ImageData {
  return context2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

export interface ConvertOutput {
  blob: Blob;
  width: number;
  height: number;
}

export async function convert(req: ConvertRequest): Promise<ConvertOutput> {
  const { output, quality, background, fillBackground, stripExif } = req.options;
  const bitmap = await decode(req);
  try {
    const { width, height, dx, dy, dw, dh } = computeLayout(bitmap.width, bitmap.height, req.options.resize, output);

    const canvas = createCanvas(width, height);
    const ctx = context2d(canvas);

    // 투명을 지원하지 않는 형식은 항상, 지원하는 형식은 "배경색으로 채우기"를 켰을 때 배경색으로 먼저 채운다.
    // 그렇지 않으면 투명 부분과 여백은 투명으로 남는다.
    if (!FORMATS[output].transparency || fillBackground) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    drawScaled(bitmap, dx, dy, dw, dh, ctx, !req.options.pixelArt);

    let blob: Blob;
    switch (output) {
      case "bmp":
        blob = encodeBmp(readPixels(canvas));
        break;
      case "gif":
        blob = encodeGif(readPixels(canvas));
        break;
      case "ico":
        blob = await encodeIco(await encodeWithCanvas(canvas, "png", quality), width, height);
        break;
      default:
        blob = await encodeWithCanvas(canvas, output, quality);
    }

    // JPG → JPG 이고 EXIF 유지를 선택한 경우에만 원본 EXIF를 되살린다.
    if (req.input === "jpg" && output === "jpg" && !stripExif) {
      const exif = extractExifSegment(new Uint8Array(await req.blob.arrayBuffer()));
      if (exif) {
        const bytes = injectExif(new Uint8Array(await blob.arrayBuffer()), resetOrientation(exif));
        blob = new Blob([bytes as BlobPart], { type: "image/jpeg" });
      }
    }
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
