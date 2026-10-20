import Link from "next/link";
import { FORMAT_IDS, FORMATS } from "@/lib/formats";
import { getFormatText, getMessages, localePath, type Locale } from "@/lib/i18n";

export default function SupportedFormats({ lang }: { lang: Locale }) {
  const t = getMessages(lang);
  const text = getFormatText(lang);
  return (
    <section aria-labelledby="formats-heading" className="mt-14">
      <h2 id="formats-heading" className="mb-1 text-2xl font-bold">
        {t.home.formatsTitle}
      </h2>
      <p className="mb-4 text-muted">{t.home.formatsLead}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-accent-soft">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">{t.home.colFormat}</th>
              <th scope="col" className="px-4 py-2 font-semibold">{t.home.colRead}</th>
              <th scope="col" className="px-4 py-2 font-semibold">{t.home.colWrite}</th>
              <th scope="col" className="px-4 py-2 font-semibold">{t.home.colTraits}</th>
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
                  <td className="px-4 py-2">{f.input ? "○" : "–"}</td>
                  <td className="px-4 py-2">{f.output ? "○" : "–"}</td>
                  <td className="px-4 py-2 text-muted first-letter:uppercase">{text[id].summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
