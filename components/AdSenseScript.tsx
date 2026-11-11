import { ADSENSE_CLIENT } from "@/lib/site";

/**
 * 애드센스 스크립트(자동 광고·수동 슬롯 공용). 게시자 ID 변수가 있을 때만 출력된다.
 *
 * 레이아웃이 아니라 페이지마다 넣는다: noindex로 돌린 조합 페이지(틀 문장뿐인 페이지)에는
 * 광고 코드가 들어가면 안 되기 때문이다. React가 async 스크립트를 문서의 head로 올려 주므로
 * 페이지 본문 어디에 두어도 결과 HTML에서는 head 안에 한 번만 나온다.
 * 소유 확인용 google-adsense-account meta는 app/[lang]/layout.tsx가 모든 페이지에 넣는다.
 */
export default function AdSenseScript() {
  if (!ADSENSE_CLIENT) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
