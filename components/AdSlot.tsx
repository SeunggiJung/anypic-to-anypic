"use client";

import dynamic from "next/dynamic";
import type { AdSlotName } from "@/lib/ads";
import { cn } from "@/lib/utils";
import { useT } from "./LangProvider";

interface Props {
  name: AdSlotName;
  className?: string;
  /** true면 데스크톱 폭(lg 이상)에서만 마운트한다. 숨겨진 광고가 요청을 보내지 않게 하기 위함 */
  desktopOnly?: boolean;
}

// NEXT_PUBLIC_ADS_ENABLED는 빌드 때 문자열로 박힌다. 켜지 않은 빌드에서는 조건이 거짓으로 굳어
// import()가 통째로 제거되므로 광고 코드와 광고 스크립트 주소가 번들에 남지 않는다.
const AdSlotLive =
  process.env.NEXT_PUBLIC_ADS_ENABLED === "true" ? dynamic(() => import("./AdSlotLive")) : null;

/**
 * 광고 자리. 승인 전에는 개발 모드에서만 점선 박스로 위치를 보여 주고,
 * 프로덕션에서는 아무것도 렌더링하지 않는다. 업로드·변환 버튼 근처에는 두지 말 것.
 */
export default function AdSlot({ name, className, desktopOnly = false }: Props) {
  const t = useT();

  if (AdSlotLive) return <AdSlotLive name={name} className={className} desktopOnly={desktopOnly} />;

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "my-8 flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted",
        className,
      )}
    >
      {t.ads.dev(name)}
    </div>
  );
}
