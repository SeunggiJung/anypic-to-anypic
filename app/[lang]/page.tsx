import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSenseScript from "@/components/AdSenseScript";
import AdSlot from "@/components/AdSlot";
import Converter from "@/components/Converter";
import Faq from "@/components/Faq";
import JsonLd from "@/components/JsonLd";
import SupportedFormats from "@/components/SupportedFormats";
import { LOCALES, getMessages, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/meta";
import { MAX_FILE_SIZE_MB, SITE_NAME, absoluteUrl } from "@/lib/site";
import { localePath } from "@/lib/i18n/config";
import { FORMATS } from "@/lib/formats";
import { getAllGuides } from "@/lib/guides";
import { getIndexablePair } from "@/lib/seo/pairs";

/** 홈 본문에서 바로 갈 수 있게 하는 조합(색인 대상만 나온다)과 대표 가이드 */
const POPULAR_PAIRS = [
  "png-to-jpg",
  "jpg-to-png",
  "webp-to-jpg",
  "webp-to-png",
  "heic-to-jpg",
  "png-to-webp",
  "jpg-to-webp",
  "svg-to-png",
  "png-to-ico",
  "png-to-svg",
];
const FEATURED_GUIDES = [
  "unify-image-size-for-games",
  "choose-image-format",
  "png-vs-jpg",
  "reduce-image-size-for-web",
  "what-is-heic",
  "verify-no-upload",
];

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang);
  return pageMetadata(lang, "/", { title: `${SITE_NAME} – ${t.site.metaTitle}`, description: t.site.description });
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getMessages(lang);
  const popular = POPULAR_PAIRS.map(getIndexablePair).filter((p) => p !== undefined);
  const allGuides = getAllGuides(lang);
  const guides = FEATURED_GUIDES.map((slug) => allGuides.find((g) => g.slug === slug)).filter((g) => g !== undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <AdSenseScript />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: absoluteUrl(localePath(lang)),
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (Web browser)",
          inLanguage: lang,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: t.site.description,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl(localePath(lang)),
          inLanguage: lang,
          publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl(localePath(lang)) },
        }}
      />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t.site.taglineA}
          <br className="sm:hidden" /> <span className="text-accent">{t.site.taglineB}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">{t.home.heroSub}</p>
      </header>

      <Converter />

      <section aria-labelledby="how-heading" className="mt-14">
        <h2 id="how-heading" className="mb-4 text-2xl font-bold">
          {t.home.howTitle}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {t.home.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-surface p-4">
              <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                {i + 1}
              </span>
              <h3 className="font-bold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-heading" className="mt-14">
        <h2 id="about-heading" className="mb-3 text-2xl font-bold">
          {t.home.aboutTitle}
        </h2>
        <p className="leading-relaxed text-muted">{t.home.aboutBody}</p>
        <p className="mt-2">
          <Link href={localePath(lang, "/about/")} className="text-accent underline underline-offset-2">
            {t.home.aboutLink}
          </Link>
        </p>
      </section>

      <section aria-labelledby="popular-heading" className="mt-14">
        <h2 id="popular-heading" className="mb-1 text-2xl font-bold">
          {t.home.popularTitle}
        </h2>
        <p className="mb-4 text-muted">{t.home.popularLead}</p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {popular.map((p) => (
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
      </section>

      {/* 변환 버튼에서 떨어진 본문 중간에만 배치 */}
      <AdSlot name="content" />

      {guides.length > 0 && (
        <section aria-labelledby="guides-heading" className="mt-14">
          <h2 id="guides-heading" className="mb-1 text-2xl font-bold">
            {t.home.guidesTitle}
          </h2>
          <p className="mb-4 text-muted">{t.home.guidesLead}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={localePath(lang, `/guides/${g.slug}/`)}
                  className="block h-full rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
                >
                  <h3 className="font-bold">{g.title}</h3>
                  <p className="mt-1 text-sm text-muted">{g.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link href={localePath(lang, "/guides/")} className="text-accent underline underline-offset-2">
              {t.home.guidesAll}
            </Link>
          </p>
        </section>
      )}

      <SupportedFormats lang={lang} />
      <Faq items={t.home.faq(MAX_FILE_SIZE_MB)} heading={t.home.faqTitle} />
    </div>
  );
}
