// src/components/MyMeetings.js
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useMeetings from "../hooks/useMeetings";
import { TYPE, UILABELS } from "../constants/domain";
import { pickCoverClass } from "../utils/coverStyle";
import Spinner from "./Spinner";


export default function MyMeetings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { meetings, meetingsLoading } = useMeetings();

  // 탭: 내가 만든 / 내가 가입한
  const [tab, setTab] = useState("owned"); // "owned" | "joined"
  const uid = currentUser?.uid || null;

  // 내 소유/가입 중 '모임(CLUB)'만 필터링
  const { ownedClubs, joinedClubs } = useMemo(() => {
    const base = Array.isArray(meetings) ? meetings : [];
    const me = uid;

    const isOwner = (m) => me && m.ownerId === me;
    const isMember = (m) =>
      me && Array.isArray(m.members) && m.members.includes(me);

    // CLUB만
    const clubs = base.filter((m) => (m.type || TYPE.CLUB) === TYPE.CLUB);

    const owned = clubs.filter((m) => isOwner(m));
    const joined = clubs.filter((m) => !isOwner(m) && isMember(m));

    // 최신 업데이트 순 정렬
    const toMillis = (t) =>
      (t?.toMillis?.() && t.toMillis()) ||
      (t?.seconds && t.seconds * 1000) ||
      0;
    const byUpdatedDesc = (a, b) =>
      (toMillis(b.updatedAt) || toMillis(b.createdAt)) -
      (toMillis(a.updatedAt) || toMillis(a.createdAt));

    owned.sort(byUpdatedDesc);
    joined.sort(byUpdatedDesc);

    return { ownedClubs: owned, joinedClubs: joined };
  }, [meetings, uid]);

  // 리스트 아이템 (탈퇴 버튼 없음)
  const Item = useCallback(
    ({ m }) => (
      <li
        key={m.id}
        className="list-item"
        style={{ cursor: "pointer" }}
        onClick={() => navigate(`/meeting/${m.id}`)}
      >
        <div className="flex gap-2" style={{ alignItems: "center" }}>
          {/* 아바타 */}
          {m.coverImage ? (
            <div className="meeting-avatar">
              <img
                src={m.coverImage}
                alt="cover"
                style={{
                  objectFit: "cover",
                  objectPosition: `${Math.round((m.coverFocusX ?? 0.5) * 100)}% ${Math.round(
                    (m.coverFocusY ?? 0.5) * 100
                  )}%`,
                }}
              />
            </div>
          ) : (
            <div className={`meeting-avatar ${pickCoverClass(m.id)}`} />
          )}

          {/* 본문 */}
          <div className="fill">
            <strong>{m.title || "(이름 없음)"}</strong>
            <div className="muted">
              {m.region} · {m.city}
            </div>
          </div>
        </div>
      </li>
    ),
    [navigate]
  );

  if (!currentUser) {
    return (
      <div className="page">
        <div className="card">
          <p>로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" key={uid || "anon"}>
      {/* 헤더 + 탭 */}
      <div className="card">
        <div
          className="flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h1>내 모임</h1>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className={`btn ${tab === "owned" ? "btn--primary" : ""}`}
            onClick={() => setTab("owned")}
            type="button"
          >
            내가 만든 모임
          </button>
          <button
            className={`btn ${tab === "joined" ? "btn--primary" : ""}`}
            onClick={() => setTab("joined")}
            type="button"
          >
            내가 가입한 모임
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="card mt-3">
        {meetingsLoading ? (
          <div className="card" style={{ textAlign: "center" }}>
                   <Spinner />
                 </div>
        ) : tab === "owned" ? (
          ownedClubs.length === 0 ? (
            <p className="muted mt-2">표시할 {UILABELS.CLUB}이 없습니다.</p>
          ) : (
            <ul className="list">
              {ownedClubs.map((m) => (
                <Item key={m.id} m={m} />
              ))}
            </ul>
          )
        ) : joinedClubs.length === 0 ? (
          <p className="muted mt-2">표시할 {UILABELS.CLUB}이 없습니다.</p>
        ) : (
          <ul className="list">
            {joinedClubs.map((m) => (
              <Item key={m.id} m={m} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
