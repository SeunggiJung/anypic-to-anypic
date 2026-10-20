import { computeLayout } from "./converters/size";
import {
  ConvertError,
  type ConvertNote,
  MAX_DIMENSION,
  type ConvertOptions,
  type ConvertRequest,
  type ConvertResponse,
} from "./converters/types";
import type { FormatId } from "./formats";

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
  notes: ConvertNote[];
}

interface Task {
  req: ConvertRequest;
  resolve: (r: ConvertResult) => void;
  reject: (e: ConvertError) => void;
}

interface Slot {
  worker: Worker;
  current: Task | null;
}

/** 동시에 돌리는 Worker 수. 이미지 디코딩은 메모리를 많이 쓰므로 최대 4개로 제한 */
function poolSize(): number {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  return Math.max(1, Math.min(4, cores - 1));
}

const workerSupported = () => typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";

class Pool {
  private slots: Slot[] = [];
  private queue: Task[] = [];
  private nextId = 1;

  run(input: FormatId, blob: Blob, options: ConvertOptions): Promise<ConvertResult> {
    const req: ConvertRequest = { id: this.nextId++, input, blob, options };

    if (!workerSupported()) {
      // OffscreenCanvas가 없는 오래된 브라우저: 메인 스레드에서 직접 처리 (필요할 때만 불러옴)
      return import("./converters/core")
        .then(({ convert }) => convert(req))
        .catch((e) => {
          throw e instanceof ConvertError ? e : new ConvertError("unknown", String(e));
        });
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ req, resolve, reject });
      this.pump();
    });
  }

  private spawn(): Slot {
    const worker = new Worker(new URL("./worker/convert.worker.ts", import.meta.url), { type: "module" });
    const slot: Slot = { worker, current: null };

    worker.onmessage = (e: MessageEvent<ConvertResponse>) => {
      const task = slot.current;
      slot.current = null;
      if (task && e.data.id === task.req.id) {
        const res = e.data;
        if (res.ok) task.resolve({ blob: res.blob, width: res.width, height: res.height, notes: res.notes });
        else task.reject(new ConvertError(res.code, res.message));
      }
      this.pump();
    };
    worker.onerror = () => {
      // Worker가 죽었으면(메모리 부족 등) 해당 작업만 실패 처리하고 슬롯을 교체한다.
      const task = slot.current;
      slot.current = null;
      worker.terminate();
      this.slots = this.slots.filter((s) => s !== slot);
      task?.reject(new ConvertError("tooBig"));
      this.pump();
    };
    this.slots.push(slot);
    return slot;
  }

  private pump() {
    while (this.queue.length) {
      let slot = this.slots.find((s) => !s.current);
      if (!slot && this.slots.length < poolSize()) slot = this.spawn();
      if (!slot) return;
      const task = this.queue.shift()!;
      slot.current = task;
      slot.worker.postMessage(task.req);
    }
  }
}

let pool: Pool | null = null;

/** SVG를 원하는 크기의 PNG Blob으로 그린다 (DOM이 필요해 메인 스레드에서 처리). */
async function rasterizeSvg(file: File, options: ConvertOptions): Promise<Blob> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new ConvertError("decode", "svg");

  const num = (v: string | null) => {
    if (!v || /%|em|ex/i.test(v)) return NaN;
    return parseFloat(v);
  };
  let w = num(root.getAttribute("width"));
  let h = num(root.getAttribute("height"));
  const vb = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const hasVb = vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0;

  if (!(w > 0) || !(h > 0)) {
    // 크기 정보가 없으면 viewBox 비율로 가로 1024px
    const ratio = hasVb ? vb[3] / vb[2] : 1;
    w = 1024;
    h = Math.round(1024 * ratio);
  }
  root.setAttribute("width", String(w));
  root.setAttribute("height", String(h));
  if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // 벡터이므로 크기 옵션은 여기서 직접 적용해야 확대해도 선명하다.
  // 원본이 그려질 크기(dw×dh)로 한 번에 래스터화하고, 여백·잘라내기는 Worker가 이어서 처리한다.
  const { dw: tw, dh: th } = computeLayout(w, h, options.resize);
  if (tw > MAX_DIMENSION || th > MAX_DIMENSION) throw new ConvertError("tooBig");

  const svgBlob = new Blob([new XMLSerializer().serializeToString(root)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new ConvertError("decode", "svg");
    }
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    canvas.getContext("2d")!.drawImage(img, 0, 0, tw, th);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new ConvertError("decode", "svg"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** HEIC는 브라우저가 못 읽으므로 WASM 디코더로 PNG로 푼다 (필요할 때만 불러옴). */
async function decodeHeic(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/png" });
    return Array.isArray(out) ? out[0] : out;
  } catch {
    throw new ConvertError("decode", "heic");
  }
}

/** 파일 하나를 변환한다. input은 detectFormat으로 판별한 실제 형식이어야 한다. */
export async function convertFile(file: File, input: FormatId, options: ConvertOptions): Promise<ConvertResult> {
  pool ??= new Pool();

  if (input === "heic") {
    const png = await decodeHeic(file);
    return pool.run("png", png, options);
  }
  if (input === "svg") {
    // SVG는 이미 벡터다. 래스터로 그렸다가 다시 트레이싱하면 품질만 떨어지므로 막는다.
    if (options.output === "svg") throw new ConvertError("svgSame");
    const png = await rasterizeSvg(file, options);
    // 원본 크기는 이미 맞춰 그렸다. Worker는 다시 줄이거나 늘리지 않고,
    // 직접 지정(fixed)이면 그 결과를 지정한 캔버스 가운데에 놓기만 한다 (여백·잘라내기).
    const resize: ConvertOptions["resize"] =
      options.resize.mode === "fixed"
        ? { ...options.resize, fit: "center" }
        : { ...options.resize, mode: "original" };
    return pool.run("png", png, { ...options, resize });
  }
  return pool.run(input, file, options);
}
