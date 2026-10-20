import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FORMAT_IDS, FORMATS } from "@/lib/formats";
import { LOCALES, getFormatText, getMessages, isLocale, localePath } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/meta";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/formats">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang);
  return pageMetadata(lang, "/formats/", { title: t.formatsPage.metaTitle, description: t.formatsPage.metaDescription });
}

export default async function FormatsIndexPage({ params }: PageProps<"/[lang]/formats">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getMessages(lang);
  const text = getFormatText(lang);
  const p = t.formatsPage;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{p.title}</h1>
      <p className="mt-3 max-w-2xl text-muted">{p.lead}</p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {FORMAT_IDS.map((id) => {
          const f = FORMATS[id];
          return (
            <li key={id}>
              <Link
                href={localePath(lang, `/formats/${id}/`)}
                className="block h-full rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
              >
                <span className="text-lg font-bold">{f.name}</span>{" "}
                <span className="text-sm text-muted">· {t.common.yearSuffix(f.year)}</span>
                <span className="mt-1 block text-sm text-muted first-letter:uppercase">{text[id].summary}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-3 mt-12 text-2xl font-bold">{p.compareTitle}</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-accent-soft">
            <tr>
              <th scope="col" className="px-4 py-2">{p.colFormat}</th>
              <th scope="col" className="px-4 py-2">{p.colCompression}</th>
              <th scope="col" className="px-4 py-2">{p.colTransparency}</th>
              <th scope="col" className="px-4 py-2">{p.colAnimation}</th>
              <th scope="col" className="px-4 py-2">{p.colExtensions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {FORMAT_IDS.map((id) => {
              const f = FORMATS[id];
              return (
                <tr key={id}>
                  <th scope="row" className="px-4 py-2 font-bold">
                    <Link href={localePath(lang, `/formats/${id}/`)} className="hover:text-accent hover:underline">
                      {f.name}
                    </Link>
                  </th>
                  <td className="px-4 py-2">{t.common.compressionShort[f.compression]}</td>
                  <td className="px-4 py-2">{f.transparency ? "○" : "–"}</td>
                  <td className="px-4 py-2">{f.animation ? "○" : "–"}</td>
                  <td className="px-4 py-2 text-muted">{f.extensions.map((e) => `.${e}`).join(" ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
