import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { LOCALES, type Locale } from "./i18n/config";

/** 원고 위치: content/guides/<언어>/<슬러그>.mdx. 슬러그는 모든 언어에서 같게 유지한다(언어 전환 링크가 이어지도록). */
const ROOT = path.join(process.cwd(), "content", "guides");

export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  updated?: string;
  tags: string[];
  /** 글 끝에 연결할 변환 페이지 슬러그 (예: heic-to-jpg) */
  related: string[];
  readingMinutes: number;
}

export interface Guide extends GuideMeta {
  content: string;
}

function toDate(v: unknown, field: string, file: string): string {
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new Error(`${file}: front matter '${field}'가 올바른 날짜가 아닙니다.`);
  return d.toISOString().slice(0, 10);
}

function readGuide(lang: Locale, file: string): (Guide & { draft: boolean }) | null {
  const slug = file.replace(/\.mdx?$/, "");
  const label = `content/guides/${lang}/${file}`;
  const { data, content } = matter(fs.readFileSync(path.join(ROOT, lang, file), "utf8"));
  for (const key of ["title", "description", "date"]) {
    if (!data[key]) throw new Error(`${label}: front matter '${key}'가 필요합니다.`);
  }
  // 한글은 글자 수, 그 외는 단어 수로 읽는 시간을 어림한다
  const compact = content.replace(/\s/g, "").length;
  const words = content.split(/\s+/).filter(Boolean).length;
  const minutes = lang === "ko" ? compact / 500 : words / 220;
  return {
    slug,
    title: String(data.title),
    description: String(data.description),
    date: toDate(data.date, "date", label),
    updated: data.updated ? toDate(data.updated, "updated", label) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    related: Array.isArray(data.related) ? data.related.map(String) : [],
    readingMinutes: Math.max(1, Math.round(minutes)),
    draft: data.draft === true,
    content,
  };
}

/** `_`로 시작하는 파일(템플릿)과 draft: true 글은 제외한다. */
export function getAllGuides(lang: Locale): Guide[] {
  const dir = path.join(ROOT, lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f) && !f.startsWith("_"))
    .map((f) => readGuide(lang, f))
    .filter((g): g is Guide & { draft: boolean } => g !== null && !g.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getGuide(lang: Locale, slug: string): Guide | undefined {
  return getAllGuides(lang).find((g) => g.slug === slug);
}

/** generateStaticParams용: 언어별로 존재하는 글만 만든다. */
export function allGuideParams(): Array<{ lang: Locale; slug: string }> {
  return LOCALES.flatMap((lang) => getAllGuides(lang).map((g) => ({ lang, slug: g.slug })));
}

/**
 * 본문 중간(소제목 `## ` 기준)에서 둘로 나눈다. 광고 슬롯을 글 중간에 넣기 위함.
 * 소제목이 4개 미만이면 나누지 않는다.
 */
export function splitAtMiddleHeading(source: string): [string, string | null] {
  const starts = [...source.matchAll(/^## /gm)].map((m) => m.index!);
  if (starts.length < 4) return [source, null];
  const at = starts[Math.floor(starts.length / 2)];
  return [source.slice(0, at), source.slice(at)];
}
