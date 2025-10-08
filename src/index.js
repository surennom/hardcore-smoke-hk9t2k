// src/index.js

// DEV-ONLY: Babel의 거대 파일 경고 메시지 필터링
if (process.env.NODE_ENV !== "production") {
  const _warn = console.warn;
  console.warn = (...args) => {
    const msg = args?.[0];
    if (
      typeof msg === "string" &&
      msg.includes(
        "BABEL] Note: The code generator has deoptimised the styling"
      )
    ) {
      return; // 해당 경고만 무시
    }
    _warn?.(...args);
  };
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles/total.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// === Dev runtime error tracing (promise/async errors) ===
if (process.env.NODE_ENV !== "production") {
  window.addEventListener("error", (e) => {
    console.groupCollapsed("[GlobalError]", e.message);
    console.log(e.error?.stack || e.error || e);
    console.groupEnd();
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.groupCollapsed(
      "[UnhandledRejection]",
      e.reason?.message || e.reason
    );
    console.log(e.reason?.stack || e.reason);
    console.groupEnd();
  });
}

// === React DevTools 훅이 없는 환경에서 벤더 코드가 .renderers를 읽어 터지는 문제 가드 ===
if (typeof window !== "undefined" && !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject() {},
    onCommitFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
  };
}

/*
// ⬇⬇⬇ 여기서부터 추가 (주석 유지)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed:", err));
  });
}
*/
