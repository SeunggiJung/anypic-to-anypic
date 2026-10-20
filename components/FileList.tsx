"use client";

import { FORMATS } from "@/lib/formats";
import type { FileItem } from "@/lib/fileItem";
import { useT } from "./LangProvider";
import { cn, formatBytes } from "@/lib/utils";

interface Props {
  items: FileItem[];
  onRemove: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

export default function FileList({ items, onRemove, onClear, disabled }: Props) {
  const t = useT();
  return (
    <section aria-labelledby="files-heading">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="files-heading" className="font-bold">
          {t.files.heading} <span className="text-muted">({items.length})</span>
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-sm text-muted underline-offset-2 hover:text-danger hover:underline disabled:opacity-40"
        >
          {t.files.clear}
        </button>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-[10px] text-muted">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob URL이라 next/image 불가
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="px-1 text-center leading-tight">{t.files.noPreview}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={item.file.name}>
                {item.file.name}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                {item.detected && (
                  <span
                    className="rounded bg-accent-soft px-1.5 py-0.5 font-semibold text-accent"
                    title={t.files.detected}
                  >
                    {FORMATS[item.detected].name}
                  </span>
                )}
                <span>{formatBytes(item.file.size)}</span>
                {item.status === "converting" && <span className="text-accent">{t.actions.converting}</span>}
                {item.status === "done" && item.result && (
                  <span className="text-success">
                    → {formatBytes(item.result.blob.size)} · {item.result.width}×{item.result.height}
                  </span>
                )}
              </p>
              {item.warning && <p className="mt-1 text-xs text-warning">{item.warning}</p>}
              {item.error && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {item.error}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`${item.file.name} ${t.files.remove}`}
              className={cn(
                "shrink-0 rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger disabled:opacity-40",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
