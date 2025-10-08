// src/components/SkeletonList.js
import React from "react";

/**
 * 단순 스켈레톤 리스트
 * @param {number} rows      - 몇 줄 그릴지 (기본 8)
 * @param {number} rowHeight - 각 줄 높이(px). 60 또는 84에 최적화 (기본 60)
 * @note 컨테이너 높이는 부모에서 className으로 제어하세요 (예: .h-400)
 */
export default function SkeletonList({ rows = 8, rowHeight = 60 }) {
  const rowClass =
    rowHeight === 84 ? "row-84" : rowHeight === 60 ? "row-60" : ""; // 그 외의 값은 기본(60px)로 렌더됨

  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton-row ${rowClass}`}>
          <div className="skeleton skeleton--w60" />
          <div className="skeleton skeleton--w30" />
          <div className="skeleton skeleton--button" />
        </div>
      ))}
    </div>
  );
}
