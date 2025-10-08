// src/components/MeetingMembersPanel.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
  collection,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "./Spinner";

function calcAge(birthdate) {
  if (!birthdate) return null;
  try {
    const d = new Date(birthdate);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  } catch {
    return null;
  }
}

/**
 * MeetingMembersPanel
 * - members 실시간 표시
 * - 멤버 클릭 시 프로필 모달: 닉네임, 나이, 지역/도시, 관심사
 * - 방장(ownerId): 모달에서 내보내기/방장 위임 가능
 *
 * props:
 *  - meetingId (string, 필수)
 *  - ownerId   (string, 필수)
 */
export default function MeetingMembersPanel({ meetingId, ownerId }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [members, setMembers] = useState({}); // UID[]
  const [profiles, setProfiles] = useState({}); // { uid: profile }
  const [loading, setLoading] = useState(true);

  // modal state
  const [activeUid, setActiveUid] = useState(null);
  const [kicking, setKicking] = useState(null);
  const [transferring, setTransferring] = useState(null);
  const [filter, setFilter] = useState("");

  // 모임 멤버 실시간 구독
  useEffect(() => {
    if (!meetingId) return;
    const ref = doc(db, "meetings", meetingId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const arr = Array.isArray(data?.members) ? data.members : [];
        setMembers(arr);
        setLoading(false);
      },
      (err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("members onSnapshot error:", err);
        }
        toast.error("멤버 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [meetingId]);

  // UID 배열을 10개 단위로 나눠 in-쿼리로 프로필 일괄 가져오기
  const fetchProfiles = useCallback(async (uids) => {
    const clean = (uids || []).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < clean.length; i += 10)
      chunks.push(clean.slice(i, i + 10));
    const result = {};
    for (const ch of chunks) {
      if (ch.length === 0) continue;
      const q = query(
        collection(db, "userProfiles"),
        where("__name__", "in", ch)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        result[d.id] = { id: d.id, ...d.data() };
      });
    }
    return result;
  }, []);

  // members 변경 시 프로필 동기화
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchProfiles(members);
        if (!cancelled) setProfiles(map);
      } catch (e) {
        if (process.env.NODE_ENV !== "production")
          console.error("fetchProfiles error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [members, fetchProfiles]);

  const isOwner = useMemo(
    () => uid && ownerId && uid === ownerId,
    [uid, ownerId]
  );

  // 검색: displayName 기준 (UID는 제외)
  const shownMembers = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter((m) =>
      (profiles[m]?.displayName || "").toLowerCase().includes(keyword)
    );
  }, [filter, members, profiles]);

  // 모달 내 액션
  const handleKick = async (targetUid) => {
    if (!isOwner) return;
    if (!targetUid || targetUid === ownerId) return; // 방장 강퇴 방지
    if (targetUid === uid) return; // 자신 강퇴 방지
    try {
      setKicking(targetUid);
      await updateDoc(doc(db, "meetings", meetingId), {
        members: arrayRemove(targetUid),
      });
      toast.success("멤버를 내보냈습니다.");
      setActiveUid(null);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error(e);
      toast.error("멤버 내보내기에 실패했습니다.");
    } finally {
      setKicking(null);
    }
  };

  const handleTransferOwnership = async (targetUid) => {
    if (!isOwner) return;
    if (!targetUid || targetUid === ownerId) return; // 이미 방장
    if (!members.includes(targetUid)) {
      toast.error("멤버에게만 권한을 위임할 수 있습니다.");
      return;
    }
    const targetName = profiles[targetUid]?.displayName || "해당 멤버";
    if (!window.confirm(`${targetName}님에게 방장 권한을 위임할까요?`)) return;
    try {
      setTransferring(targetUid);
      await updateDoc(doc(db, "meetings", meetingId), { ownerId: targetUid });
      toast.success("방장 권한을 위임했습니다.");
      setActiveUid(null);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error(e);
      toast.error("권한 위임에 실패했습니다.");
    } finally {
      setTransferring(null);
    }
  };

  // 모달 표시용 데이터
  const activeProfile = activeUid ? profiles[activeUid] : null;
  const activeAge = activeProfile ? calcAge(activeProfile.birthdate) : null;

  // location에서 지역/도시 추출(간단 파서)
  function parseRegionCity(loc) {
    if (!loc) return { region: "", city: "" };
    const s = String(loc);
    if (s.includes(",")) {
      const [a, b] = s.split(",").map((t) => t.trim());
      return { region: a || "", city: b || "" };
    }
    const parts = s.split(/\s+/);
    return { region: parts[0] || "", city: parts[1] || "" };
  }
  const { region: locRegion, city: locCity } = activeProfile
    ? parseRegionCity(activeProfile.location)
    : { region: "", city: "" };

  return (
    <div className="card">
      <div className="flex gap-2">
        <h2>멤버 관리</h2>
      </div>
      <p className="muted mt-2">
        총 {members.length}명
        {isOwner ? " · 멤버를 눌러 상세 보기에서 관리하세요." : ""}
      </p>

      <div className="mt-2">
        <input
          className="input"
          placeholder="이름으로 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center" }}>
          <Spinner />
        </div>
      ) : members.length === 0 ? (
        <div className="center p-3 muted">표시할 멤버가 없습니다.</div>
      ) : (
        <div className="list mt-3">
          {shownMembers.map((m) => {
            const p = profiles[m] || {};
            const isMe = uid === m;
            const isTheOwner = ownerId === m;

            return (
              <button
                key={m}
                className="list-item"
                onClick={() => setActiveUid(m)}
              >
                <div className="flex gap-2">
                  <div className="profile-image-preview avatar-40">
                    {p.photoURL ? (
                      <img
                        src={p.photoURL}
                        alt={p.displayName || "프로필"}
                        className="profile-preview-image"
                      />
                    ) : (
                      <div className="profile-placeholder-image avatar-40" />
                    )}
                  </div>

                  <div>
                    <strong>{p.displayName || "(이름 없음)"}</strong>
                    <div className="muted">
                      {isTheOwner ? "방장" : isMe ? "나" : ""}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 프로필 모달 */}
      {activeUid && activeProfile && (
        <div className="modal-overlay" onClick={() => setActiveUid(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>멤버 프로필</h3>
              <button
                className="modal-close-button"
                onClick={() => setActiveUid(null)}
              >
                &times;
              </button>
            </div>

            <div className="center">
              <div
                className="profile-image-preview"
                style={{ width: 120, height: 120 }}
              >
                {activeProfile.photoURL ? (
                  <img
                    src={activeProfile.photoURL}
                    alt={activeProfile.displayName || "프로필"}
                    className="profile-preview-image"
                  />
                ) : (
                  <div
                    className="profile-placeholder-image"
                    style={{ width: 120, height: 120 }}
                  />
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="list">
                <div className="list-item">
                  <strong>닉네임</strong>
                  <div className="muted">
                    {activeProfile.displayName || "정보 없음"}
                  </div>
                </div>
                <div className="list-item">
                  <strong>나이</strong>
                  <div className="muted">
                    {activeAge !== null ? `${activeAge}세` : "정보 없음"}
                  </div>
                </div>
                <div className="list-item">
                  <strong>지역 · 도시</strong>
                  <div className="muted">
                    {locRegion || locCity
                      ? `${locRegion}${
                          locRegion && locCity ? " · " : ""
                        }${locCity}`
                      : "정보 없음"}
                  </div>
                </div>
                <div className="list-item">
                  <strong>관심사</strong>
                  <div className="profile-interests">
                    {(activeProfile.interests || []).length > 0 ? (
                      (activeProfile.interests || []).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="muted">정보 없음</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isOwner && activeUid !== ownerId && (
              <div className="cta mt-3">
                {activeUid !== uid && (
                  <button
                    className="btn btn--danger"
                    onClick={() => handleKick(activeUid)}
                    disabled={kicking === activeUid}
                  >
                    {kicking === activeUid ? "처리 중…" : "내보내기"}
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => handleTransferOwnership(activeUid)}
                  disabled={transferring === activeUid}
                >
                  {transferring === activeUid ? "처리 중…" : "방장 위임"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
