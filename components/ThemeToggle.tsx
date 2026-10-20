"use client";

import { useSyncExternalStore } from "react";
import { useT } from "./LangProvider";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function stored(): "light" | "dark" | null {
  try {
    const v = localStorage.getItem("theme");
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  const onSystem = () => {
    // 직접 고른 테마가 없을 때만 시스템 설정 변경을 따라간다
    if (!stored()) document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
    onChange();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("themechange", onChange);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("themechange", onChange);
  };
}

const getSnapshot = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export default function ThemeToggle() {
  const t = useT();
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 저장이 막힌 환경에서는 이번 방문에만 적용
    }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "dark" ? t.theme.toDark : t.theme.toLight}
      className="rounded-md p-2 text-muted hover:bg-accent-soft hover:text-accent"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}
