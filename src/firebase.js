// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// .env.local 값을 우선 사용하고, 없으면 안전한 폴백 사용
const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyDa32OGymoIH0lH5rXD6075yl-ATiCgMgM",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    "testappofsmi.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "testappofsmi",
  // ✅ storageBucket은 공식 권장 형식: <projectId>.appspot.com
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "testappofsmi.appspot.com",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "401589004818",
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    "1:401589004818:web:294e079a4682dcf9b0c6cb",
  measurementId:
    process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-9G0M85V7WC",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
