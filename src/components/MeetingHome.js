// src/components/MeetingHome.js
import React from "react";
import { FaBookmark } from "react-icons/fa";
import { UILABELS } from "../constants/domain";

const MeetingHome = ({ meeting, user, onToggleJoin, pending = false }) => {
  const {
    title,
    description,
    region,
    city,
    location, // 레거시 호환
    maxMembers = 0,
    members = [],
    ownerId,
    _effectiveIsMember,
  } = meeting || {};

  const memberCount = Array.isArray(members) ? members.length : 0;
  const isOwner = user && ownerId === user.uid;
  const isMember =
    !!_effectiveIsMember || (user && members?.includes(user.uid));
  const isFull = maxMembers > 0 && memberCount >= maxMembers;

  return (
    <div className="list-item">
      <div className="flex gap-2">
        <div className="badge">
          <FaBookmark />
          {UILABELS.CLUB}
        </div>
        <strong>{title}</strong>
      </div>

      {description && <div className="muted">{description}</div>}

      <div className="muted">
        {region} · {city || location}
      </div>

      <div className="cta mt-3">
        {isOwner ? (
          <span className="muted">내가 만든 {UILABELS.CLUB}</span>
        ) : isMember ? (
          <span className="muted">이미 가입한 {UILABELS.CLUB}</span>
        ) : (
          <button
            className="btn btn--primary"
            onClick={() => onToggleJoin?.(meeting)}
            disabled={pending || isFull}
          >
            {isFull
              ? "정원 초과"
              : pending
              ? "처리 중…"
              : `${UILABELS.CLUB} 가입`}
          </button>
        )}
      </div>
    </div>
  );
};

export default MeetingHome;
