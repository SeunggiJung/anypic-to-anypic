import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import JsonLd from "@/components/JsonLd";
import { Mdx } from "@/components/mdx";
import { adsActive } from "@/lib/ads";
import { FORMATS } from "@/lib/formats";
import { allGuideParams, getAllGuides, getGuide, splitAtMiddleHeading } from "@/lib/guides";
import { LOCALES, LOCALE_META, getMessages, isLocale, localePath } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/meta";
import { getIndexablePair } from "@/lib/seo/pairs";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return allGuideParams();
}

export async function generateMetadata({ params }: PageProps<"/[lang]/guides/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const g = getGuide(lang, slug);
  if (!g) return {};
  const meta = pageMetadata(lang, `/guides/${g.slug}/`, { title: g.title, description: g.description, type: "article" });
  // 이 글이 존재하는 언어판만 hreflang에 올린다
  const existing = LOCALES.filter((l) => getGuide(l, slug) !== undefined);
  const languages = Object.fromEntries(
    Object.entries(meta.alternates?.languages ?? {}).filter(
      ([code]) => code === "x-default" || existing.some((l) => LOCALE_META[l].htmlLang === code),
    ),
  );
  return {
    ...meta,
    alternates: { ...meta.alternates, languages },
    openGraph: { ...meta.openGraph, type: "article", publishedTime: g.date, modifiedTime: g.updated ?? g.date },
  };
}

export default async function GuidePage({ params }: PageProps<"/[lang]/guides/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const g = getGuide(lang, slug);
  if (!g) notFound();

  const t = getMessages(lang);
  const [first, second] = splitAtMiddleHeading(g.content);
  const related = g.related.map(getIndexablePair).filter((p) => p !== undefined);
  const others = getAllGuides(lang)
    .filter((x) => x.slug !== g.slug)
    .slice(0, 3);

  return (
    <div
      className={cn(
        "mx-auto px-4 py-12",
        adsActive ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10" : "max-w-3xl",
      )}
    >
      <div className="min-w-0">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.description,
            datePublished: g.date,
            dateModified: g.updated ?? g.date,
            inLanguage: lang,
            mainEntityOfPage: absoluteUrl(localePath(lang, `/guides/${g.slug}/`)),
            image: absoluteUrl(`/og/og-${lang}.png`),
            author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl(localePath(lang)) },
            publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl(localePath(lang)) },
          }}
        />
        <nav aria-label={t.nav.breadcrumb} className="mb-4 text-sm text-muted">
          <Link href={localePath(lang, "/guides/")} className="hover:text-accent">
            {t.nav.guides}
          </Link>{" "}
          <span aria-hidden="true">/</span> <span>{g.title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{g.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <time dateTime={g.date}>{g.date}</time>
            {g.updated && <span>{t.guides.updated(g.updated)}</span>}
            <span>{t.guides.readMinutes(g.readingMinutes)}</span>
          </p>
        </header>

        <article className="prose-content">
          <Mdx source={first} lang={lang} />
          {second && (
            <>
              <AdSlot name="article" />
              <Mdx source={second} lang={lang} />
            </>
          )}
        </article>
        <AdSlot name="article" />

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12 rounded-xl border border-border bg-surface p-5">
            <h2 id="related-heading" className="mb-3 font-bold">
              {t.guides.related}
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={localePath(lang, `/${p.slug}/`)}
                    className="inline-block rounded-lg border border-accent px-3 py-1.5 font-semibold text-accent hover:bg-accent-soft"
                  >
                    {FORMATS[p.from].name} → {FORMATS[p.to].name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {others.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-10">
            <h2 id="more-heading" className="mb-3 font-bold">
              {t.guides.others}
            </h2>
            <ul className="space-y-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={localePath(lang, `/guides/${o.slug}/`)} className="text-accent underline underline-offset-2">
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {adsActive && (
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <AdSlot name="sidebar" desktopOnly />
          </div>
        </div>
      )}
    </div>
  );
}
