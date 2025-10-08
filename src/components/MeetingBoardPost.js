// src/components/MeetingBoardPost.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  limit as qLimit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { FaChevronLeft } from "react-icons/fa";
import Spinner from "./Spinner";

/**
 * 게시글 상세 + 실시간 댓글 + 권한 기반 수정/삭제
 * - 경로: /meeting/:id/board/:postId
 * - 권한:
 *   - 읽기: 모두 가능
 *   - 댓글 작성: 멤버/방장만
 *   - 게시글 수정/삭제: 작성자 또는 방장
 *   - 댓글 수정/삭제: 작성자 또는 방장
 * - 게시글 삭제 시: 하위 comments 서브컬렉션을 배치로 모두 삭제 후 게시글 삭제
 */
export default function MeetingBoardPost() {
  const { id, postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // 모임 권한
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // 게시글
  const [post, setPost] = useState(null);
  const [postLoading, setPostLoading] = useState(true);

  // 게시글 편집 상태
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  // 댓글
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");

  // 댓글 편집/삭제 상태
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingCommentId, setSavingCommentId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const postRef = useMemo(
    () => doc(db, "meetings", id, "posts", postId),
    [id, postId]
  );
  const commentsCol = useMemo(
    () => collection(db, "meetings", id, "posts", postId, "comments"),
    [id, postId]
  );

  // ===== 모임 권한 1회 로드 (방장/멤버 여부) =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser) {
        setIsOwner(false);
        setIsMember(false);
        return;
      }
      try {
        const mref = doc(db, "meetings", id);
        const msnap = await getDoc(mref);
        if (!msnap.exists()) {
          setIsOwner(false);
          setIsMember(false);
          return;
        }
        const data = msnap.data() || {};
        const owner = data.ownerId === currentUser.uid;
        const member =
          Array.isArray(data.members) && data.members.includes(currentUser.uid);
        if (!cancelled) {
          setIsOwner(owner);
          setIsMember(member);
        }
      } catch {
        if (!cancelled) {
          setIsOwner(false);
          setIsMember(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, id]);

  // ===== 게시글 실시간 구독 =====
  useEffect(() => {
    const unsub = onSnapshot(
      postRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setPost(data);
          // 편집 중이 아닐 때만 폼 값 동기화(외부 수정 반영)
          if (!isEditingPost) {
            setEditPostTitle(data.title || "");
            setEditPostContent(data.content || "");
          }
        } else {
          setPost(null);
        }
        setPostLoading(false);
      },
      (err) => {
        if (process.env.NODE_ENV !== "production") console.error(err);
        toast.error("게시글을 불러오지 못했습니다.");
        setPostLoading(false);
      }
    );
    return () => unsub();
  }, [postRef, isEditingPost]);

  // ===== 댓글 실시간 구독 =====
  useEffect(() => {
    const q = query(commentsCol, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setComments(list);
        setCommentsLoading(false);
      },
      (err) => {
        if (process.env.NODE_ENV !== "production") console.error(err);
        toast.error("댓글을 불러오지 못했습니다.");
        setCommentsLoading(false);
      }
    );
    return () => unsub();
  }, [commentsCol]);

  const canPostComment = !!currentUser && (isOwner || isMember);
  const isPostAuthor = !!currentUser && post?.authorId === currentUser.uid;
  const canEditOrDeletePost = isOwner || isPostAuthor;

  const smartBack = useCallback(() => {
    if (window.history.length <= 1) {
      navigate(`/meeting/${id}?tab=board`, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, id]);

  const fmt = (ts) => {
    if (!ts) return "";
    const ms =
      (ts?.toMillis?.() && ts.toMillis()) ||
      (ts?.seconds ? ts.seconds * 1000 : null);
    if (!ms) return "";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mi = `${d.getMinutes()}`.padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  // ===== (중요) 하위 서브컬렉션 삭제 유틸 =====
  // 댓글을 배치로 일정 개수씩 가져와 모두 삭제 (순수 클라이언트 방식)
  const deleteAllComments = useCallback(async () => {
    // 한 번에 너무 많이 지우지 않도록 배치 크기 제한
    const BATCH_SIZE = 300;
    while (true) {
      const snap = await getDocs(query(commentsCol, qLimit(BATCH_SIZE)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      // 다시 루프 → 남은 문서가 없어질 때까지 반복
    }
  }, [commentsCol]);

  // ===== 게시글 수정/삭제 =====
  const startEditPost = useCallback(() => {
    if (!canEditOrDeletePost) return;
    setEditPostTitle(post?.title || "");
    setEditPostContent(post?.content || "");
    setIsEditingPost(true);
  }, [canEditOrDeletePost, post]);

  const cancelEditPost = useCallback(() => {
    setIsEditingPost(false);
    setEditPostTitle(post?.title || "");
    setEditPostContent(post?.content || "");
  }, [post]);

  const savePost = useCallback(async () => {
    if (!canEditOrDeletePost) return;
    const t = (editPostTitle || "").trim();
    const c = (editPostContent || "").trim();
    if (!t) return toast.error("제목을 입력하세요.");
    if (!c) return toast.error("내용을 입력하세요.");

    try {
      setSavingPost(true);
      await updateDoc(postRef, {
        title: t,
        content: c,
        updatedAt: serverTimestamp(),
      });
      setIsEditingPost(false);
      toast.success("게시글이 수정되었습니다.");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      toast.error("게시글 수정에 실패했습니다.");
    } finally {
      setSavingPost(false);
    }
  }, [canEditOrDeletePost, editPostTitle, editPostContent, postRef]);

  const deletePost = useCallback(async () => {
    if (!canEditOrDeletePost) return;
    if (!window.confirm("이 게시글과 모든 댓글을 삭제하시겠습니까?")) return;
    try {
      setDeletingPost(true);
      // 1) 댓글 전부 삭제
      await deleteAllComments();
      // 2) 게시글 삭제
      await deleteDoc(postRef);
      toast.success("게시글이 삭제되었습니다.");
      navigate(`/meeting/${id}?tab=board`, { replace: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      toast.error("게시글 삭제에 실패했습니다.");
    } finally {
      setDeletingPost(false);
    }
  }, [canEditOrDeletePost, deleteAllComments, postRef, navigate, id]);

  // ===== 댓글 작성 =====
  const submitComment = useCallback(async () => {
    if (!currentUser) {
      toast.info("로그인이 필요합니다.");
      navigate("/login", {
        replace: true,
        state: { from: `/meeting/${id}/board/${postId}` },
      });
      return;
    }
    if (!canPostComment) {
      toast.info("댓글 작성은 멤버만 가능합니다.");
      return;
    }
    const content = commentInput.trim();
    if (!content) return;

    try {
      await addDoc(commentsCol, {
        content,
        authorId: currentUser.uid,
        authorName: currentUser.displayName?.trim() || "익명",
        createdAt: serverTimestamp(),
      });
      setCommentInput("");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      toast.error("댓글을 등록하지 못했습니다.");
    }
  }, [
    currentUser,
    canPostComment,
    commentInput,
    commentsCol,
    navigate,
    id,
    postId,
  ]);

  // ===== 댓글 수정/삭제 =====
  const startEditComment = useCallback(
    (c) => {
      if (!currentUser) return;
      const isAuthor = c.authorId === currentUser.uid;
      if (!(isOwner || isAuthor)) return;
      setEditingCommentId(c.id);
      setEditCommentContent(c.content || "");
    },
    [currentUser, isOwner]
  );

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditCommentContent("");
  }, []);

  const saveComment = useCallback(
    async (c) => {
      if (!currentUser) return;
      const isAuthor = c.authorId === currentUser.uid;
      if (!(isOwner || isAuthor)) return;

      const content = (editCommentContent || "").trim();
      if (!content) return toast.error("댓글 내용을 입력하세요.");

      try {
        setSavingCommentId(c.id);
        const cref = doc(db, "meetings", id, "posts", postId, "comments", c.id);
        await updateDoc(cref, { content, updatedAt: serverTimestamp() });
        setEditingCommentId(null);
        setEditCommentContent("");
        toast.success("댓글이 수정되었습니다.");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error(err);
        toast.error("댓글 수정에 실패했습니다.");
      } finally {
        setSavingCommentId(null);
      }
    },
    [currentUser, isOwner, editCommentContent, id, postId]
  );

  const deleteComment = useCallback(
    async (c) => {
      if (!currentUser) return;
      const isAuthor = c.authorId === currentUser.uid;
      if (!(isOwner || isAuthor)) return;
      if (!window.confirm("이 댓글을 삭제하시겠습니까?")) return;

      try {
        setDeletingCommentId(c.id);
        const cref = doc(db, "meetings", id, "posts", postId, "comments", c.id);
        await deleteDoc(cref);
        toast.success("댓글이 삭제되었습니다.");
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error(err);
        toast.error("댓글 삭제에 실패했습니다.");
      } finally {
        setDeletingCommentId(null);
      }
    },
    [currentUser, isOwner, id, postId]
  );

  // ===== 렌더링 =====
  if (postLoading) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <Spinner />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page">
        <div className="card">
          <div className="flex" style={{ alignItems: "center", gap: 8 }}>
            <button className="btn" type="button" onClick={smartBack}>
              <FaChevronLeft /> 뒤로
            </button>
            <h3 style={{ margin: 0 }}>게시글이 없습니다.</h3>
          </div>
          <p className="muted mt-1">삭제되었거나 존재하지 않는 게시글입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="card">
        <div
          className="flex"
          style={{
            alignItems: "center",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <div className="flex" style={{ alignItems: "center", gap: 8 }}>
            <button className="btn" type="button" onClick={smartBack}>
              <FaChevronLeft /> 뒤로
            </button>
            {!isEditingPost ? (
              <h3
                style={{
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={post.title}
              >
                {post.title || "(제목 없음)"}
              </h3>
            ) : (
              <input
                className="input"
                value={editPostTitle}
                onChange={(e) => setEditPostTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={120}
              />
            )}
          </div>

          <span className="muted" style={{ flexShrink: 0 }}>
            {post.authorName || "익명"} · {fmt(post.createdAt)}
          </span>
        </div>
      </div>

      {/* 본문 / 편집 */}
      <div className="card mt-3">
        {!isEditingPost ? (
          post.content ? (
            <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {post.content}
            </p>
          ) : (
            <p className="muted">(내용 없음)</p>
          )
        ) : (
          <textarea
            rows={8}
            className="input"
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            placeholder="내용을 입력하세요"
            maxLength={4000}
          />
        )}

        {/* 게시글 액션: 작성자/방장만 */}
        {canEditOrDeletePost && (
          <div
            className="flex gap-2 mt-2"
            style={{ justifyContent: "flex-end" }}
          >
            {!isEditingPost ? (
              <>
                <button className="btn" onClick={startEditPost}>
                  수정
                </button>
                <button
                  className="btn outline"
                  onClick={deletePost}
                  disabled={deletingPost}
                >
                  {deletingPost ? "삭제 중…" : "삭제"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn--primary"
                  onClick={savePost}
                  disabled={savingPost}
                >
                  {savingPost ? "저장 중…" : "저장"}
                </button>
                <button className="btn" onClick={cancelEditPost}>
                  취소
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 댓글 */}
      <div className="card mt-3">
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>댓글</h4>

        {commentsLoading ? (
          <div style={{ textAlign: "center" }}>
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="muted">첫 댓글을 남겨보세요!</p>
        ) : (
          <ul className="list">
            {comments.map((c) => {
              const isAuthor = !!currentUser && c.authorId === currentUser.uid;
              const canEditOrDeleteComment = isOwner || isAuthor;

              return (
                <li
                  key={c.id}
                  className="list-item"
                  style={{
                    padding: "8px 0",
                    border: "none",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div
                    className="flex"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: "1rem",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "0.95rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={c.authorName}
                    >
                      {c.authorName || "익명"}
                    </strong>
                    <span className="muted" style={{ flexShrink: 0 }}>
                      {fmt(c.createdAt)}
                    </span>
                  </div>

                  {/* 내용 or 편집 */}
                  {editingCommentId === c.id ? (
                    <div className="mt-1">
                      <textarea
                        rows={3}
                        className="input"
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        maxLength={800}
                      />
                      <div
                        className="flex gap-2 mt-2"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          className="btn btn--primary"
                          onClick={() => saveComment(c)}
                          disabled={savingCommentId === c.id}
                        >
                          {savingCommentId === c.id ? "저장 중…" : "저장"}
                        </button>
                        <button className="btn" onClick={cancelEditComment}>
                          취소
                        </button>
                      </div>
                    </div>
                  ) : c.content ? (
                    <div
                      className="mt-1"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {c.content}
                    </div>
                  ) : (
                    <div className="muted mt-1">(내용 없음)</div>
                  )}

                  {/* 댓글 액션: 작성자/방장만 */}
                  {canEditOrDeleteComment && editingCommentId !== c.id && (
                    <div
                      className="flex gap-2 mt-1"
                      style={{ justifyContent: "flex-end" }}
                    >
                      <button
                        className="btn"
                        onClick={() => startEditComment(c)}
                      >
                        수정
                      </button>
                      <button
                        className="btn outline"
                        onClick={() => deleteComment(c)}
                        disabled={deletingCommentId === c.id}
                      >
                        {deletingCommentId === c.id ? "삭제 중…" : "삭제"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* 댓글 입력 */}
        <div className="flex gap-2 mt-2">
          <input
            className="input"
            placeholder={
              canPostComment ? "댓글을 입력하세요" : "멤버만 댓글 작성 가능"
            }
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            maxLength={800}
            disabled={!canPostComment}
          />
          <button
            className="btn"
            onClick={submitComment}
            disabled={!canPostComment || !commentInput.trim()}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
