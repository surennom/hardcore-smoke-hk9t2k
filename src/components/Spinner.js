// src/components/Spinner.js
import React, { memo, useEffect, useState } from "react";

/**
 * 재사용 가능한 SVG 스피너
 * - 외부 CSS 불필요
 * - 접근성(aria) 지원
 * - 사용 예: <Spinner /> 또는 <Spinner size={24} stroke={3} label="불러오는 중" />
 */
function SpinnerBase({
  size = 32,
  stroke = 4,
  colorBase = "#e5e7eb",   // 회색 (tailwind gray-200 근처)
  colorAccent = "#3b82f6", // 파랑 (tailwind blue-500 근처)
  label = "로딩 중…",
  className = "",
  style = {},
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // 사용자 환경설정: 모션 축소
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // 애니메이션 시간 (모션 축소면 정지)
  const dur = reducedMotion ? undefined : "1s";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={className}
      style={{
        display: "inline-block",
        lineHeight: 0,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* 배경 원형 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colorBase}
          strokeWidth={stroke}
        />
        {/* 진행 원호 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colorAccent}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * 0.75}
          strokeLinecap="round"
        >
          {!reducedMotion && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${size / 2} ${size / 2}`}
              to={`360 ${size / 2} ${size / 2}`}
              dur={dur}
              repeatCount="indefinite"
            />
          )}
        </circle>
        <title>{label}</title>
      </svg>
    </div>
  );
}

const Spinner = memo(SpinnerBase);
export default Spinner;
