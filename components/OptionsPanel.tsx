"use client";

import { FORMATS } from "@/lib/formats";
import type { Align, ConvertOptions, FitMode, ResizeMode } from "@/lib/converters/types";
import NumberField from "./NumberField";
import { useT } from "./LangProvider";
import { cn } from "@/lib/utils";

interface Props {
  options: ConvertOptions;
  onChange: (o: ConvertOptions) => void;
  disabled?: boolean;
  /** 입력 중에 JPG가 있는지 (EXIF 유지 옵션 노출 조건) */
  hasJpgInput: boolean;
  /** 모든 설정을 기본값으로 되돌린다 */
  onReset: () => void;
}

/** 게임·웹에서 자주 쓰는 크기 (가로, 세로) */
const PRESETS: Array<[number, number]> = [
  [64, 64],
  [128, 128],
  [256, 256],
  [512, 512],
  [1024, 1024],
  [1280, 720],
  [1920, 1080],
];

const MAX = 16384;
const input = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";

const ALIGN_VALUES: Align[] = [0, 0.5, 1];

export default function OptionsPanel({ options, onChange, disabled, hasJpgInput, onReset }: Props) {
  const t = useT();
  const o = t.options;
  const fmt = FORMATS[options.output];
  const r = options.resize;
  const set = (patch: Partial<ConvertOptions>) => onChange({ ...options, ...patch });
  const setResize = (patch: Partial<ConvertOptions["resize"]>) => set({ resize: { ...r, ...patch } });

  const modes: Array<{ id: ResizeMode; label: string }> = [
    { id: "original", label: o.resizeOriginal },
    { id: "width", label: o.resizeWidth },
    { id: "height", label: o.resizeHeight },
    { id: "percent", label: o.resizePercent },
    { id: "fixed", label: o.resizeFixed },
  ];
  const fits: Array<{ id: FitMode; label: string; hint: string }> = [
    { id: "contain", label: o.fitContain, hint: o.fitContainHint },
    { id: "stretch", label: o.fitStretch, hint: o.fitStretchHint },
    { id: "cover", label: o.fitCover, hint: o.fitCoverHint },
    { id: "center", label: o.fitCenter, hint: o.fitCenterHint },
  ];
  const fitInfo = fits.find((f) => f.id === r.fit)!;

  // 배경색: 투명 미지원 형식은 항상, 지원하는 형식은 "배경색으로 채우기"를 켰을 때
  const needsColor = !fmt.transparency || options.fillBackground;

  return (
    <section aria-labelledby="options-heading" className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="options-heading" className="font-bold">
          {o.heading}
        </h2>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          title={o.remembered}
          className="text-xs text-muted underline-offset-2 hover:text-accent hover:underline disabled:opacity-40"
        >
          {o.reset}
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {/* 품질 */}
        <div>
          <label htmlFor="opt-quality" className="mb-1 flex justify-between text-sm font-medium">
            <span>{o.quality}</span>
            <span className="tabular-nums text-muted">{fmt.hasQuality ? options.quality : "–"}</span>
          </label>
          <input
            id="opt-quality"
            type="range"
            min={1}
            max={100}
            value={options.quality}
            disabled={disabled || !fmt.hasQuality}
            onChange={(e) => set({ quality: Number(e.target.value) })}
            className="w-full accent-[var(--accent)] disabled:opacity-40"
          />
          <p className="text-xs text-muted">{fmt.hasQuality ? o.qualityHint : o.qualityNA}</p>
        </div>

        {/* 크기 */}
        <fieldset disabled={disabled}>
          <legend className="mb-1 text-sm font-medium">{o.resize}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={o.resize}
              value={r.mode}
              onChange={(e) => setResize({ mode: e.target.value as ResizeMode })}
              className={input}
            >
              {modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {r.mode === "width" && (
              <NumberField label={o.resizeWidth} value={r.width} min={1} max={MAX} onChange={(v) => setResize({ width: v })} className={cn(input, "w-24")} />
            )}
            {r.mode === "height" && (
              <NumberField label={o.resizeHeight} value={r.height} min={1} max={MAX} onChange={(v) => setResize({ height: v })} className={cn(input, "w-24")} />
            )}
            {r.mode === "percent" && (
              <NumberField label={o.resizePercent} value={r.percent} min={1} max={400} onChange={(v) => setResize({ percent: v })} className={cn(input, "w-20")} />
            )}
          </div>
          {(r.mode === "width" || r.mode === "height" || r.mode === "percent") && (
            <p className="mt-1 text-xs text-muted">{o.keepRatio}</p>
          )}
        </fieldset>

        {/* 가로×세로 직접 지정 */}
        {r.mode === "fixed" && (
          <fieldset disabled={disabled} className="space-y-3 sm:col-span-2">
            <legend className="sr-only">{o.resizeFixed}</legend>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-muted">{o.widthLabel}</span>
                <NumberField label={o.widthLabel} value={r.width} min={1} max={MAX} onChange={(v) => setResize({ width: v })} className={cn(input, "w-24")} />
              </label>
              <span aria-hidden="true" className="text-muted">
                ×
              </span>
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-muted">{o.heightLabel}</span>
                <NumberField label={o.heightLabel} value={r.height} min={1} max={MAX} onChange={(v) => setResize({ height: v })} className={cn(input, "w-24")} />
              </label>
              <span className="text-xs text-muted">px</span>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted">{o.presets}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(([w, h]) => {
                  const active = r.width === w && r.height === h;
                  return (
                    <button
                      key={`${w}x${h}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setResize({ width: w, height: h })}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs tabular-nums",
                        active ? "border-accent bg-accent-soft text-accent" : "border-border hover:border-accent",
                      )}
                    >
                      {w}×{h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="opt-fit" className="mb-1 block text-sm font-medium">
                {o.fit}
              </label>
              <select id="opt-fit" value={r.fit} onChange={(e) => setResize({ fit: e.target.value as FitMode })} className={input}>
                {fits.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">{fitInfo.hint}</p>
            </div>

            {r.fit !== "stretch" && (
              <div>
                <p id="align-label" className="mb-1 text-sm font-medium">
                  {o.align}
                </p>
                <div role="radiogroup" aria-labelledby="align-label" className="inline-grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
                  {ALIGN_VALUES.map((ay, v) =>
                    ALIGN_VALUES.map((ax, h) => {
                      const active = r.alignX === ax && r.alignY === ay;
                      const label = o.alignLabel(v as 0 | 1 | 2, h as 0 | 1 | 2);
                      return (
                        <button
                          key={`${v}${h}`}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={label}
                          title={label}
                          onClick={() => setResize({ alignX: ax, alignY: ay })}
                          className={cn(
                            "h-7 w-7 rounded border",
                            active ? "border-accent bg-accent" : "border-border bg-surface hover:border-accent",
                          )}
                        />
                      );
                    }),
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{o.alignHint}</p>
              </div>
            )}
          </fieldset>
        )}

        {/* 도트(픽셀 아트) 확대·축소 */}
        {r.mode !== "original" && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={options.pixelArt}
              disabled={disabled}
              onChange={(e) => set({ pixelArt: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{o.pixelArt}</span>
              <span className="block text-xs text-muted">{o.pixelArtHint}</span>
            </span>
          </label>
        )}

        {/* 투명·여백 채우기 */}
        <div>
          {fmt.transparency && (
            <label className="mb-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.fillBackground}
                disabled={disabled}
                onChange={(e) => set({ fillBackground: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium">{o.fillBackground}</span>
                <span className="block text-xs text-muted">{o.fillBackgroundHint}</span>
              </span>
            </label>
          )}
          {needsColor && (
            <>
              <label htmlFor="opt-bg" className="mb-1 block text-sm font-medium">
                {o.background}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="opt-bg"
                  type="color"
                  value={options.background}
                  disabled={disabled}
                  onChange={(e) => set({ background: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
                />
                <code className="text-xs text-muted">{options.background}</code>
              </div>
              <p className="mt-1 text-xs text-muted">{o.marginBackgroundHint}</p>
            </>
          )}
        </div>

        {/* EXIF */}
        <div>
          {options.output === "jpg" && hasJpgInput ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.stripExif}
                disabled={disabled}
                onChange={(e) => set({ stripExif: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium">{o.stripExif}</span>
                <span className="block text-xs text-muted">{o.stripExifHint}</span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted">{o.exifAuto}</p>
          )}
        </div>
      </div>
    </section>
  );
}
