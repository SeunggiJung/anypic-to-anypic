/**
 * 지원 언어 설정. 새 언어를 추가하려면 README의 "언어 추가하기"를 따른다.
 * (이 파일에 코드 추가 → messages/<코드>.ts → content/<코드>/ → content/pages·guides/<코드>/)
 */
export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_META: Record<Locale, { label: string; htmlLang: string; ogLocale: string }> = {
  ko: { label: "한국어", htmlLang: "ko", ogLocale: "ko_KR" },
  en: { label: "English", htmlLang: "en", ogLocale: "en_US" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** `/ko` + `/about/` → `/ko/about/` */
export function localePath(lang: Locale, path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p === "/" ? "/" : p}`;
}

/** 현재 경로의 언어 부분만 바꾼다. 언어가 없는 경로면 그 언어의 홈으로 보낸다. */
export function swapLocale(pathname: string, to: Locale): string {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first)) return localePath(to);
  return `/${[to, ...rest].join("/")}`;
}

/** 브라우저 언어 목록에서 지원하는 첫 언어를 고른다. */
export function pickLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** hreflang 대체 경로 맵 (x-default는 기본 언어) */
export function alternatesFor(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of LOCALES) map[LOCALE_META[l].htmlLang] = localePath(l, path);
  map["x-default"] = localePath(DEFAULT_LOCALE, path);
  return map;
}
