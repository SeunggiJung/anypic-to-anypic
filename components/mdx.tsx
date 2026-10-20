import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { isLocale, localePath, type Locale } from "@/lib/i18n/config";

/** 글 안의 `/`로 시작하는 내부 링크에 언어 접두사를 붙인다 (`/formats/png/` → `/en/formats/png/`) */
function localize(lang: Locale, href: string): string {
  const first = href.split("/")[1];
  return isLocale(first) ? href : localePath(lang, href);
}

/** 본문 중간에 강조해서 보여줄 메모 */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="my-6 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm leading-relaxed">
      {title && <p className="mb-1 font-bold">{title}</p>}
      <div className="[&>p]:my-1">{children}</div>
    </aside>
  );
}

function componentsFor(lang: Locale) {
  function A({ href = "", children, ...rest }: ComponentProps<"a">) {
    if (href.startsWith("/")) return <Link href={localize(lang, href)}>{children}</Link>;
    const external = /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }

  /** 글 속에서 변환기로 안내하는 버튼형 링크: <ConvertLink to="heic-to-jpg">…</ConvertLink> */
  function ConvertLink({ to, children }: { to: string; children: ReactNode }) {
    return (
      <Link
        href={localePath(lang, `/${to}/`)}
        className="my-2 inline-block rounded-lg bg-accent px-4 py-2 font-bold !text-on-accent !no-underline hover:bg-accent-hover"
      >
        {children}
      </Link>
    );
  }

  return { a: A, Callout, ConvertLink };
}

export function Mdx({ source, lang }: { source: string; lang: Locale }) {
  return (
    <MDXRemote
      source={source}
      components={componentsFor(lang)}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
    />
  );
}
