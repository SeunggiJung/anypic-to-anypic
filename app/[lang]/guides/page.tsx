import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, getMessages, isLocale, localePath } from "@/lib/i18n";
import { getAllGuides } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo/meta";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/guides">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).guides;
  return pageMetadata(lang, "/guides/", { title: t.metaTitle, description: t.metaDescription });
}

export default async function GuidesPage({ params }: PageProps<"/[lang]/guides">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getMessages(lang).guides;
  const guides = getAllGuides(lang);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-3 text-muted">{t.lead}</p>

      {guides.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-surface p-6 text-muted">{t.empty}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={localePath(lang, `/guides/${g.slug}/`)}
                className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <h2 className="text-lg font-bold">{g.title}</h2>
                <p className="mt-1 text-sm text-muted">{g.description}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <time dateTime={g.date}>{g.date}</time>
                  <span>{t.readMinutes(g.readingMinutes)}</span>
                  {g.tags.map((tag) => (
                    <span key={tag} className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">
                      {tag}
                    </span>
                  ))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
