import React, { memo } from "react";
import { Link } from "react-router-dom";
import Card from "./Card";

function fmt(val) {
  try {
    const d = typeof val?.toDate === "function" ? val.toDate() : new Date(val);
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(d);
  } catch {
    return "미정";
  }
}

const MeetingItem = ({ meeting, user }) => {
  const isMyMeeting = user && meeting?.ownerId === user.uid;
  const meetingDate = meeting?.date ? fmt(meeting.date) : meeting?.createdAt ? fmt(meeting.createdAt) : "미정";
  const memberCount = meeting?.members ? meeting.members.length : 0;

  return (
    <Card>
      <div className="meeting-info-container">
        <Link to={`/meeting/${meeting.id}`} className="meeting-link">
          <div className="meeting-title-row">
            {isMyMeeting && <span className="ribbon">내 모임</span>}
            <h4 className="meeting-title">{meeting?.title || "제목 미정"}</h4>
          </div>
          <div className="meeting-meta">
            <span className="meeting-date">{meetingDate}</span>
            <span className="meeting-members">
              {memberCount}/{meeting?.maxMembers || 0}명
            </span>
          </div>
          <div className="meeting-location">
            {meeting?.location || "지역 미정"}
          </div>
        </Link>
      </div>
    </Card>
  );
};

export default memo(MeetingItem);
