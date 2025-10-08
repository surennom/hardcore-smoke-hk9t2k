// src/components/PhotoUploader.js
import React, { useMemo, useRef, useState } from "react";
import { auth, db, storage } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

/**
 * PhotoUploader
 * props:
 *  - meetingId (string, required)
 * 동작:
 *  - Storage: photos/meetings/{meetingId}/{uid}/{timestamp-filename}
 *  - Firestore: meetings/{meetingId}/photos 에 {url, fileName, uid, createdAt}
 */
export default function PhotoUploader({ meetingId }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const user = useMemo(() => auth.currentUser || null, []);

  const openPicker = () => {
    if (!meetingId) return alert("meetingId가 필요합니다.");
    if (!user) return alert("로그인이 필요합니다.");
    inputRef.current?.click();
  };

  const handleFiles = async (files) => {
    if (!files?.length || !meetingId || !user) return;
    for (const file of files) await uploadOne(file);
  };

  const uploadOne = async (file) => {
    if (!file.type.startsWith("image/")) return alert("이미지 파일만 업로드할 수 있습니다.");
    if (file.size > 10 * 1024 * 1024) return alert("최대 10MB까지 업로드할 수 있습니다.");

    setBusy(true); setProgress(0);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}-${safeName}`;
    const storagePath = `photos/meetings/${meetingId}/${user.uid}/${key}`;

    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, file, {
      cacheControl: "public, max-age=31536000",
      contentType: file.type,
    });

    return new Promise((resolve) => {
      task.on(
        "state_changed",
        (snap) => {
          const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          setProgress(pct);
        },
        (err) => {
          console.error("upload error:", err);
          alert("업로드 중 오류가 발생했습니다.");
          setBusy(false); setProgress(0); resolve(null);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            const colRef = collection(db, "meetings", meetingId, "photos");
            await addDoc(colRef, {
              url,
              fileName: safeName,
              uid: user.uid,
              createdAt: serverTimestamp(),
            });
          } catch (e) {
            console.error("firestore record error:", e);
            alert("업로드 기록 저장 중 오류가 발생했습니다.");
          } finally {
            setBusy(false); setProgress(0); resolve(true);
          }
        }
      );
    });
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #d0d7de",
          background: busy ? "#f3f4f6" : "#fff",
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: 14,
        }}
      >
        {busy ? "업로드 중..." : "사진 업로드"}
      </button>

      {busy && (
        <div aria-label="progress" style={{
          height: 6, width: 120, background: "#f2f3f5",
          borderRadius: 999, overflow: "hidden"
        }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "#3b82f6", transition: "width 120ms linear"
          }}/>
        </div>
      )}
    </div>
  );
}
