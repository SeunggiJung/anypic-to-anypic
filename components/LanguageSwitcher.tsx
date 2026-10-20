"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALES, LOCALE_META, swapLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useLang, useT } from "./LangProvider";

/** 현재 페이지의 같은 경로를 다른 언어로 여는 메뉴. 지원 언어는 LOCALES에서 자동으로 나온다. */
export default function LanguageSwitcher() {
  const lang = useLang();
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function remember(code: string) {
    try {
      localStorage.setItem("lang", code);
    } catch {
      // 저장이 막힌 환경에서는 이번 이동에만 적용
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t.language.label}: ${LOCALE_META[lang].label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted hover:bg-accent-soft hover:text-accent"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span>{lang.toUpperCase()}</span>
      </button>
      {open && (
        <ul
          id={menuId}
          className="absolute right-0 z-30 mt-1 min-w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {LOCALES.map((code) => (
            <li key={code}>
              <Link
                href={swapLocale(pathname, code)}
                hrefLang={LOCALE_META[code].htmlLang}
                lang={LOCALE_META[code].htmlLang}
                aria-current={code === lang ? "true" : undefined}
                onClick={() => remember(code)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent-soft",
                  code === lang ? "font-bold text-accent" : "text-foreground",
                )}
              >
                {LOCALE_META[code].label}
                {code === lang && <span aria-hidden="true">✓</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
