import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StaticPageView from "@/components/StaticPageView";
import { LOCALES, isLocale } from "@/lib/i18n";
import { getStaticPage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo/meta";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const page = getStaticPage(lang, "privacy");
  return pageMetadata(lang, "/privacy/", { title: page.title, description: page.description });
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <StaticPageView lang={lang} page={getStaticPage(lang, "privacy")} />;
}
