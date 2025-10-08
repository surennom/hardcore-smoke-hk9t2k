// src/utils/dateUtils.js

export const getAge = (birthdate) => {
  if (!birthdate) return "미설정";

  const today = new Date();

  const birthDateObj = new Date(birthdate);

  let age = today.getFullYear() - birthDateObj.getFullYear();

  const m = today.getMonth() - birthDateObj.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }

  return age; // 나이 계산 결과만 반환하도록 수정
};
