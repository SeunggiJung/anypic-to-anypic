"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AD_SLOTS, ADSENSE_CLIENT, adsActive, type AdSlotName } from "@/lib/ads";
import { cn } from "@/lib/utils";
import { useT } from "./LangProvider";

interface Props {
  name: AdSlotName;
  className?: string;
  /** true면 데스크톱 폭(lg 이상)에서만 마운트한다. 숨겨진 광고가 요청을 보내지 않게 하기 위함 */
  desktopOnly?: boolean;
}

const DESKTOP = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 실제 애드센스 수동 광고 슬롯. AdSlot이 NEXT_PUBLIC_ADS_ENABLED=true 일 때만 동적으로 불러오므로,
 * 슬롯을 켜지 않은 빌드에는 이 파일이 번들에 들어가지 않는다.
 * adsbygoogle.js 스크립트는 app/[lang]/layout.tsx가 head에 넣는다(게시자 ID가 있을 때).
 */
export default function AdSlotLive({ name, className, desktopOnly = false }: Props) {
  const t = useT();
  const slot = AD_SLOTS[name];
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
  const live = adsActive && slot.length > 0 && (!desktopOnly || isDesktop);

  useEffect(() => {
    if (!live) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 스크립트 로드 실패(차단 등)는 무시
    }
  }, [live]);

  if (!live) return null;

  // 같은 이름의 aside가 여러 개 생기거나 중첩되지 않도록 group을 쓴다
  return (
    <div role="group" aria-label={t.ads.label} className={cn("my-8", className)}>
      <p aria-hidden="true" className="mb-1 text-center text-[10px] uppercase tracking-wider text-muted">
        {t.ads.label}
      </p>
      <ins
        className="adsbygoogle block min-h-[100px]"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
