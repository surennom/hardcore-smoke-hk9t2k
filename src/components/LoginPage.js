// src/components/LoginPage.js
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("로그인 성공");
      navigate(from, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("이메일 또는 비밀번호를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth">
      <h2>로그인</h2>
      <form onSubmit={onSubmit} className="form">
        <label>이메일</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p>
        계정이 없으신가요?{" "}
        <Link to="/signup" className="signup-link">
          회원가입
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
