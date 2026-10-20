import Link from "next/link";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Header({ lang }: { lang: Locale }) {
  const t = getMessages(lang);
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href={localePath(lang)} className="text-lg font-extrabold tracking-tight">
          <Logo />
        </Link>
        <nav aria-label={t.nav.main}>
          <ul className="flex items-center gap-4 text-sm font-medium sm:gap-5">
            <li>
              <Link href={localePath(lang, "/guides/")} className="hover:text-accent">
                {t.nav.guides}
              </Link>
            </li>
            <li>
              <Link href={localePath(lang, "/formats/")} className="hover:text-accent">
                {t.nav.formats}
              </Link>
            </li>
            <li>
              <Link href={localePath(lang, "/about/")} className="hover:text-accent">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li>
              <LanguageSwitcher />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
