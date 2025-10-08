// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import Spinner from "./Spinner";

function ProtectedRoute({ user, children, loading }) {
  // ✅ 아직 로딩 중일 때 스피너 표시
  if (loading) {
    return <Spinner />;
  }

  // ✅ 로그인 안 한 경우
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ 로그인 된 경우
  return children;
}

ProtectedRoute.propTypes = {
  user: PropTypes.object,
  children: PropTypes.node.isRequired,
  loading: PropTypes.bool,
};

export default ProtectedRoute;
