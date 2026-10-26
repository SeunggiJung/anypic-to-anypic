import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { LangProvider } from "@/components/LangProvider";
import { LOCALES, LOCALE_META, getMessages, isLocale } from "@/lib/i18n";
import {
  ADSENSE_CLIENT,
  BING_SITE_VERIFICATION,
  GOOGLE_SITE_VERIFICATION,
  NAVER_SITE_VERIFICATION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME} – ${t.site.metaTitle}`, template: `%s | ${SITE_NAME}` },
    description: t.site.description,
    applicationName: SITE_NAME,
    // 소유 확인용 태그: 환경 변수가 설정된 것만 출력된다
    verification: {
      google: GOOGLE_SITE_VERIFICATION || undefined,
      other: {
        ...(NAVER_SITE_VERIFICATION && { "naver-site-verification": NAVER_SITE_VERIFICATION }),
        ...(BING_SITE_VERIFICATION && { "msvalidate.01": BING_SITE_VERIFICATION }),
      },
    },
    // 애드센스 사이트 연결(승인 전에도 필요). 광고 표시와는 별개로 게시자 ID만 있으면 출력된다
    other: ADSENSE_CLIENT ? { "google-adsense-account": ADSENSE_CLIENT } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

/** 첫 페인트 전에 저장된(또는 시스템) 테마를 적용해 깜빡임을 막는다. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getMessages(lang);

  return (
    <html lang={LOCALE_META[lang].htmlLang} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* 애드센스 스크립트(자동 광고·수동 슬롯 공용). 게시자 ID 변수가 있을 때만 모든 페이지의 head에 들어간다 */}
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <LangProvider lang={lang}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
          >
            {t.nav.skip}
          </a>
          <Header lang={lang} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer lang={lang} />
        </LangProvider>
      </body>
    </html>
  );
}
