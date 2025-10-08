// src/constants/domain.js
export const TYPE = Object.freeze({
  CLUB: "club", // 동아리(=네가 말한 '모임')
  EVENT: "event", // 벙개
});

/**
 * UI 라벨(표시용 단어) — 여기만 바꾸면 앱 전체 용어가 바뀜.
 * 예시 A) "모임 / 벙개"
 * 예시 B) "동아리 / 벙개"
 */
export const UILABELS = Object.freeze({
  CLUB: "모임", // ← 네가 소모임 앱 익숙하면 '모임' 추천
  EVENT: "벙개",
});

/** 타입 → 라벨 */
export const labelOfType = (type) => {
  if (type === TYPE.CLUB) return UILABELS.CLUB;
  if (type === TYPE.EVENT) return UILABELS.EVENT;
  return "알수없음";
};
