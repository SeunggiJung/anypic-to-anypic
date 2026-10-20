import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "./i18n/config";
import { CONTACT_EMAIL, MAX_FILE_SIZE_MB, SITE_NAME } from "./site";

/** 소개·방침·약관·문의 같은 정적 페이지 원고: content/pages/<언어>/<이름>.mdx */
export type StaticPageName = "about" | "privacy" | "terms" | "contact";

export const POLICY_DATE: Record<Locale, string> = {
  ko: "2026년 10월 20일",
  en: "October 20, 2026",
};

export interface StaticPage {
  /** 메타 제목(짧게). 화면의 H1은 heading */
  title: string;
  heading: string;
  description: string;
  content: string;
}

/** 원고 안의 %토큰%을 실제 값으로 바꾼다 (MDX는 중괄호를 코드로 해석하므로 다른 표기를 쓴다). */
function fill(source: string, lang: Locale): string {
  const values: Record<string, string> = {
    SITE_NAME,
    EMAIL: CONTACT_EMAIL,
    DATE: POLICY_DATE[lang],
    MAX_MB: String(MAX_FILE_SIZE_MB),
  };
  return source.replace(/%([A-Z_]+)%/g, (m, key: string) => values[key] ?? m);
}

export function getStaticPage(lang: Locale, name: StaticPageName): StaticPage {
  const file = path.join(process.cwd(), "content", "pages", lang, `${name}.mdx`);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  if (!data.title || !data.description) throw new Error(`content/pages/${lang}/${name}.mdx: title, description 필요`);
  return {
    title: fill(String(data.title), lang),
    heading: fill(String(data.heading ?? data.title), lang),
    description: fill(String(data.description), lang),
    content: fill(content, lang),
  };
}
