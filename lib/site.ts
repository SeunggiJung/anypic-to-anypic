/** 배포 후 실제 도메인으로 교체하세요 (환경 변수로도 덮어쓸 수 있음). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://anypic.example").replace(/\/$/, "");
export const SITE_NAME = "AnyPicToAnyPic";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "tmdrl8336@naver.com";
/** 검색엔진·광고 소유권 확인용 (배포 후 각 서비스에서 받은 값을 환경 변수로 넣는다) */
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";
export const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? "";
export const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "";
/** 애드센스 승인 후 true + 슬롯 ID 입력. 승인 전에는 광고가 렌더링되지 않는다. */
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
