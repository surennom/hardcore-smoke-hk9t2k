// src/utils/coverStyle.js
// 문자열(seed)을 5가지 커버 중 하나로 안정적으로 매핑
export function pickCoverClass(seed) {
    const s = String(seed || "");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    const idx = (h % 5) + 1; // 1..5
    return `cover-g${idx}`;
  }
  