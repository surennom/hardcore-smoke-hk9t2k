// src/components/SignUpPage.js
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";

function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName)
      return toast.info("모든 필드를 입력하세요.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      toast.success("회원가입 성공");
      navigate(from, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth">
      <h2>회원가입</h2>
      <form onSubmit={onSubmit} className="form">
        <label>닉네임</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label>이메일</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "회원가입 중..." : "회원가입"}
        </button>
      </form>
      <p>
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="login-link">
          로그인
        </Link>
      </p>
    </div>
  );
}

export default SignUpPage;
