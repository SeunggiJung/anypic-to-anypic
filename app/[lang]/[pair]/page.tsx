import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Converter from "@/components/Converter";
import Faq from "@/components/Faq";
import JsonLd from "@/components/JsonLd";
import { FORMATS } from "@/lib/formats";
import { LOCALES, getMessages, isLocale, localePath } from "@/lib/i18n";
import { buildPairContent } from "@/lib/i18n/pairContent";
import { pageMetadata } from "@/lib/seo/meta";
import { PAIRS, getPair } from "@/lib/seo/pairs";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => PAIRS.map((p) => ({ lang, pair: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[pair]">): Promise<Metadata> {
  const { lang, pair: slug } = await params;
  const pair = getPair(slug);
  if (!isLocale(lang) || !pair) return {};
  const c = buildPairContent(lang, pair);
  return pageMetadata(lang, `/${pair.slug}/`, { title: c.title, description: c.description });
}

export default async function PairPage({ params }: PageProps<"/[lang]/[pair]">) {
  const { lang, pair: slug } = await params;
  const pair = getPair(slug);
  if (!isLocale(lang) || !pair) notFound();

  const t = getMessages(lang);
  const from = FORMATS[pair.from];
  const to = FORMATS[pair.to];
  const c = buildPairContent(lang, pair);
  const path = localePath(lang, `/${pair.slug}/`);

  const sameFrom = PAIRS.filter((p) => p.from === pair.from && p.to !== pair.to);
  const sameTo = PAIRS.filter((p) => p.to === pair.to && p.from !== pair.from);
  const reverse = getPair(`${pair.to}-to-${pair.from}`);
  const chip = "inline-block rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent hover:text-accent";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl(localePath(lang)) },
            { "@type": "ListItem", position: 2, name: c.h1, item: absoluteUrl(path) },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: `${SITE_NAME} – ${c.h1}`,
          url: absoluteUrl(path),
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (Web browser)",
          inLanguage: lang,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: c.description,
        }}
      />

      <nav aria-label={t.nav.breadcrumb} className="mb-4 text-sm text-muted">
        <Link href={localePath(lang)} className="hover:text-accent">
          {t.pair.breadcrumbHome}
        </Link>{" "}
        <span aria-hidden="true">/</span> <span>{c.h1}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{c.h1}</h1>
        <p className="mt-3 text-muted">{t.pair.toolLead(from.name, to.name)}</p>
      </header>

      <Converter initialOutput={pair.to} inputHint={from.name} />

      <article className="prose-content mt-14">
        {c.lead.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <h2>{t.pair.vs(from.name, to.name)}</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.pair.colItem}</th>
                <th scope="col">{from.name}</th>
                <th scope="col">{to.name}</th>
              </tr>
            </thead>
            <tbody>
              {c.table.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="font-medium">
                    {row.label}
                  </th>
                  <td>{row.from}</td>
                  <td>{row.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>
          <Link href={localePath(lang, `/formats/${from.id}/`)}>{t.pair.whatIs(from.name)}</Link>
        </h3>
        <p>{c.fromIntro}</p>
        <h3>
          <Link href={localePath(lang, `/formats/${to.id}/`)}>{t.pair.whatIs(to.name)}</Link>
        </h3>
        <p>{c.toIntro}</p>

        <h2>{t.pair.changesTitle(from.name, to.name)}</h2>
        {c.changes.map((ch) => (
          <section key={ch.title}>
            <h3>{ch.title}</h3>
            <p>{ch.body}</p>
          </section>
        ))}

        <h2>{t.pair.whenTitle}</h2>
        <ul>
          {c.when.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>

        {c.tips.length > 0 && (
          <>
            <h2>{t.pair.tipsTitle(from.name, to.name)}</h2>
            {c.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </>
        )}
      </article>

      <AdSlot name="content" />

      <Faq items={c.faq} heading={t.pair.faqTitle(from.name, to.name)} />

      <section aria-labelledby="related-heading" className="mt-14">
        <h2 id="related-heading" className="mb-3 text-xl font-bold">
          {t.pair.relatedTitle}
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {reverse && (
            <li>
              <Link
                href={localePath(lang, `/${reverse.slug}/`)}
                className="inline-block rounded-lg border border-accent px-3 py-1.5 font-semibold text-accent hover:bg-accent-soft"
              >
                {t.pair.reverse(to.name, from.name)}
              </Link>
            </li>
          )}
          {[...sameFrom, ...sameTo].map((p) => (
            <li key={p.slug}>
              <Link href={localePath(lang, `/${p.slug}/`)} className={chip}>
                {FORMATS[p.from].name} → {FORMATS[p.to].name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
