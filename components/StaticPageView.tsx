import { Mdx } from "@/components/mdx";
import type { Locale } from "@/lib/i18n";
import type { StaticPage } from "@/lib/pages";

/** 소개·방침·약관·문의 공통 레이아웃. 본문은 content/pages/<언어>/<이름>.mdx */
export default function StaticPageView({ lang, page }: { lang: Locale; page: StaticPage }) {
  return (
    <article className="prose-content mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{page.heading}</h1>
      <Mdx source={page.content} lang={lang} />
    </article>
  );
}
