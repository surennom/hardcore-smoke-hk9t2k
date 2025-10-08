// src/App.js
import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import useProfile from "./hooks/useProfile";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

import MeetingBoardNewPost from "./components/MeetingBoardNewPost";
import MeetingBoardPost from "./components/MeetingBoardPost";

// 페이지 Lazy 로드
const MyMeetings = lazy(() => import("./components/MyMeetings"));
const SearchPage = lazy(() => import("./components/SearchPage"));
const CreateMeetingPage = lazy(() => import("./components/CreateMeetingPage"));
const MeetingPage = lazy(() => import("./components/MeetingPage"));
const ProfileView = lazy(() => import("./components/ProfileView"));
const ProfileEdit = lazy(() => import("./components/ProfileEdit"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const SignUpPage = lazy(() => import("./components/SignUpPage"));

function App() {
  const { currentUser: user, loading } = useAuth();
  const { userProfile, profileLoading } = useProfile(user);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("signOut error:", e);
      }
    }
  };

  return (
    <div className="app-root">
      <ToastContainer position="top-center" />
      <div className="app-container">
        <ErrorBoundary>
          <Suspense fallback={<div className="loading-fallback">로딩 중…</div>}>
            <Routes>
              {/* 비보호 라우트 */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />

              {/* 보호 라우트 */}
              <Route
                path="/"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <MyMeetings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/search"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <SearchPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/create-meeting"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <CreateMeetingPage />
                  </ProtectedRoute>
                }
              />

              {/* ✅ 프로필 보기 */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <ProfileView
                      user={user}
                      userProfile={userProfile}
                      handleLogout={handleLogout}
                    />
                  </ProtectedRoute>
                }
              />

              {/* 프로필 수정 (있다면 사용) */}
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <ProfileEdit />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meeting/:id"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <MeetingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meeting/:id/board/new"
                element={<MeetingBoardNewPost />}
              />

              <Route
                path="/meeting/:id/board/:postId"
                element={<MeetingBoardPost />}
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* 로그인 상태에서만 하단 네비 표시 */}
      {user && <BottomNav />}
    </div>
  );
}

export default App;
