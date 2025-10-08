// src/components/SearchPage.js
import React, { useMemo, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import useMeetings from "../hooks/useMeetings";
import { TYPE, UILABELS } from "../constants/domain";
import { pickCoverClass } from "../utils/coverStyle";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import Spinner from "./Spinner";

export default function SearchPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { meetings, meetingsLoading } = useMeetings();

  // 입력값과 실제 검색에 쓰이는 확정값 분리 (엔터/버튼으로만 반영)
  const [queryInput, setQueryInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const onSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      setSearchTerm(queryInput.trim());
    },
    [queryInput]
  );

  const handleCreate = () => navigate("/create");

  // 1) 기본 베이스: 전체 meetings
  // 2) 로그인 사용자 기준으로 '내가 만든/가입한' 모임은 제외
  // 3) 검색어가 있으면 title/region/city만 대상으로 필터
  const filteredBase = useMemo(() => {
    const base = Array.isArray(meetings) ? meetings : [];
    const uid = currentUser?.uid;

    const notMine = base.filter((m) => {
      const members = Array.isArray(m.members) ? m.members : [];
      const isOwner = uid && m.ownerId === uid;
      const isMember = uid && members.includes(uid);
      return !(isOwner || isMember);
    });

    if (!searchTerm) return notMine;

    const q = searchTerm.toLowerCase();
    return notMine.filter((m) => {
      const title = (m.title || "").toLowerCase();
      const region = (m.region || "").toLowerCase();
      const city = (m.city || "").toLowerCase();
      return title.includes(q) || region.includes(q) || city.includes(q);
    });
  }, [meetings, currentUser?.uid, searchTerm]);

  // 섹션 분리: 모임(CLUB) / 벙개(EVENT)
  const clubList = useMemo(
    () => filteredBase.filter((m) => (m.type || TYPE.CLUB) === TYPE.CLUB),
    [filteredBase]
  );

  const eventList = useMemo(
    () => filteredBase.filter((m) => m.type === TYPE.EVENT),
    [filteredBase]
  );

  return (
    <div className="page" key={currentUser?.uid || "anon"}>
      {/* 헤더: 제목 + 만들기 버튼 */}
      <div className="card">
        <div
          className="flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h1>모임 찾기</h1>
          <button className="btn btn--primary" onClick={handleCreate}>
            만들기
          </button>
        </div>

        {/* 검색 폼 */}
        <form className="flex gap-2 mt-2" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder={`${UILABELS.CLUB} 이름/지역/도시로 검색`}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
          <button className="btn" type="submit" aria-label="검색">
            <FaSearch />
          </button>
        </form>
      </div>

      {/* 목록 섹션: 모임(CLUB) */}
      <div className="card mt-3">
        <div
          className="flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h2 style={{ margin: 0 }}>{UILABELS.CLUB}</h2>
        </div>

        {meetingsLoading ? (
          <div className="card" style={{ textAlign: "center" }}>
            <Spinner />
          </div>
        ) : clubList.length === 0 ? (
          <p className="muted mt-2">표시할 {UILABELS.CLUB}이 없습니다.</p>
        ) : (
          <ul className="list">
            {clubList.map((m) => (
              <li
                key={m.id}
                className="list-item"
                onClick={() => navigate(`/meeting/${m.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex gap-2" style={{ alignItems: "center" }}>
                  {/* 아바타: 업로드 이미지 or 그라디언트 */}
                  {m.coverImage ? (
                    <div className="meeting-avatar">
                      <img
                        src={m.coverImage}
                        alt="cover"
                        style={{
                          objectFit: "cover",
                          objectPosition: `${Math.round(
                            (m.coverFocusX ?? 0.5) * 100
                          )}% ${Math.round((m.coverFocusY ?? 0.5) * 100)}%`,
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
            ))}
          </ul>
        )}
      </div>

      {/* 목록 섹션: 벙개(EVENT) */}
      <div className="card mt-3">
        <div
          className="flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h2 style={{ margin: 0 }}>{UILABELS.EVENT}</h2>
        </div>

        {meetingsLoading ? (
          <div className="card" style={{ textAlign: "center" }}>
            <Spinner />
          </div>
        ) : eventList.length === 0 ? (
          <p className="muted mt-2">표시할 {UILABELS.EVENT}이 없습니다.</p>
        ) : (
          <ul className="list">
            {eventList.map((m) => (
              <li
                key={m.id}
                className="list-item"
                onClick={() => navigate(`/meeting/${m.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex gap-2" style={{ alignItems: "center" }}>
                  {/* 아바타: 업로드 이미지 or 그라디언트 */}
                  {m.coverImage ? (
                    <div className="meeting-avatar">
                      <img
                        src={m.coverImage}
                        alt="cover"
                        style={{
                          objectFit: "cover",
                          objectPosition: `${Math.round(
                            (m.coverFocusX ?? 0.5) * 100
                          )}% ${Math.round((m.coverFocusY ?? 0.5) * 100)}%`,
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
