import { ADSENSE_CLIENT, ADS_ENABLED } from "./site";

/**
 * 광고 슬롯 이름 → 애드센스 광고 단위 ID(data-ad-slot).
 * 승인 후 환경 변수 NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-…), NEXT_PUBLIC_ADS_ENABLED=true 와
 * 아래 슬롯 ID를 설정하면 코드 수정 없이 광고가 켜진다.
 */
export const AD_SLOTS = {
  /** 메인·랜딩 페이지 본문 중간 (변환 버튼에서 충분히 떨어진 위치) */
  content: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? "",
  /** 가이드 본문 중간·하단 */
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE ?? "",
  /** 데스크톱 사이드바 */
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR ?? "",
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;

export const adsActive = ADS_ENABLED && ADSENSE_CLIENT.length > 0;
export { ADSENSE_CLIENT };
