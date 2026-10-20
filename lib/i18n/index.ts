import type { FormatText } from "../formatText";
import type { FormatId } from "../formats";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { FORMAT_TEXT as FORMAT_TEXT_EN } from "./content/en/formats";
import { FORMAT_TEXT as FORMAT_TEXT_KO } from "./content/ko/formats";
import { en } from "./messages/en";
import { ko, type Messages } from "./messages/ko";

export * from "./config";
export type { Messages };

/** 클라이언트에서도 쓰는 가벼운 데이터만 여기서 등록한다. (조합 콘텐츠 생성기는 ./pairContent) */
const MESSAGES: Record<Locale, Messages> = { ko, en };
const FORMAT_TEXT: Record<Locale, Record<FormatId, FormatText>> = { ko: FORMAT_TEXT_KO, en: FORMAT_TEXT_EN };

export function getMessages(lang: Locale = DEFAULT_LOCALE): Messages {
  return MESSAGES[lang];
}

export function getFormatText(lang: Locale = DEFAULT_LOCALE): Record<FormatId, FormatText> {
  return FORMAT_TEXT[lang];
}
