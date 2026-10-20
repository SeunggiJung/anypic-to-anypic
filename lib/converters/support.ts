import type { OutputFormat } from "./types";

export type OutputSupport = Record<OutputFormat, boolean>;

/** Canvas가 해당 형식으로 실제 인코딩하는지 확인 (미지원이면 브라우저가 PNG로 대체해 버린다) */
async function canEncode(mime: string): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.8));
    return blob?.type === mime;
  } catch {
    return false;
  }
}

/** 브라우저(메인 스레드)에서 출력 가능한 형식을 감지한다. */
export async function detectOutputSupport(): Promise<OutputSupport> {
  const [webp, avif] = await Promise.all([canEncode("image/webp"), canEncode("image/avif")]);
  return { png: true, jpg: true, gif: true, bmp: true, ico: true, svg: true, webp, avif };
}
