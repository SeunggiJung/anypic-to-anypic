import type { Metadata } from "next";
import { LOCALE_META, alternatesFor, localePath, type Locale } from "../i18n/config";
import { SITE_NAME } from "../site";

/** 언어별 공유 이미지: public/og/og-<언어>.png (1200×630). 새 언어를 추가하면 이 파일도 만들어야 한다. */
function ogImage(lang: Locale) {
  return { url: `/og/og-${lang}.png`, width: 1200, height: 630, alt: SITE_NAME };
}

/** 페이지 공통 메타데이터: canonical + 모든 언어판(hreflang) + OG/Twitter */
export function pageMetadata(
  lang: Locale,
  path: string,
  info: { title: string; description: string; type?: "website" | "article"; noindex?: boolean },
): Metadata {
  const url = localePath(lang, path);
  return {
    title: info.title,
    description: info.description,
    ...(info.noindex && { robots: { index: false, follow: true } }),
    alternates: { canonical: url, languages: alternatesFor(path) },
    openGraph: {
      type: info.type ?? "website",
      url,
      title: info.title,
      description: info.description,
      siteName: SITE_NAME,
      images: [ogImage(lang)],
      locale: LOCALE_META[lang].ogLocale,
      alternateLocale: Object.values(LOCALE_META)
        .map((m) => m.ogLocale)
        .filter((l) => l !== LOCALE_META[lang].ogLocale),
    },
    twitter: { card: "summary_large_image", title: info.title, description: info.description, images: [ogImage(lang).url] },
  };
}
