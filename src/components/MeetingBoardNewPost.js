// src/components/MeetingBoardNewPost.js
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { FaChevronLeft } from "react-icons/fa";
import Spinner from "./Spinner";

/**
 * MeetingBoardNewPost
 * - 게시글 작성 전용 화면
 * - 멤버/방장만 작성 가능: 진입 시 검사
 * - 성공 후 /meeting/:id?tab=board 로 이동
 */
export default function MeetingBoardNewPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // meetings/:id 문서 로드해서 권한 확인 (간단한 on-demand 체크)
  const canPostCheck = useCallback(async () => {
    if (!currentUser) return false;
    try {
      const mref = doc(db, "meetings", id);
      const msnap = await getDoc(mref);
      if (!msnap.exists()) return false;
      const data = msnap.data() || {};
      const isOwner = data.ownerId === currentUser.uid;
      const isMember =
        Array.isArray(data.members) && data.members.includes(currentUser.uid);
      return isOwner || isMember;
    } catch {
      return false;
    }
  }, [currentUser, id]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!currentUser) {
        toast.info("로그인이 필요합니다.");
        navigate("/login", {
          replace: true,
          state: { from: `/meeting/${id}/board/new` },
        });
        return;
      }

      const t = title.trim();
      const c = content.trim();
      if (!t) return toast.error("제목을 입력하세요.");
      if (!c) return toast.error("내용을 입력하세요.");

      const allowed = await canPostCheck();
      if (!allowed) {
        toast.info("게시글 작성은 멤버만 가능합니다.");
        navigate(`/meeting/${id}?tab=board`, { replace: true });
        return;
      }

      try {
        setSubmitting(true);
        const postsCol = collection(db, "meetings", id, "posts");
        await addDoc(postsCol, {
          title: t,
          content: c,
          authorId: currentUser.uid,
          authorName: currentUser.displayName?.trim() || "익명",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("게시글이 등록되었습니다.");
        navigate(`/meeting/${id}?tab=board`, { replace: true });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("add post error:", err);
        }
        toast.error("등록 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, title, content, id, canPostCheck, navigate]
  );

  const smartBack = useCallback(() => {
    if (window.history.length <= 1) {
      navigate(`/meeting/${id}?tab=board`, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, id]);

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="card">
        <div className="flex" style={{ alignItems: "center", gap: "8px" }}>
        <button className="btn" type="button" onClick={smartBack}>
            <FaChevronLeft /> 뒤로
          </button>
          <h3 style={{ margin: 0 }}>게시글 작성</h3>
        </div>
      </div>

      {/* 폼 */}
      <form className="card mt-3" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label>제목</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="제목을 입력하세요"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="form-row mt-2">
          <div>
            <label>내용</label>
            <textarea
              rows={8}
              className="input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              maxLength={4000}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={smartBack}>
            취소
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? "등록 중…" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
