"use client";

import { useState } from "react";

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
}

/**
 * 숫자 입력. 지우고 다시 쓰는 동안에는 입력 중인 글자를 그대로 보여 주고,
 * 올바른 숫자가 되면 바로 값에 반영한다. 포커스를 벗어나면 허용 범위로 정리한다.
 */
export default function NumberField({ value, min, max, onChange, label, className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setDraft(raw);
        const n = Number(raw);
        if (raw !== "" && n >= min) onChange(Math.min(max, n));
      }}
      onBlur={() => setDraft(null)}
      onFocus={(e) => e.target.select()}
      className={className}
    />
  );
}
