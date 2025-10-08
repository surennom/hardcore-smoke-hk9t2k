// src/components/VirtualizedList.js
import React, { forwardRef, useMemo } from "react";
import { FixedSizeList as List } from "react-window";

/**
 * props:
 * - items: 배열
 * - itemHeight: 숫자(px)
 * - height: 리스트 높이(px) - 보통 viewport 높이에 맞게 적당히
 * - renderRow: (item, index) => ReactNode
 * - width: (선택) 기본 100%
 */
const VirtualizedList = forwardRef(function VirtualizedList(
  { items, itemHeight = 72, height = 480, width = "100%", renderRow },
  ref
) {
  const itemCount = items.length;

  const Row = ({ index, style }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderRow(item, index)}
      </div>
    );
  };

  // 리스트가 비어있을 때 높이 0으로 렌더되는 걸 방지
  const safeHeight = useMemo(() => Math.max(itemHeight * Math.min(itemCount, 8), height), [itemCount, itemHeight, height]);

  return (
    <List
      ref={ref}
      height={safeHeight}
      itemCount={itemCount}
      itemSize={itemHeight}
      width={width}
    >
      {Row}
    </List>
  );
});

export default VirtualizedList;
