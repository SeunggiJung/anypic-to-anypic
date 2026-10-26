"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FORMATS, OUTPUT_FORMATS } from "@/lib/formats";
import type { OutputSupport } from "@/lib/converters/support";
import type { ConvertNote, OutputFormat } from "@/lib/converters/types";
import { downloadBlob, zipBlobs } from "@/lib/download";
import type { FileItem } from "@/lib/fileItem";
import type { Messages } from "@/lib/i18n";
import { useT } from "./LangProvider";
import { cn, formatBytes } from "@/lib/utils";

interface Props {
  items: FileItem[];
  output: OutputFormat;
  support: OutputSupport | null;
  onReconvert: (f: OutputFormat) => void;
  onEditSettings: () => void;
  onStartOver: () => void;
}

function sizeChange(t: Messages, before: number, after: number): { text: string; tone: string } {
  if (before <= 0) return { text: t.result.same, tone: "text-muted" };
  const pct = Math.round(((after - before) / before) * 100);
  if (pct < 0) return { text: t.result.saved(-pct), tone: "text-success" };
  if (pct > 0) return { text: t.result.grew(pct), tone: "text-warning" };
  return { text: t.result.same, tone: "text-muted" };
}

/** 변환 결과에 대해 사용자에게 알릴 주의사항 문구 */
function noteText(t: Messages, note: ConvertNote): string {
  switch (note.code) {
    case "svgPhotoLike":
      return t.resultNotes.svgPhotoLike;
    case "svgDownscaled":
      return t.resultNotes.svgDownscaled(note.value);
    case "svgComplex":
      return t.resultNotes.svgComplex(note.value);
    case "svgLarger":
      return t.resultNotes.svgLarger(note.value);
  }
}

export default function ResultList({ items, output, support, onReconvert, onEditSettings, onStartOver }: Props) {
  const t = useT();
  const [zipping, setZipping] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 결과가 나타나면 제목으로 포커스를 옮긴다: 옵션 화면이 사라져 포커스가 body로 빠지는 것을 막고,
  // 긴 옵션 화면에서 스크롤이 남아 있어도 결과가 화면 안으로 들어온다.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const done = items.filter((i) => i.status === "done" && i.result);

  // SVG 결과는 눈으로 확인할 수 있게 미리보기를 보여 준다 (결과 화면이 사라질 때 URL을 해제)
  const previews = useMemo(
    () =>
      new Map(
        output === "svg"
          ? items.filter((i) => i.result).map((i) => [i.id, URL.createObjectURL(i.result!.blob)] as const)
          : [],
      ),
    [items, output],
  );
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const failed = items.filter((i) => i.status === "error" || i.status === "rejected");

  async function downloadAll() {
    setZipping(true);
    try {
      const blob = await zipBlobs(done.map((i) => ({ name: i.result!.name, blob: i.result!.blob })));
      downloadBlob(blob, `anypic-${FORMATS[output].extensions[0]}.zip`);
    } finally {
      setZipping(false);
    }
  }

  const others = (OUTPUT_FORMATS as OutputFormat[]).filter((f) => f !== output && (!support || support[f]));

  return (
    <section aria-labelledby="result-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 ref={headingRef} id="result-heading" tabIndex={-1} className="font-bold outline-none">
          {t.result.heading} <span className="font-normal text-muted">· {t.result.summary(done.length, failed.length)}</span>
        </h2>
        {done.length > 1 && (
          <button
            type="button"
            onClick={downloadAll}
            disabled={zipping}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {zipping ? t.result.zipping : t.actions.downloadAll}
          </button>
        )}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((item) => {
          const r = item.result;
          const change = r ? sizeChange(t, item.file.size, r.blob.size) : null;
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
              {previews.get(item.id) && (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URL이라 next/image 불가 */}
                  <img src={previews.get(item.id)} alt="" className="h-full w-full object-contain" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={r?.name ?? item.file.name}>
                  {r?.name ?? item.file.name}
                </p>
                {r && change ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {formatBytes(item.file.size)} → <strong className="text-foreground">{formatBytes(r.blob.size)}</strong>{" "}
                    <span className={cn("font-semibold", change.tone)}>({change.text})</span> · {r.width}×{r.height}
                  </p>
                ) : (
                  <p role="alert" className="mt-0.5 text-xs text-danger">
                    {t.result.failed}: {item.error}
                  </p>
                )}
              </div>
              {r && r.notes.length > 0 && (
                <div role="note" className="order-last w-full rounded-lg border border-warning/60 bg-background p-3 text-xs">
                  <p className="mb-1 font-bold text-warning">{t.resultNotes.title}</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted">
                    {r.notes.map((n) => (
                      <li key={n.code}>{noteText(t, n)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r && (
                <button
                  type="button"
                  onClick={() => downloadBlob(r.blob, r.name)}
                  className="rounded-lg border border-accent px-3 py-1.5 text-sm font-bold text-accent hover:bg-accent-soft"
                >
                  {t.actions.download}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {others.length > 0 && done.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">{t.actions.reconvert}</p>
          <div className="flex flex-wrap gap-2">
            {others.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onReconvert(f)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-bold hover:border-accent hover:text-accent"
              >
                {FORMATS[f].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={onEditSettings} className="text-accent underline underline-offset-2">
          {failed.length > 0 && done.length === 0 ? t.actions.retry : t.actions.editSettings}
        </button>
        <button type="button" onClick={onStartOver} className="text-muted underline underline-offset-2 hover:text-danger">
          {t.actions.startOver}
        </button>
      </div>
    </section>
  );
}
