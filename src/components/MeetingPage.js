// src/components/MeetingPage.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import MeetingHome from "./MeetingHome";
import MeetingBoard from "./MeetingBoard";
import PhotoAlbum from "./PhotoAlbum";
import MeetingMembersPanel from "./MeetingMembersPanel";
import Spinner from "./Spinner";
import { useAuth } from "../contexts/AuthContext";
import useMeetings from "../hooks/useMeetings";
import { toast } from "react-toastify";
import {
  joinMeetingTransactional,
  leaveMeetingTransactional,
} from "../utils/meetingActions";
import { TYPE, UILABELS, labelOfType } from "../constants/domain";

const MeetingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { currentUser } = useAuth();
  const { meetings, meetingsLoading } = useMeetings();

  // 낙관적 반영 & 연속 클릭 방지
  const [optimisticAction, setOptimisticAction] = useState(null); // "join" | "leave" | null
  const [pending, setPending] = useState(false);

  // URL에서 초기 탭 읽기 (home/board/photos 외 값은 home으로)
  const [activeTab, setActiveTab] = useState(() => {
    const qs = new URLSearchParams(location.search);
    const tab = qs.get("tab");
    return tab === "home" || tab === "board" || tab === "photos" ? tab : "home";
  });

  // 주소창의 ?tab= 값이 바뀌면 상태도 맞춰줌 (뒤로가기/외부 링크 대응)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const tab = qs.get("tab");
    const next =
      tab === "home" || tab === "board" || tab === "photos" ? tab : "home";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // 탭 전환 (URL 동기화)
  const switchTab = useCallback(
    (tab) => {
      const next =
        tab === "home" || tab === "board" || tab === "photos" ? tab : "home";
      setActiveTab(next);
      navigate(`?tab=${next}`, { replace: true });
    },
    [navigate]
  );

  const meeting = useMemo(
    () => meetings.find((m) => m.id === id),
    [meetings, id]
  );

  if (meetingsLoading)
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <Spinner />
        </div>
      </div>
    );

  if (!meeting)
    return (
      <div className="page">
        <div className="card">
          <p>해당 {UILABELS.CLUB}을 찾을 수 없습니다.</p>
        </div>
      </div>
    );

  // 타입/라벨 (레거시 문서에 type이 없을 수도 있으니 기본 CLUB)
  const type = meeting.type || TYPE.CLUB;
  const typeLabel = labelOfType(type);

  const uid = currentUser?.uid;
  const members = Array.isArray(meeting.members) ? meeting.members : [];
  const max = Number(meeting.maxMembers) || 0;

  const rawIsMember = !!(uid && members.includes(uid));
  const rawCount = members.length;

  // 낙관적 반영 상태를 고려한 계산
  const effectiveIsMember =
    optimisticAction === "join"
      ? true
      : optimisticAction === "leave"
      ? false
      : rawIsMember;

  const effectiveCount =
    rawCount +
    (optimisticAction === "join" && !rawIsMember ? 1 : 0) -
    (optimisticAction === "leave" && rawIsMember ? 1 : 0);

  const effectiveIsFull = max > 0 ? effectiveCount >= max : false;

  const handleToggleJoin = async () => {
    if (!currentUser) {
      toast.info("로그인이 필요합니다.");
      navigate("/login", { replace: true, state: { from: `/meeting/${id}` } });
      return;
    }
    if (pending) return;

    const targetAction = rawIsMember ? "leave" : "join";
    setOptimisticAction(targetAction);
    setPending(true);

    try {
      if (targetAction === "join") {
        await joinMeetingTransactional(id, uid);
        toast.success(`${typeLabel}에 가입했어요.`);
      } else {
        await leaveMeetingTransactional(id, uid);
        toast.success(`${typeLabel}에서 탈퇴했어요.`);
      }
      setOptimisticAction(null); // 스냅샷으로 실제 반영 예정
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error(e);
      setOptimisticAction(null);
      if (e?.message === "MEETING_FULL") toast.error("정원이 꽉 찼습니다.");
      else if (e?.message === "MEETING_NOT_FOUND")
        toast.error(`${typeLabel}을(를) 찾을 수 없습니다.`);
      else toast.error("처리에 실패했습니다.");
    } finally {
      setPending(false);
    }
  };

  const isOwner = currentUser && meeting.ownerId === uid;

  return (
    <div className="page">
      {/* 상단 액션바 */}
      <div className="meeting-toolbar p-3 flex gap-2">
        {isOwner ? (
          <span className="ribbon">{`내 ${typeLabel}`}</span>
        ) : effectiveIsMember ? (
          <button
            className="outline"
            onClick={handleToggleJoin}
            disabled={pending}
          >
            {pending ? "처리 중…" : `${typeLabel} 탈퇴`}
          </button>
        ) : (
          <button
            onClick={handleToggleJoin}
            disabled={pending || effectiveIsFull}
          >
            {effectiveIsFull
              ? "정원 초과"
              : pending
              ? "처리 중…"
              : `${typeLabel} 가입`}
          </button>
        )}
      </div>

      {/* 탭 버튼 */}
      <div className="tabs">
        <button
          className={activeTab === "home" ? "tab tab--active" : "tab"}
          onClick={() => switchTab("home")}
        >
          소개
        </button>
        <button
          className={activeTab === "board" ? "tab tab--active" : "tab"}
          onClick={() => switchTab("board")}
        >
          게시판
        </button>
        <button
          className={activeTab === "photos" ? "tab tab--active" : "tab"}
          onClick={() => switchTab("photos")}
        >
          사진첩
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="meeting-content">
        {activeTab === "home" && (
          <>
            <MeetingHome
              meeting={{
                ...meeting,
                _effectiveIsMember: effectiveIsMember,
                _effectiveIsFull: effectiveIsFull,
                _effectiveCount: effectiveCount,
              }}
              user={currentUser}
              onToggleJoin={handleToggleJoin}
              pending={pending}
            />
            {/* 멤버 관리 패널은 소개 탭에서만 노출 */}
            <div className="mt-3">
              <MeetingMembersPanel meetingId={id} ownerId={meeting?.ownerId} />
            </div>
          </>
        )}

        {activeTab === "board" && (
          <MeetingBoard
            meetingId={id}
            currentUser={currentUser}
            canPost={effectiveIsMember || isOwner}
          />
        )}

        {activeTab === "photos" && <PhotoAlbum meetingId={id} />}
      </div>
    </div>
  );
};

export default MeetingPage;
