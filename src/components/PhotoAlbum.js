// src/components/PhotoAlbum.js
import React, { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import Spinner from "./Spinner";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PhotoUploader from "./PhotoUploader";
/**
 * PhotoAlbum
 * - Firestore 경로: meetings/{meetingId}/photos
 * - 문서 예시:
 *   {
 *     images: ["https://...", ...], // 최소 1장
 *     caption: "업로드 코멘트",
 *     authorId, authorName, createdAt
 *   }
 * - 목록: 첫 장만 보이고, 여러 장이면 뒤에 겹침 효과 + 우상단 +N 배지
 * - 클릭: 라이트박스 뷰(확대) + 하단에 캡션(인스타 느낌)
 */
export default function PhotoAlbum({ meetingId, clubId, onUploaded }) {
  const [items, setItems] = useState(null); // null = 로딩
  const [error, setError] = useState(null);

  // 라이트박스 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (!meetingId) return;
    const qref = query(
      collection(db, "meetings", meetingId, "photos"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qref,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(list);
        setError(null);
      },
      (err) => {
        if (process.env.NODE_ENV !== "production") console.error(err);
        setError("사진을 불러오지 못했습니다.");
        setItems([]);
      }
    );
    return () => unsub();
  }, [meetingId]);

  const openViewer = useCallback((item, startIndex = 0) => {
    setViewerItem(item);
    setViewerIndex(startIndex);
    setViewerOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerItem(null);
    setViewerIndex(0);
    document.body.style.overflow = "";
  }, []);

  const nextImg = useCallback(() => {
    if (!viewerItem?.images?.length) return;
    const len = viewerItem.images.length;
    setViewerIndex((i) => (i + 1) % len);
  }, [viewerItem]);

  const prevImg = useCallback(() => {
    if (!viewerItem?.images?.length) return;
    const len = viewerItem.images.length;
    setViewerIndex((i) => (i - 1 + len) % len);
  }, [viewerItem]);

  // 키보드 네비
  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight") nextImg();
      if (e.key === "ArrowLeft") prevImg();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, closeViewer, nextImg, prevImg]);

  // ===== 렌더 =====
  if (items === null) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>사진첩</h3>
      {/* 업로드 버튼: meetingId가 있을 때만 노출 */}
  {meetingId ? (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <PhotoUploader meetingId={meetingId} />
    </div>
  ) : null}

      {items.length === 0 ? (
        <p className="muted">업로드된 사진이 없습니다.</p>
      ) : (
        
        <div
          className="photo-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((it) => {
            const imgs = Array.isArray(it.images) ? it.images : [];
            const cover = imgs[0];
            const extraCount = Math.max(imgs.length - 1, 0);

            return (
              <button
                key={it.id}
                className="photo-card"
                onClick={() => openViewer(it, 0)}
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "100%", // 1:1 정사각
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f5f5f5",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                }}
                title={it.caption || ""}
                aria-label="사진 보기"
              >
                {/* 겹쳐 놓은 레이어 */}
                {extraCount > 0 && (
                  <>
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        transform: "translate(6px, 6px)",
                        borderRadius: 8,
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06))",
                      }}
                    />
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        transform: "translate(3px, 3px)",
                        borderRadius: 8,
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04))",
                      }}
                    />
                  </>
                )}

                {/* 표지 이미지 */}
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <div
                    className="muted"
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    이미지 없음
                  </div>
                )}

                {/* 장수 배지 */}
                {extraCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      right: 6,
                      top: 6,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 999,
                    }}
                  >
                    +{extraCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 라이트박스 */}
      {viewerOpen && viewerItem && (
        <div
          className="modal-overlay"
          onClick={closeViewer}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(960px, 96vw)",
              maxHeight: "90vh",
              background: "#111",
              borderRadius: 12,
              overflow: "hidden",
              color: "#fff",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            {/* 헤더 */}
            <div
              className="flex"
              style={{
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {viewerItem.authorName || "익명"} · {formatTime(viewerItem.createdAt)}
              </div>
              <button
                className="btn"
                onClick={closeViewer}
                style={{
                  color: "#fff",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
                aria-label="닫기"
                title="닫기"
              >
                <FaTimes />
              </button>
            </div>

            {/* 이미지 영역 */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
              }}
            >
              {Array.isArray(viewerItem.images) && viewerItem.images.length > 0 ? (
                <img
                  src={viewerItem.images[viewerIndex]}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div className="muted" style={{ padding: 16 }}>
                  이미지가 없습니다.
                </div>
              )}

              {/* 좌우 네비 */}
              {Array.isArray(viewerItem.images) && viewerItem.images.length > 1 && (
                <>
                  <button
                    className="btn"
                    onClick={prevImg}
                    style={navBtnStyle("left")}
                    aria-label="이전 이미지"
                    title="이전"
                  >
                    <FaChevronLeft />
                  </button>
                  <button
                    className="btn"
                    onClick={nextImg}
                    style={navBtnStyle("right")}
                    aria-label="다음 이미지"
                    title="다음"
                  >
                    <FaChevronRight />
                  </button>
                </>
              )}
            </div>

            {/* 캡션 */}
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {viewerItem.caption ? (
                <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {viewerItem.caption}
                </p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>설명이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: "absolute",
    [side]: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
  };
}

function formatTime(ts) {
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
}
