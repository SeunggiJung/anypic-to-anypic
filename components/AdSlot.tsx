"use client";

import Script from "next/script";
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
 * 광고 자리. 승인 전(adsActive=false)에는 개발 모드에서만 점선 박스로 위치를 보여 주고,
 * 프로덕션에서는 아무것도 렌더링하지 않는다. 업로드·변환 버튼 근처에는 두지 말 것.
 */
export default function AdSlot({ name, className, desktopOnly = false }: Props) {
  const t = useT();
  const slot = AD_SLOTS[name];
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
  const show = !desktopOnly || isDesktop;
  const live = adsActive && slot.length > 0 && show;

  useEffect(() => {
    if (!live) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 스크립트 로드 실패(차단 등)는 무시
    }
  }, [live]);

  if (!show) return null;

  if (!live) {
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

  return (
    <aside aria-label={t.ads.label} className={cn("my-8", className)}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-wider text-muted">{t.ads.label}</p>
      <Script
        id="adsense-loader"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      />
      <ins
        className="adsbygoogle block min-h-[100px]"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
