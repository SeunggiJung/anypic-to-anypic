"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getFormatText, getMessages, type Locale, type Messages } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

const LangContext = createContext<Locale>(DEFAULT_LOCALE);

/** 서버 레이아웃이 알고 있는 언어 코드(문자열)만 넘기고, 사전은 클라이언트에서 직접 찾는다. (함수는 직렬화할 수 없음) */
export function LangProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Locale {
  return useContext(LangContext);
}

export function useT(): Messages {
  return getMessages(useLang());
}

export function useFormatText() {
  return getFormatText(useLang());
}
