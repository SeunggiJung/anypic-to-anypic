"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dropzone from "./Dropzone";
import FileList from "./FileList";
import FormatSelector from "./FormatSelector";
import OptionsPanel from "./OptionsPanel";
import ResultList from "./ResultList";
import { convertFile } from "@/lib/convertClient";
import { detectOutputSupport, type OutputSupport } from "@/lib/converters/support";
import { ConvertError, DEFAULT_OPTIONS, type ConvertOptions, type OutputFormat } from "@/lib/converters/types";
import { detectFormatFromFile } from "@/lib/detectFormat";
import { loadOptions, saveOptions } from "@/lib/optionsStore";
import { PREVIEWABLE, type FileItem } from "@/lib/fileItem";
import { FORMATS, formatFromExtension, outputExtension } from "@/lib/formats";
import { useT } from "./LangProvider";
import type { Messages } from "@/lib/i18n";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/lib/site";
import { baseName, extOf } from "@/lib/utils";

interface Props {
  /** 랜딩 페이지에서 미리 선택해 둘 출력 형식 */
  initialOutput?: OutputFormat;
  /** 랜딩 페이지에서 안내할 입력 형식 이름 (예: "WebP") */
  inputHint?: string;
}

type Phase = "idle" | "converting" | "done";

/** 한 번에 처리하는 파일 수 (HEIC/SVG 같은 메인 스레드 작업이 몰리지 않게) */
const CONCURRENCY = 3;

function errorMessage(t: Messages, err: unknown, output: OutputFormat): string {
  if (err instanceof ConvertError) {
    switch (err.code) {
      case "decode":
        if (err.message === "heic") return t.errors.heic;
        if (err.message === "svg") return t.errors.svg;
        return t.errors.decode;
      case "tiff":
        return t.errors.tiff;
      case "encode":
        return t.errors.encode(FORMATS[output].name);
      case "tooBig":
        return t.errors.tooBig;
      case "svgSame":
        return t.errors.svgSame;
      case "svgTooComplex":
        return t.errors.svgTooComplex(Number(err.message) || 0);
    }
  }
  return t.errors.unknown;
}

