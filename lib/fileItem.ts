import type { FormatId } from "./formats";

export type ItemStatus = "ready" | "converting" | "done" | "error" | "rejected";

export interface ItemResult {
  blob: Blob;
  name: string;
  width: number;
  height: number;
}

export interface FileItem {
  id: number;
  file: File;
  /** 매직 넘버로 판별한 실제 형식 (판별 실패 시 null) */
  detected: FormatId | null;
  /** 브라우저가 <img>로 바로 보여줄 수 있을 때만 값이 있음 */
  previewUrl: string | null;
  status: ItemStatus;
  /** 사용자에게 보여줄 안내(확장자 불일치 등) */
  warning?: string;
  error?: string;
  result?: ItemResult;
}

/** <img>로 미리보기가 가능한 입력 형식 */
export const PREVIEWABLE: ReadonlySet<FormatId> = new Set(["png", "jpg", "gif", "webp", "bmp", "ico", "svg", "avif"]);
