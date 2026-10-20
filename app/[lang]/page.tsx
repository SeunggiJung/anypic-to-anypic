import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Converter from "@/components/Converter";
import Faq from "@/components/Faq";
import JsonLd from "@/components/JsonLd";
import SupportedFormats from "@/components/SupportedFormats";
import { LOCALES, getMessages, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/meta";
import { MAX_FILE_SIZE_MB, SITE_NAME, absoluteUrl } from "@/lib/site";
import { localePath } from "@/lib/i18n/config";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
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

      {/* 변환 버튼에서 떨어진 본문 중간에만 배치 */}
      <AdSlot name="content" />

      <SupportedFormats lang={lang} />
      <Faq items={t.home.faq(MAX_FILE_SIZE_MB)} heading={t.home.faqTitle} />
    </div>
  );
}
