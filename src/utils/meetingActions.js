// src/utils/meetingActions.js
import { runTransaction, doc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * 모임 가입 (정원/중복 체크를 서버에서 원자적으로 보장)
 */
export async function joinMeetingTransactional(meetingId, userId) {
  const ref = doc(db, "meetings", meetingId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MEETING_NOT_FOUND");
    const data = snap.data();
    const members = Array.isArray(data.members) ? data.members : [];
    const max = Number(data.maxMembers) || 0;

    if (members.includes(userId)) {
      // 이미 멤버면 조용히 통과(중복 가입 방지)
      return;
    }
    if (max > 0 && members.length >= max) {
      throw new Error("MEETING_FULL");
    }
    tx.update(ref, { members: [...members, userId] });
  });
}

/**
 * 모임 탈퇴 (원자적 보장)
 */
export async function leaveMeetingTransactional(meetingId, userId) {
  const ref = doc(db, "meetings", meetingId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MEETING_NOT_FOUND");
    const data = snap.data();
    const members = Array.isArray(data.members) ? data.members : [];
    if (!members.includes(userId)) {
      // 이미 빠져있으면 조용히 통과
      return;
    }
    tx.update(ref, { members: members.filter((m) => m !== userId) });
  });
}
