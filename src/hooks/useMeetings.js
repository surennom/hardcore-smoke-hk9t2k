// src/hooks/useMeetings.js
import { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const PAGE_SIZE = 20;

const useMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  // 첫 페이지는 실시간 구독
  useEffect(() => {
    const q = query(
      collection(db, "meetings"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setMeetings(arr);
        setMeetingsLoading(false);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMore(!!lastDocRef.current);
      },
      (err) => {
        setMeetingsError(err);
        setMeetingsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 이후 페이지는 일회성 호출
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "meetings"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
      } else {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setMeetings((prev) => [...prev, ...arr]);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMore(!!lastDocRef.current);
      }
    } catch (e) {
      setMeetingsError(e);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  return {
    meetings,
    meetingsLoading,
    meetingsError,
    loadMore,
    loadingMore,
    hasMore,
  };
};

export default useMeetings;
