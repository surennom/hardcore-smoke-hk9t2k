// src/components/ProfileEdit.js

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import Spinner from "./Spinner";

// ✅ /interests.json을 fetch하여 사용
const ProfileEdit = ({ user, onUpdateProfile, userProfile }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  if (!user) {
    return (
      <div className="loading-container">사용자 정보를 불러오는 중...</div>
    );
  }

  // 프로필 문서 로딩 중(유저는 있으나 userProfile 세팅 전)
  if (!userProfile) {
    return (
      <div className="page">
        <div className="profile-card" style={{ textAlign: "center" }}>
          <Spinner />
        </div>
      </div>
    );
  }

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || user?.displayName || ""
  );
  const [birthdate, setBirthdate] = useState(userProfile?.birthdate || "");
  const [gender, setGender] = useState(userProfile?.gender || "");
  const [location, setLocation] = useState(userProfile?.location || "");
  const [selectedInterests, setSelectedInterests] = useState(
    userProfile?.interests || []
  );

  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  // ✅ 관심사(카테고리형) 로컬 상태 + 로딩 상태
  const [availableInterests, setAvailableInterests] = useState([]); // [{category, items:[]}, ...]
  const [interestsLoading, setInterestsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [temporarySelectedInterests, setTemporarySelectedInterests] = useState(
    []
  );

  // userProfile 동기화
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || "");
      setBirthdate(userProfile.birthdate || "");
      setGender(userProfile.gender || "");
      setLocation(userProfile.location || "");
      setSelectedInterests(userProfile?.interests || []);
    }
  }, [userProfile, user]);

  // ✅ /interests.json 로드
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const baseURL = process.env.PUBLIC_URL || "";
        const res = await fetch(`${baseURL}/interests.json`, {
          cache: "no-cache",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("failed");
        const text = await res.text();
        const data = JSON.parse(text);
        setAvailableInterests(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "AbortError") return;
        setAvailableInterests([]);
        if (process.env.NODE_ENV !== "production")
          console.warn("interests.json 로드 실패:", e);
      } finally {
        setInterestsLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // 모달 필터링: 카테고리 내 items만 검색
  const filteredCategories = (availableInterests || [])
    .map((category) => ({
      ...category,
      items: (category.items || []).filter((interest) =>
        String(interest).toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((category) => (category.items || []).length > 0);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleProfileUpdate = async () => {
    const updates = {
      displayName: displayName,
      birthdate: birthdate,
      gender: gender,
      location: location,
      interests: selectedInterests,
    };
    try {
      setSaving(true);
      await onUpdateProfile(updates, imageFile);
      navigate("/profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterests = () => {
    setTemporarySelectedInterests([...(selectedInterests || [])]);
    setIsModalOpen(true);
  };

  const handleInterestSelectInModal = (interest) => {
    setTemporarySelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleConfirm = () => {
    setSelectedInterests(temporarySelectedInterests);
    setIsModalOpen(false);
  };

  return (
    <React.Fragment>
      <div className="page">
        <div className="profile-header">
          <button className="back-button-icon" onClick={() => navigate(-1)}>
            <FaChevronLeft size={20} />
          </button>
          <h2>프로필 수정</h2>
        </div>

        <div className="profile-card">
          <div className="profile-image-section">
            <div
              className="profile-image-preview"
              onClick={() => fileInputRef.current?.click()}
            >
              {imageFile ? (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="프로필 미리보기"
                  className="profile-preview-image"
                />
              ) : user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="프로필 사진"
                  className="profile-preview-image"
                />
              ) : (
                <div className="profile-placeholder-image">
                  <span>사진 없음</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
              accept="image/*"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>닉네임</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>생년월일</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>성별</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={saving}
            >
              <option value="">선택 안 함</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          <div className="form-group">
            <label>지역</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울 강남구"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>관심사</label>
            <div className="interest-tags">
              {selectedInterests.map((interest, index) => (
                <span key={index} className="tag">
                  {interest}
                </span>
              ))}
              <button
                className="add-interest-button"
                onClick={handleAddInterests}
                disabled={saving || interestsLoading}
                title={
                  interestsLoading
                    ? "관심사 목록을 불러오는 중..."
                    : "관심사 추가"
                }
              >
                {interestsLoading ? <Spinner size={14} stroke={2} /> : "+"}
              </button>
            </div>
            {interestsLoading && (
              <div className="muted mt-2">관심사 목록을 불러오는 중…</div>
            )}
          </div>

          <button
            className="save-button"
            onClick={handleProfileUpdate}
            disabled={saving}
            aria-busy={saving ? "true" : "false"}
          >
            {saving ? (
              <>
                저장 중…
                <Spinner
                  size={16}
                  stroke={2}
                  style={{ marginLeft: 8, verticalAlign: "middle" }}
                />
              </>
            ) : (
              "저장"
            )}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>관심사 선택</h3>
              <button
                className="modal-close-button"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-content">
              <input
                type="text"
                placeholder="관심사 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />

              <div className="interest-list">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div key={category.category}>
                      <h4>{category.category}</h4>
                      <div className="category-tags">
                        {category.items.map((interest) => (
                          <button
                            key={interest}
                            className={`interest-tag-button ${
                              temporarySelectedInterests.includes(interest)
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleInterestSelectInModal(interest)
                            }
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>검색 결과가 없습니다.</p>
                )}
              </div>
            </div>

            <button
              className="confirm-button"
              onClick={handleConfirm}
              disabled={saving}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default ProfileEdit;
