import { zip } from "fflate";
import { uniqueName } from "./utils";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 다운로드가 시작될 시간을 준 뒤 메모리 해제
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 이미 압축된 이미지들이므로 ZIP은 저장(무압축) 모드로 빠르게 묶는다. */
export async function zipBlobs(files: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const used = new Set<string>();
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[uniqueName(f.name, used)] = new Uint8Array(await f.blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (err, data) => {
      if (err) reject(err);
      else resolve(new Blob([data as BlobPart], { type: "application/zip" }));
    });
  });
}
