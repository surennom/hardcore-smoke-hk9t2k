// src/components/ProfileView.js
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useProfile from "../hooks/useProfile";
import Spinner from "./Spinner";

export default function ProfileView() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userProfile, profileLoading } = useProfile(currentUser);

  // 표시용 아바타
  const photoURL = useMemo(() => {
    return (
      currentUser?.photoURL ||
      userProfile?.photoURL ||
      // 기본 아바타(원형, 배경색은 total.css에서 처리되도록 가정)
      ""
    );
  }, [currentUser, userProfile]);

  // 비로그인
  if (!currentUser) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (profileLoading) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <Spinner />
        </div>
      </div>
    );
  }

  // 데이터 없음(예외)
  if (!userProfile) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">프로필 정보를 불러오지 못했습니다.</p>
          <button className="btn mt-2" onClick={() => navigate("/profile/edit")}>
            프로필 설정하기
          </button>
        </div>
      </div>
    );
  }

  const {
    displayName,
    birthdate,
    gender,
    location,
    interests = [],
  } = userProfile;

  return (
    <div className="page">
      {/* 헤더 카드 */}
      <div className="card">
        <div className="flex" style={{ alignItems: "center", gap: "12px" }}>
          {/* 원형 아바타 */}
          <div
            className="avatar"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              background: "#f0f0f0",
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt="프로필"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                className="muted"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                사진 없음
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName || currentUser.displayName || "닉네임 없음"}
            </h2>
            <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser.email}
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button className="btn" onClick={() => navigate("/profile/edit")}>
              프로필 편집
            </button>
          </div>
        </div>
      </div>

      {/* 상세 정보 카드 */}
      <div className="card mt-3">
        <h3 style={{ marginTop: 0 }}>내 계정 정보</h3>

        <div className="list">
          <div className="list-item" style={{ border: "none" }}>
            <div className="muted" style={{ width: 90, flexShrink: 0 }}>닉네임</div>
            <div>{displayName || "—"}</div>
          </div>

          <div className="list-item">
            <div className="muted" style={{ width: 90, flexShrink: 0 }}>생년월일</div>
            <div>{birthdate || "—"}</div>
          </div>

          <div className="list-item">
            <div className="muted" style={{ width: 90, flexShrink: 0 }}>성별</div>
            <div>
              {gender === "male" ? "남성" : gender === "female" ? "여성" : "—"}
            </div>
          </div>

          <div className="list-item">
            <div className="muted" style={{ width: 90, flexShrink: 0 }}>지역</div>
            <div>{location || "—"}</div>
          </div>

          <div className="list-item">
            <div className="muted" style={{ width: 90, flexShrink: 0 }}>관심사</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Array.isArray(interests) && interests.length > 0 ? (
                interests.map((it, idx) => (
                  <span key={`${it}-${idx}`} className="tag">{it}</span>
                ))
              ) : (
                <span className="muted">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
