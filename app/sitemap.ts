import type { MetadataRoute } from "next";
import { FORMAT_IDS } from "@/lib/formats";
import { allGuideParams, getGuide } from "@/lib/guides";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, localePath, type Locale } from "@/lib/i18n/config";
import { INDEXABLE_PAIRS } from "@/lib/seo/pairs";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

interface Page {
  /** 언어 접두사를 뺀 경로 */
  path: string;
  priority: number;
  /** 이 페이지가 존재하는 언어 (기본: 전부) */
  locales?: Locale[];
  /** 언어별 마지막 수정일 (알 수 있는 페이지만) */
  lastModified?: Partial<Record<Locale, string>>;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Page[] = [
    { path: "/", priority: 1 },
    ...INDEXABLE_PAIRS.map((p) => ({ path: `/${p.slug}/`, priority: 0.8 })),
    { path: "/formats/", priority: 0.6 },
    ...FORMAT_IDS.map((id) => ({ path: `/formats/${id}/`, priority: 0.6 })),
    { path: "/guides/", priority: 0.7 },
    ...[...new Set(allGuideParams().map((g) => g.slug))].map((slug) => ({
      path: `/guides/${slug}/`,
      priority: 0.7,
      locales: LOCALES.filter((l) => getGuide(l, slug)),
      lastModified: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const g = getGuide(l, slug);
          return g ? [[l, g.updated ?? g.date]] : [];
        }),
      ) as Partial<Record<Locale, string>>,
    })),
    { path: "/about/", priority: 0.3 },
    { path: "/privacy/", priority: 0.2 },
    { path: "/terms/", priority: 0.2 },
    { path: "/contact/", priority: 0.3 },
  ];

  return pages.flatMap((page) => {
    const locales = page.locales ?? [...LOCALES];
    const languages: Record<string, string> = Object.fromEntries(
      locales.map((l) => [LOCALE_META[l].htmlLang, absoluteUrl(localePath(l, page.path))]),
    );
    languages["x-default"] = absoluteUrl(localePath(locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : locales[0], page.path));
    return locales.map((l) => ({
      url: absoluteUrl(localePath(l, page.path)),
      priority: page.priority,
      ...(page.lastModified?.[l] && { lastModified: page.lastModified[l] }),
      alternates: { languages },
    }));
  });
}
