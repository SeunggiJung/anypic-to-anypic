import type { PairContent } from "../seo/pairLogic";
import type { Pair } from "../seo/pairs";
import type { Locale } from "./config";
import { buildPairContent as buildEn } from "./content/en/pair";
import { buildPairContent as buildKo } from "./content/ko/pair";

const BUILDERS: Record<Locale, (pair: Pair) => PairContent> = { ko: buildKo, en: buildEn };

/** 서버(페이지)에서만 쓴다. 조합별 랜딩 페이지 본문을 해당 언어로 만든다. */
export function buildPairContent(lang: Locale, pair: Pair): PairContent {
  return BUILDERS[lang](pair);
}