export default function Converter({ initialOutput, inputHint }: Props) {
  const t = useT();
  const [items, setItems] = useState<FileItem[]>([]);
  // 지난번에 쓴 설정을 기억해 불러온다. (옵션 패널은 파일을 올린 뒤에만 그려지므로 서버 HTML과 어긋나지 않는다)
  // 랜딩 페이지가 미리 고른 출력 형식은 저장된 형식보다 우선한다.
  const [chosen, setOptions] = useState<ConvertOptions>(() => ({
    ...loadOptions(),
    ...(initialOutput && { output: initialOutput }),
  }));
  const [phase, setPhase] = useState<Phase>("idle");
  const [support, setSupport] = useState<OutputSupport | null>(null);
  const nextId = useRef(1);
  const runId = useRef(0);
  const itemsRef = useRef<FileItem[]>([]);
  // 스크린리더용 상태 알림과 포커스 복원 (버튼이 사라지거나 화면이 바뀌어도 포커스가 body로 빠지지 않게)
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const convertRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"root" | "convert" | null>(null);

  // 브라우저가 선택한 출력 형식을 지원하지 않으면(예: AVIF) PNG로 대체한다
  const options: ConvertOptions = support && !support[chosen.output] ? { ...chosen, output: "png" } : chosen;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    saveOptions(chosen, initialOutput !== undefined);
  }, [chosen, initialOutput]);

  useEffect(() => {
    detectOutputSupport().then(setSupport);
  }, []);

  // 화면이 바뀐 직후 요청된 곳으로 포커스를 옮긴다
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = target === "convert" && convertRef.current ? convertRef.current : rootRef.current;
    el?.focus({ preventScroll: true });
  });

  // 언마운트 시 미리보기 URL 해제
  useEffect(() => {
    return () => itemsRef.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    runId.current++; // 진행 중이던 변환 결과는 버린다
    const added: FileItem[] = await Promise.all(
      files.map(async (file): Promise<FileItem> => {
        const id = nextId.current++;
        const base = { id, file, detected: null, previewUrl: null, status: "rejected" as const };
        if (file.size === 0) return { ...base, error: t.files.empty };
        if (file.size > MAX_FILE_SIZE) return { ...base, error: t.files.tooLarge(MAX_FILE_SIZE_MB) };

        const detected = await detectFormatFromFile(file);
        if (!detected) return { ...base, error: t.files.unsupported };

        const claimed = formatFromExtension(extOf(file.name));
        const warning =
          claimed && claimed !== detected
            ? t.files.mismatch(extOf(file.name), FORMATS[detected].name)
            : undefined;
        return {
          ...base,
          detected,
          status: "ready",
          warning,
          previewUrl: PREVIEWABLE.has(detected) ? URL.createObjectURL(file) : null,
        };
      }),
    );
    setItems((prev) => [
      // 이전 결과는 비우고 새 파일과 함께 다시 변환할 수 있게 한다
      ...prev.map((i) => (i.status === "rejected" ? i : { ...i, status: "ready" as const, result: undefined, error: undefined })),
      ...added,
    ]);
    setPhase("idle");
    const accepted = added.filter((i) => i.status !== "rejected").length;
    if (accepted > 0) setStatus(t.files.added(accepted));
  }, [t]);

  function removeItem(id: number) {
    pendingFocus.current = "root";
    setStatus(t.files.removed);
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function clearAll() {
    pendingFocus.current = "root";
    setStatus(t.files.cleared);
    runId.current++;
    items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setPhase("idle");
  }

  const run = useCallback(async (opts: ConvertOptions) => {
    const myRun = ++runId.current;
    const targets = itemsRef.current.filter((i) => i.status !== "rejected");
    if (!targets.length) return;

    setPhase("converting");
    setStatus(t.actions.converting);
    let ok = 0;
    let fail = 0;
    setItems((prev) =>
      prev.map((i) => (i.status === "rejected" ? i : { ...i, status: "converting", result: undefined, error: undefined })),
    );

    const patch = (id: number, p: Partial<FileItem>) => {
      if (runId.current !== myRun) return;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
    };

    const queue = [...targets];
    async function worker() {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          const r = await convertFile(item.file, item.detected!, opts);
          // 결과가 원본보다 훨씬 크면 알린다 (벡터가 항상 작은 것은 아니다)
          const notes = [...r.notes];
          if (opts.output === "svg" && r.blob.size > item.file.size * 1.2) {
            notes.push({ code: "svgLarger", value: r.blob.size / item.file.size });
          }
          ok++;
          patch(item.id, {
            status: "done",
            result: {
              blob: r.blob,
              width: r.width,
              height: r.height,
              notes,
              name: `${baseName(item.file.name)}.${outputExtension(opts.output)}`,
            },
          });
        } catch (err) {
          fail++;
          patch(item.id, { status: "error", error: errorMessage(t, err, opts.output) });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    if (runId.current === myRun) {
      setPhase("done");
      setStatus(`${t.result.heading}: ${t.result.summary(ok, fail)}`);
    }
  }, [t]);

  function reconvert(output: OutputFormat) {
    pendingFocus.current = "convert";
    const next = { ...options, output };
    setOptions(next);
    void run(next);
  }

  function editSettings() {
    pendingFocus.current = "convert";
    setItems((prev) =>
      prev.map((i) => (i.status === "rejected" ? i : { ...i, status: "ready", result: undefined, error: undefined })),
    );
    setPhase("idle");
  }

  const valid = items.filter((i) => i.status !== "rejected");
  const finished = items.filter((i) => i.status === "done" || i.status === "error").length;
  const converting = phase === "converting";
  const sameAsInput = valid.length > 0 && valid.every((i) => i.detected === options.output);

  return (
    <div ref={rootRef} tabIndex={-1} className="space-y-6 outline-none">
      <div role="status" className="sr-only">
        {status}
      </div>
      <Dropzone onFiles={addFiles} compact={items.length > 0} hintFormat={inputHint} />

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-success" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span>
          <strong className="font-semibold text-foreground">{t.privacy.badge}.</strong> {t.privacy.detail}
        </span>
      </p>

      {items.length > 0 && phase !== "done" && (
        <>
          <FileList items={items} onRemove={removeItem} onClear={clearAll} disabled={converting} />
          {valid.length > 0 && (
            <>
              <FormatSelector
                value={options.output}
                onChange={(output) => setOptions((o) => ({ ...o, output }))}
                support={support}
                disabled={converting}
                sameAsInput={sameAsInput}
              />
              <OptionsPanel
                options={options}
                onChange={setOptions}
                onReset={() => setOptions({ ...DEFAULT_OPTIONS, output: chosen.output })}
                disabled={converting}
                hasJpgInput={valid.some((i) => i.detected === "jpg")}
                hasPhotoInput={valid.some((i) => i.detected === "jpg" || i.detected === "heic" || i.detected === "tiff")}
              />
              <div>
                {/* disabled 대신 aria-disabled: 변환 중에도 포커스가 버튼에 남는다 */}
                <button
                  ref={convertRef}
                  type="button"
                  onClick={() => {
                    if (!converting) void run(options);
                  }}
                  aria-disabled={converting}
                  className="w-full rounded-xl bg-accent px-6 py-3.5 text-lg font-bold text-on-accent transition-colors hover:bg-accent-hover aria-disabled:cursor-default aria-disabled:opacity-70 sm:w-auto sm:min-w-56"
                >
                  {converting
                    ? `${t.actions.converting} (${finished}/${valid.length})`
                    : t.actions.convertN(valid.length, FORMATS[options.output].name)}
                </button>
                {converting && (
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={valid.length}
                    aria-valuenow={finished}
                    aria-label={t.actions.converting}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${(finished / valid.length) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {phase === "done" && (
        <ResultList
          items={items}
          output={options.output}
          support={support}
          onReconvert={reconvert}
          onEditSettings={editSettings}
          onStartOver={clearAll}
        />
      )}
    </div>
  );
}
