// src/hooks/useImageUpload.js
import { useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { processImage } from "../utils/imageProcessor";

export default function useImageUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file, options = {}, pathBuilder) => {
    if (!file) throw new Error("NO_FILE");
    setUploading(true);
    setProgress(0);

    // 1) 브라우저 내 리사이즈/압축
    const processed = await processImage(file, options);

    // 2) 업로드 경로 결정
    const ext = mimeToExt(processed.mimeType);
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = typeof pathBuilder === "function"
      ? pathBuilder(fileName, processed)
      : `uploads/${fileName}`;

    // 3) 업로드
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, processed.blob, { contentType: processed.mimeType });

    const url = await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          if (snap.totalBytes) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          }
        },
        (err) => reject(err),
        async () => {
          const dl = await getDownloadURL(task.snapshot.ref);
          resolve(dl);
        }
      );
    });

    setUploading(false);
    return {
      url,
      path,
      meta: {
        originalSize: processed.originalSize,
        outputSize: processed.outputSize,
        width: processed.outputWidth,
        height: processed.outputHeight,
        mimeType: processed.mimeType,
        resized: processed.resized,
        converted: processed.converted,
      },
    };
  }, []);

  return { upload, uploading, progress, setProgress };
}

function mimeToExt(mime) {
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "bin";
}
