"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./LangProvider";
import { MAX_FILE_SIZE_MB } from "@/lib/site";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  /** 파일이 이미 올라간 뒤에는 작게 표시 */
  compact?: boolean;
  /** 랜딩 페이지에서 보여줄 입력 형식 안내 (예: "WebP") */
  hintFormat?: string;
}

const ACCEPT = "image/*,.heic,.heif,.tif,.tiff,.avif,.svg,.ico,.bmp";

export default function Dropzone({ onFiles, compact = false, hintFormat }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const emit = useCallback(
    (list: FileList | File[] | null) => {
      const files = list ? Array.from(list) : [];
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  // 클립보드 붙여넣기 (Ctrl+V)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        onFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  function open() {
    inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t.dropzone.ariaLabel}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        emit(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "gap-1 px-4 py-6" : "gap-3 px-4 py-14 sm:py-20",
        dragging
          ? "border-accent bg-accent-soft"
          : "border-border bg-surface hover:border-accent hover:bg-accent-soft",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn("text-accent", compact ? "h-7 w-7" : "h-12 w-12")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <p className={cn("font-bold", compact ? "text-base" : "text-xl sm:text-2xl")}>
        {dragging ? t.dropzone.drop : hintFormat ? t.dropzone.titleFor(hintFormat) : t.dropzone.title}
      </p>
      <p className="text-sm text-muted">{t.dropzone.subtitle}</p>
      {!compact && <p className="text-xs text-muted">{t.dropzone.hint(MAX_FILE_SIZE_MB)}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = ""; // 같은 파일을 다시 고를 수 있게 초기화
        }}
      />
    </div>
  );
}
