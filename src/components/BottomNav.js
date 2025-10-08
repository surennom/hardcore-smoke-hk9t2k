// src/components/BottomNav.js

import React from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaUser, FaList } from "react-icons/fa";

const BottomNav = () => {
  return (
    <div className="bottom-nav">
      <Link to="/" className="nav-item">
        <FaList />
        <span>내 모임</span>
      </Link>
      <Link to="/search" className="nav-item">
        <FaSearch />
        <span>모임 찾기</span>
      </Link>
      <Link to="/profile" className="nav-item">
        <FaUser />
        <span>프로필</span>
      </Link>
    </div>
  );
};

export default BottomNav;
