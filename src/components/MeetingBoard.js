// src/components/MeetingBoard.js
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Spinner from "./Spinner"; // ✅ 새로 분리된 컴포넌트 사용

const PAGE_SIZE = 10;
const MAX_FETCH_FOR_SEARCH = 300;

export default function MeetingBoard({ meetingId, currentUser, canPost }) {
  const navigate = useNavigate();
  const colRef = useMemo(
    () => collection(db, "meetings", meetingId, "posts"),
    [meetingId]
  );

  const [loading, setLoading] = useState(true);
  const [queryInput, setQueryInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [pages, setPages] = useState([]);
  const [hasMoreServer, setHasMoreServer] = useState(true);

  const [bufferDocs, setBufferDocs] = useState([]);
  const [sliceSize, setSliceSize] = useState(PAGE_SIZE);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  const [showTop, setShowTop] = useState(false);

  const fmt = (ts) => {
    if (!ts) return "";
    const ms =
      (ts?.toMillis?.() && ts.toMillis()) ||
      (ts?.seconds ? ts.seconds * 1000 : null);
    if (!ms) return "";
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
      2,
      "0"
    )}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    loadingRef.current = true;
    try {
      const q1 = query(colRef, orderBy("createdAt", "desc"), qLimit(PAGE_SIZE));
      const snap = await getDocs(q1);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPages([{ docs, lastDoc: snap.docs[snap.docs.length - 1] || null }]);
      setHasMoreServer(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error("게시글을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [colRef]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMoreServer) return;
    const current = pages[pages.length - 1];
    if (!current?.lastDoc) return;

    setLoading(true);
    loadingRef.current = true;
    try {
      const qn = query(
        colRef,
        orderBy("createdAt", "desc"),
        startAfter(current.lastDoc),
        qLimit(PAGE_SIZE)
      );
      const snap = await getDocs(qn);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setPages((prev) => [
        ...prev,
        { docs, lastDoc: snap.docs[snap.docs.length - 1] || null },
      ]);
      setHasMoreServer(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error("다음 게시글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [colRef, pages, hasMoreServer]);

  const serverDocs = useMemo(() => pages.flatMap((p) => p.docs), [pages]);

  const onSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const qstr = queryInput.trim();
      setSearchTerm(qstr);

      if (!qstr) {
        setBufferDocs([]);
        setSliceSize(PAGE_SIZE);
        setPages([]);
        setHasMoreServer(true);
        fetchFirstPage();
        return;
      }

      setLoading(true);
      loadingRef.current = true;
      try {
        const qbuf = query(
          colRef,
          orderBy("createdAt", "desc"),
          qLimit(MAX_FETCH_FOR_SEARCH)
        );
        const snap = await getDocs(qbuf);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const lower = qstr.toLowerCase();
        const filtered = all.filter((p) => {
          const t = (p.title || "").toLowerCase();
          const c = (p.content || "").toLowerCase();
          const a = (p.authorName || "").toLowerCase();
          return t.includes(lower) || c.includes(lower) || a.includes(lower);
        });
        setBufferDocs(filtered);
        setSliceSize(PAGE_SIZE);
      } catch (err) {
        console.error(err);
        toast.error("검색에 실패했습니다.");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [queryInput, colRef, fetchFirstPage]
  );

  const clientDocs = useMemo(
    () => bufferDocs.slice(0, sliceSize),
    [bufferDocs, sliceSize]
  );

  const visibleDocs = useMemo(
    () => (searchTerm ? clientDocs : serverDocs),
    [searchTerm, clientDocs, serverDocs]
  );

  useEffect(() => {
    setQueryInput("");
    setSearchTerm("");
    setBufferDocs([]);
    setSliceSize(PAGE_SIZE);
    setPages([]);
    setHasMoreServer(true);
  }, [meetingId]);

  useEffect(() => {
    if (!searchTerm) fetchFirstPage();
  }, [fetchFirstPage, searchTerm]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingRef.current) return;

        if (searchTerm) {
          const hasMore = clientDocs.length < bufferDocs.length;
          if (!hasMore) return;
          loadingRef.current = true;
          setTimeout(() => {
            setSliceSize((s) => s + PAGE_SIZE);
            loadingRef.current = false;
          }, 0);
          return;
        }

        if (hasMoreServer) fetchNextPage();
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [
    searchTerm,
    clientDocs.length,
    bufferDocs.length,
    hasMoreServer,
    fetchNextPage,
  ]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const gotoCreate = useCallback(() => {
    if (!canPost) {
      toast.info("게시글 작성은 멤버만 가능합니다.");
      return;
    }
    navigate(`/meeting/${meetingId}/board/new`);
  }, [navigate, meetingId, canPost]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div>
      <div className="card">
        <div
          className="flex"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h3 style={{ margin: 0 }}>게시판</h3>
          <div className="flex gap-2">
            <form className="flex gap-2" onSubmit={onSubmit}>
              <input
                className="input"
                placeholder="제목/내용/작성자 검색"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
              <button className="btn" type="submit">
                검색
              </button>
            </form>
            <button className="btn btn--primary" onClick={gotoCreate}>
              글쓰기
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        {loading && visibleDocs.length === 0 ? (
          <Spinner />
        ) : visibleDocs.length === 0 ? (
          <p className="muted">
            {searchTerm ? "검색 결과가 없습니다." : "게시글이 없습니다."}
          </p>
        ) : (
          <>
            <ul className="list">
              {visibleDocs.map((p) => (
                <li
                  key={p.id}
                  className="list-item"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(`/meeting/${meetingId}/board/${p.id}`)
                  }
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
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.title}
                    >
                      {p.title || "(제목 없음)"}
                    </strong>
                    <span className="muted" style={{ flexShrink: 0 }}>
                      {(p.authorName || "익명")} · {fmt(p.createdAt)}
                    </span>
                  </div>
                  {p.content && (
                    <p
                      className="mt-1"
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {p.content.length > 160
                        ? p.content.slice(0, 160) + "…"
                        : p.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <div ref={sentinelRef} style={{ height: 1 }} />

            <div style={{ textAlign: "center", marginTop: 8 }}>
              {loadingRef.current ||
              (searchTerm
                ? clientDocs.length < bufferDocs.length
                : hasMoreServer) ? (
                <Spinner size={24} stroke={3} />
              ) : (
                <span className="muted">끝까지 읽었습니다.</span>
              )}
            </div>
          </>
        )}
      </div>

      {showTop && (
        <button
          onClick={scrollToTop}
          className="btn btn--primary"
          style={{
            position: "fixed",
            right: 16,
            bottom: 24,
            zIndex: 50,
            borderRadius: 9999,
            padding: "10px 14px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
          }}
          aria-label="맨 위로"
          title="맨 위로"
        >
          ▲
        </button>
      )}
    </div>
  );
}
