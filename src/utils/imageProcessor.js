// src/utils/imageProcessor.js
// 브라우저 내에서 이미지 파일을 리사이즈/압축해서 Blob으로 반환
// - 기본: 1280px 최대 변, JPEG 0.8 품질
// - WebP 지원 시 JPEG와 WebP 중 더 작은 쪽 선택
// - 원본이 더 작으면 그대로 반환(불필요한 재인코딩 방지)

const DEFAULTS = {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.8,
    preferMimeTypes: ["image/webp", "image/jpeg"], // 지원/용량 따라 자동 선택
  };
  
  export async function processImage(file, options = {}) {
    if (!file || !file.type?.startsWith("image/")) {
      throw new Error("IMAGE_ONLY");
    }
    const cfg = { ...DEFAULTS, ...options };
  
    // 이미지 디코딩 (EXIF 회전은 createImageBitmap 옵션으로 최대한 반영)
    const { image, width, height } = await decodeImage(file);
  
    // 목표 크기 계산 (비율 유지)
    const { tw, th, resized } = getTargetSize(width, height, cfg.maxWidth, cfg.maxHeight);
  
    // 리사이즈가 필요 없고, 용량도 크지 않다면 원본 반환
    if (!resized && file.size <= 500 * 1024) {
      return {
        blob: file,
        mimeType: file.type,
        width,
        height,
        outputWidth: width,
        outputHeight: height,
        originalSize: file.size,
        outputSize: file.size,
        resized: false,
        converted: false,
      };
    }
  
    // 캔버스에 그리기
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, tw, th);
  
    // 포맷 선택: webp/jpeg 중 더 작은 걸 고름
    const candidates = [];
    for (const mt of cfg.preferMimeTypes) {
      const blob = await canvasToBlob(canvas, mt, cfg.quality);
      if (blob) candidates.push({ mimeType: mt, blob });
    }
    // 후보 없으면 png로라도
    if (candidates.length === 0) {
      const fallback = await canvasToBlob(canvas, "image/png", 0.92);
      if (fallback) candidates.push({ mimeType: "image/png", blob: fallback });
    }
    if (candidates.length === 0) throw new Error("EXPORT_FAILED");
  
    // 원본과 비교해서 가장 작은 것 선택
    const best = candidates.reduce((a, b) => (b.blob.size < a.blob.size ? b : a));
    const chooseOriginal = !resized && file.size < best.blob.size; // 리사이즈 안 했는데 원본이 더 작으면 원본
  
    const outBlob = chooseOriginal ? file : best.blob;
    const outMime = chooseOriginal ? file.type : best.mimeType;
  
    return {
      blob: outBlob,
      mimeType: outMime,
      width,
      height,
      outputWidth: chooseOriginal ? width : tw,
      outputHeight: chooseOriginal ? height : th,
      originalSize: file.size,
      outputSize: outBlob.size,
      resized: resized && !chooseOriginal,
      converted: !chooseOriginal && outMime !== file.type,
    };
  }
  
  function getTargetSize(w, h, maxW, maxH) {
    if (w <= maxW && h <= maxH) return { tw: w, th: h, resized: false };
    const ratio = Math.min(maxW / w, maxH / h);
    return { tw: Math.round(w * ratio), th: Math.round(h * ratio), resized: true };
  }
  
  async function decodeImage(file) {
    // createImageBitmap가 있으면 EXIF 회전 반영 옵션 사용 (지원 브라우저에서)
    try {
      if (window.createImageBitmap) {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        return { image: bmp, width: bmp.width, height: bmp.height };
      }
    } catch {
      // fallback below
    }
    // fallback: HTMLImageElement
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  }
  
  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }
  
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }
  
  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((res) => {
      if (!canvas.toBlob) {
        // 구형 브라우저 대응
        const dataURL = canvas.toDataURL(mimeType, quality);
        const blob = dataURLToBlob(dataURL);
        res(blob);
        return;
      }
      canvas.toBlob((blob) => res(blob), mimeType, quality);
    });
  }
  
  function dataURLToBlob(dataURL) {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }
  