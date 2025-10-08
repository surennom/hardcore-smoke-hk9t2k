// src/components/CreateMeetingPage.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  getStorage,
  ref as sref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { FaChevronLeft } from "react-icons/fa";
import { TYPE } from "../constants/domain"; // 타입은 내부 고정값으로만 사용
import Spinner from "./Spinner";

const DEFAULT_COVER_URL = `${process.env.PUBLIC_URL || ""}/default-cover.png`; // public/default-cover.png
import { pickCoverClass } from "../utils/coverStyle";

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // 고정 타입: CLUB (UI 표시 없음)
  const [type] = useState(TYPE.CLUB);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  // locations.json 로드
  const [locations, setLocations] = useState([]);

  const [focusX, setFocusX] = useState(0.5); // 0~1 (좌→우)
  const [focusY, setFocusY] = useState(0.5); // 0~1 (상→하)

  // 이미지 파일/미리보기
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const previewRef = useRef("");

  // 도시 목록
  const cities = useMemo(() => {
    const item = locations.find((r) => r.region === region);
    return item ? item.cities : [];
  }, [region, locations]);

  useEffect(() => {
    setCity("");
  }, [region]);

  // locations.json 로드 (안정화: Abort + JSON 파싱 방어)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const baseURL = process.env.PUBLIC_URL || "";
        const res = await fetch(`${baseURL}/locations.json`, {
          cache: "no-cache",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("failed");
        const text = await res.text();
        const data = JSON.parse(text);
        setLocations(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "AbortError") return;
        setLocations([]);
        if (process.env.NODE_ENV !== "production")
          console.warn("locations.json 로드 실패:", e);
      }
    })();
    return () => ac.abort();
  }, []);

  // 파일 선택시 미리보기 URL 관리 (누수 방지)
  useEffect(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    }
    if (file) {
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      setPreviewURL(url);
    } else {
      setPreviewURL("");
    }
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = "";
      }
    };
  }, [file]);

  // 검증
  const validate = () => {
    if (!currentUser) {
      toast.error("로그인이 필요합니다.");
      return false;
    }
    if (!title.trim()) {
      toast.error("모임 이름을 입력해 주세요.");
      return false;
    }
    if (!region) {
      toast.error("지역을 선택해 주세요.");
      return false;
    }
    if (!city) {
      toast.error("도시를 선택해 주세요.");
      return false;
    }
    return true;
  };

  // 저장 처리
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    let coverURL = DEFAULT_COVER_URL; // 기본 커버
    // 이미지가 있으면 업로드
    if (file) {
      try {
        const storage = getStorage();
        const key = `meeting_covers/${currentUser.uid}/${Date.now()}_${
          file.name
        }`;
        const ref = sref(storage, key);
        const snap = await uploadBytes(ref, file);
        coverURL = await getDownloadURL(snap.ref);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("image upload error:", err);
        }
        toast.error("이미지 업로드에 실패했습니다.");
        return; // 업로드 실패 시 저장 중단
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        type, // CLUB 고정
        region,
        city,
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        coverImage: coverURL, // 기본 또는 업로드 결과
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "meetings"), payload);
      toast.success("모임이 생성되었습니다.");
      navigate("/");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("addDoc error:", error);
      }
      toast.error("생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => navigate(-1);

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="card">
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={goBack}>
            <FaChevronLeft />
            뒤로
          </button>
          <h1>모임 만들기</h1>
        </div>
        <p className="muted mt-2">모임 정보를 입력해 주세요.</p>
      </div>

      {/* 폼 */}
      <form className="card mt-3" onSubmit={handleSubmit}>
        {/* 종류 선택 제거 (CLUB 고정) */}

        {/* 기본 정보 */}
        <div className="form-row">
          <div>
            <label>이름</label>
            <input
              className="input"
              placeholder="모임 이름"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>
        </div>

        <div className="form-row mt-2">
          <div>
            <label>설명</label>
            <textarea
              rows={5}
              className="input"
              placeholder="어떤 모임인지 소개해 주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        {/* 지역 / 도시 */}
        <div className="form-row form-row--2 mt-3">
          <div>
            <label>지역</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">지역 선택</option>
              {locations.map((r) => (
                <option key={r.region} value={r.region}>
                  {r.region}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>도시</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!region}
            >
              <option value="">
                {region ? "도시 선택" : "지역을 먼저 선택"}
              </option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 대표 이미지 업로드 (선택) */}
        <div className="mt-3">
          <label>대표 이미지 (선택)</label>
          <div className="flex gap-2 mt-2">
            <input
              id="cover-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f || null);
                resetUpload();
              }}
              disabled={submitting || uploading}
            />
            {file ? (
              <span className="muted">
                선택됨: {file.name} ({Math.round((file.size || 0) / 1024)} KB)
              </span>
            ) : (
              <span className="muted">
                선택된 파일 없음 · 기본 이미지가 적용됩니다
              </span>
            )}
          </div>

          {/* 리스트 썸네일 느낌의 미리보기 (가로형, 크롭) */}
          <div className="mt-2">
            <div
              className="meeting-avatar-large card"
              style={{ padding: 0, position: "relative" }}
            >
              {previewURL ? (
                <img
                  src={previewURL}
                  alt="썸네일 미리보기"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `${Math.round(focusX * 100)}% ${Math.round(
                      focusY * 100
                    )}%`,
                    cursor: "crosshair",
                  }}
                  onClick={(e) => {
                    // 컨테이너 기준 클릭 좌표를 0~1로 환산
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    setFocusX(Math.min(1, Math.max(0, x)));
                    setFocusY(Math.min(1, Math.max(0, y)));
                  }}
                  title="이미지에서 보여줄 중심을 클릭해 주세요"
                />
              ) : (
                <div
                  className={`${pickCoverClass(
                    `${title}|${region}|${city}`
                  )} fill`}
                />
              )}

              {/* 가이드 점(선택 사항) */}
              {previewURL && (
                <div
                  style={{
                    position: "absolute",
                    left: `${focusX * 100}%`,
                    top: `${focusY * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.9)",
                    boxShadow: "0 0 0 2px rgba(0,0,0,0.25)",
                    pointerEvents: "none",
                  }}
                  aria-hidden
                />
              )}
            </div>

            <div className="muted mt-1">리스트 썸네일 미리보기</div>
          </div>
        </div>

        {/* 액션 */}
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || uploading}
            aria-busy={submitting ? "true" : "false"}
          >
            {submitting ? (
              <>
                등록 중…
                <Spinner
                  size={16}
                  stroke={2}
                  style={{ marginLeft: 6, verticalAlign: "middle" }}
                />
              </>
            ) : (
              "등록"
            )}
          </button>
          <button
            type="button"
            className="btn"
            onClick={goBack}
            disabled={submitting}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
