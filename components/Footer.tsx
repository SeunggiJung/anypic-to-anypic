import Link from "next/link";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

export default function Footer({ lang }: { lang: Locale }) {
  const t = getMessages(lang);
  const links = [
    ["/about/", t.nav.about],
    ["/privacy/", t.nav.privacy],
    ["/terms/", t.nav.terms],
    ["/contact/", t.nav.contact],
  ] as const;
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <nav aria-label={t.nav.footer}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map(([path, label]) => (
              <li key={path}>
                <Link href={localePath(lang, path)} className="hover:text-accent">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-4">
          © {new Date().getFullYear()} {SITE_NAME}. {t.privacy.badge}.
        </p>
      </div>
    </footer>
  );
}
