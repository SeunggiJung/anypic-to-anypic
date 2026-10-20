"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { FORMATS } from "@/lib/formats";
import { DEFAULT_LOCALE, getMessages, isLocale, localePath, pickLocale, type Locale } from "@/lib/i18n";
import { PAIRS } from "@/lib/seo/pairs";

const POPULAR = ["webp-to-jpg", "heic-to-jpg", "png-to-jpg", "png-to-webp", "svg-to-png"];
const noop = () => () => {};

/** 404 화면의 언어: 주소의 언어 접두사 → 저장된 선택 → 브라우저 언어 순으로 정한다. */
function useGuessedLocale(): Locale {
  const pathname = usePathname();
  const fromPath = pathname.split("/")[1];
  const guessed = useSyncExternalStore(
    noop,
    () => {
      try {
        const saved = localStorage.getItem("lang");
        if (saved && isLocale(saved)) return saved;
      } catch {
        // 저장소 접근이 막힌 환경
      }
      return pickLocale(navigator.languages ?? [navigator.language]);
    },
    () => DEFAULT_LOCALE,
  );
  return isLocale(fromPath) ? fromPath : guessed;
}

export default function NotFoundContent() {
  const lang = useGuessedLocale();
  const t = getMessages(lang);
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-5xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t.notFound.title}</h1>
      <p className="mt-2 text-muted">{t.notFound.body}</p>
      <Link
        href={localePath(lang)}
        className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-bold text-on-accent hover:bg-accent-hover"
      >
        {t.notFound.cta}
      </Link>
      <ul className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
        {PAIRS.filter((p) => POPULAR.includes(p.slug)).map((p) => (
          <li key={p.slug}>
            <Link
              href={localePath(lang, `/${p.slug}/`)}
              className="inline-block rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent hover:text-accent"
            >
              {FORMATS[p.from].name} → {FORMATS[p.to].name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
