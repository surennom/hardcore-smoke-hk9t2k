// src/hooks/useProfile.js

import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { db } from "../firebase";
import { toast } from "react-toastify";

const COLLECTION = "userProfiles"; // 기존 컬렉션명 유지

const useProfile = (user) => {
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const storage = getStorage();

  useEffect(() => {
    // 로그아웃 상태
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    let unsub;
    const run = async () => {
      setProfileLoading(true);
      const docRef = doc(db, COLLECTION, user.uid);

      // ✅ 문서가 없으면 기본 문서를 자동 생성 (신규 계정 대비)
      try {
        const firstSnap = await getDoc(docRef);
        if (!firstSnap.exists()) {
          await setDoc(docRef, {
            displayName: user.displayName || "",
            birthdate: "",
            gender: "미설정",
            interests: [],
            photoURL: user.photoURL || "",
            location: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("ensure default profile error:", err);
        }
        // 기본 문서 생성 실패해도 아래 onSnapshot으로 로딩은 해제되도록 계속 진행
      }

      // ✅ 실시간 구독: 이후 변경 즉시 반영
      unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            setUserProfile({ id: snap.id, ...snap.data() });
          } else {
            // 드물지만 권한/삭제 등으로 없어질 수 있음 → null로 표시
            setUserProfile(null);
          }
          setProfileLoading(false);
        },
        (error) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("profile onSnapshot error:", error);
          }
          toast.error("프로필을 불러오는 중 오류가 발생했습니다.");
          setProfileLoading(false);
        }
      );
    };

    run();

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [user]);

  const handleUpdateProfile = async (updates, imageFile) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      let photoURL = user.photoURL || userProfile?.photoURL || "";

      if (imageFile) {
        const storageRef = ref(
          storage,
          `profile_images/${user.uid}/avatar_${Date.now()}`
        );
        const snap = await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(snap.ref);
      }

      // 1) Firebase Auth 프로필 업데이트 (원본 유지)
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL,
      });

      // 2) Firestore 업데이트 (원본 유지 + updatedAt 추가)
      const docRef = doc(db, COLLECTION, user.uid);
      const payload = {
        displayName: updates.displayName,
        birthdate: updates.birthdate,
        gender: updates.gender,
        interests: updates.interests,
        photoURL,
        location: updates.location,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, payload);

      // 즉시 UI 반응(실시간 구독 전이라도)
      setUserProfile((prev) => ({
        ...(prev || {}),
        ...payload,
      }));

      toast.success("프로필이 성공적으로 업데이트되었습니다!");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error updating profile:", error);
      }
      toast.error("프로필 업데이트에 실패했습니다.");
    }
  };

  return { userProfile, profileLoading, handleUpdateProfile };
};

export default useProfile;
