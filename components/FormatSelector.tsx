"use client";

import { FORMATS, OUTPUT_FORMATS } from "@/lib/formats";
import type { OutputSupport } from "@/lib/converters/support";
import type { OutputFormat } from "@/lib/converters/types";
import { useFormatText, useT } from "./LangProvider";
import { cn } from "@/lib/utils";

interface Props {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
  support: OutputSupport | null;
  disabled?: boolean;
  /** 모든 파일이 이미 이 형식일 때 안내 문구를 보여주기 위함 */
  sameAsInput?: boolean;
}

export default function FormatSelector({ value, onChange, support, disabled, sameAsInput }: Props) {
  const t = useT();
  const text = useFormatText();
  const formats = OUTPUT_FORMATS as OutputFormat[];
  const unsupported = formats.filter((f) => support && !support[f]);

  return (
    <section aria-labelledby="output-heading">
      <h2 id="output-heading" className="mb-2 font-bold">
        {t.output.heading}
      </h2>
      <div role="radiogroup" aria-labelledby="output-heading" className="flex flex-wrap gap-2">
        {formats.map((f) => {
          const off = support ? !support[f] : false;
          const selected = value === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || off}
              onClick={() => onChange(f)}
              title={off ? t.output.avifUnsupported : text[f].summary}
              className={cn(
                "min-w-16 rounded-lg border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-surface hover:border-accent hover:text-accent",
              )}
            >
              {FORMATS[f].name}
            </button>
          );
        })}
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted first-letter:uppercase">{text[value].summary}</p>
      {unsupported.includes("avif") && <p className="mt-1 text-xs text-warning">{t.output.avifUnsupported}</p>}
      {sameAsInput && <p className="mt-1 text-xs text-muted">{t.output.sameFormat}</p>}
    </section>
  );
}
