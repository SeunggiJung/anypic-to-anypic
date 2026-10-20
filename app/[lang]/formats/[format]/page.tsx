import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Faq, { type FaqItem } from "@/components/Faq";
import JsonLd from "@/components/JsonLd";
import { FORMAT_IDS, FORMATS, TRAITS, getFormat, type ImageFormat } from "@/lib/formats";
import { LOCALES, getFormatText, getMessages, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/meta";
import { PAIRS } from "@/lib/seo/pairs";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => FORMAT_IDS.map((format) => ({ lang, format })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/formats/[format]">): Promise<Metadata> {
  const { lang, format } = await params;
  const f = getFormat(format);
  if (!isLocale(lang) || !f) return {};
  const p = getMessages(lang).formatPage;
  const summary = getFormatText(lang)[f.id].summary;
  return pageMetadata(lang, `/formats/${f.id}/`, {
    title: p.metaTitle(f.name),
    description: p.metaDescription(f.name, f.extensions.map((e) => `.${e}`).join(", "), summary),
    type: "article",
  });
}

function buildFaq(lang: Locale, f: ImageFormat, outs: string[]): FaqItem[] {
  const p = getMessages(lang).formatPage;
  const text = getFormatText(lang);
  const faq: FaqItem[] = [
    { q: p.faqOpen(f.name), a: text[f.id].compatibility },
    {
      q: p.faqAlpha(f.name),
      a: f.transparency ? p.alphaYes(f.name) + (f.id === "gif" ? p.alphaGifNote : "") : p.alphaNo(f.name),
    },
  ];
  if (f.input) {
    faq.push({
      q: p.faqConvert(f.name),
      a: outs.length ? p.convertAnswer(SITE_NAME, f.name, outs.join(", ")) : p.convertAnswerGeneric(SITE_NAME),
    });
  }
  if (!f.output) {
    faq.push({ q: p.faqSave(f.name), a: p.saveNo(f.name) });
  } else if (TRAITS[f.id].photoSize) {
    const size = TRAITS[f.id].photoSize!;
    const rel = size < 1 ? p.relPercent(Math.round(size * 100)) : p.relTimes(size);
    faq.push({ q: p.faqSize(f.name), a: size === 1 ? p.sizeBaseline : p.sizeRelative(f.name, rel) });
  }
  return faq;
}

export default async function FormatPage({ params }: PageProps<"/[lang]/formats/[format]">) {
  const { lang, format } = await params;
  const f = getFormat(format);
  if (!isLocale(lang) || !f) notFound();

  const t = getMessages(lang);
  const p = t.formatPage;
  const text = getFormatText(lang)[f.id];
  const asInput = PAIRS.filter((x) => x.from === f.id);
  const asOutput = PAIRS.filter((x) => x.to === f.id);
  const faq = buildFaq(lang, f, asInput.map((x) => FORMATS[x.to].name));
  const chip = "inline-block rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent hover:text-accent";

  const facts: Array<[string, string]> = [
    [p.facts.mime, f.mime],
    [p.facts.extensions, f.extensions.map((e) => `.${e}`).join(", ")],
    [p.facts.year, t.common.yearSuffix(f.year)],
    [p.facts.compression, t.common.compression[f.compression]],
    [p.facts.transparency, f.transparency ? t.common.supported : t.common.unsupported],
    [p.facts.animation, f.animation ? t.common.supported : t.common.unsupported],
    [p.facts.browser, TRAITS[f.id].browserOpen ? t.common.possible : t.common.impossible],
    [p.facts.onSite, [f.input && p.facts.read, f.output && p.facts.write].filter(Boolean).join(" · ")],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl(localePath(lang)) },
            { "@type": "ListItem", position: 2, name: p.breadcrumbIndex, item: absoluteUrl(localePath(lang, "/formats/")) },
            { "@type": "ListItem", position: 3, name: f.name, item: absoluteUrl(localePath(lang, `/formats/${f.id}/`)) },
          ],
        }}
      />
      <nav aria-label={t.nav.breadcrumb} className="mb-4 text-sm text-muted">
        <Link href={localePath(lang, "/formats/")} className="hover:text-accent">
          {p.breadcrumbIndex}
        </Link>{" "}
        <span aria-hidden="true">/</span> <span>{f.name}</span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight">{p.h1(f.name)}</h1>
      <p className="mt-2 text-lg text-muted first-letter:uppercase">{text.summary}</p>

      <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 bg-surface px-4 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="prose-content">
        <h2>{p.overview}</h2>
        {text.description.map((d) => (
          <p key={d}>{d}</p>
        ))}

        <h2>{p.history}</h2>
        {text.history.map((d) => (
          <p key={d}>{d}</p>
        ))}

        <h2>{p.pros}</h2>
        <ul>
          {text.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <h2>{p.cons}</h2>
        <ul>
          {text.weaknesses.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <h2>{p.uses}</h2>
        <ul>
          {text.useCases.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <h2>{p.compat}</h2>
        <p>{text.compatibility}</p>
      </div>

      {(asInput.length > 0 || asOutput.length > 0) && (
        <section aria-labelledby="convert-heading" className="mt-10">
          <h2 id="convert-heading" className="mb-3 text-xl font-bold">
            {p.convertTitle(f.name)}
          </h2>
          {asInput.length > 0 && (
            <>
              <p className="mb-2 text-sm text-muted">{p.convertFrom(f.name)}</p>
              <ul className="mb-4 flex flex-wrap gap-2 text-sm">
                {asInput.map((x) => (
                  <li key={x.slug}>
                    <Link href={localePath(lang, `/${x.slug}/`)} className={chip}>
                      {f.name} → {FORMATS[x.to].name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {asOutput.length > 0 && (
            <>
              <p className="mb-2 text-sm text-muted">{p.convertTo(f.name)}</p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {asOutput.map((x) => (
                  <li key={x.slug}>
                    <Link href={localePath(lang, `/${x.slug}/`)} className={chip}>
                      {FORMATS[x.from].name} → {f.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <Faq items={faq} heading={p.faqTitle(f.name)} />
    </div>
  );
}
