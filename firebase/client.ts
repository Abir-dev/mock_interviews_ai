
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBew1r_Wk3BYK2S6O3uZgW2ZUuPRmSR_tg",
  authDomain: "prepwise-a2abe.firebaseapp.com",
  projectId: "prepwise-a2abe",
  storageBucket: "prepwise-a2abe.firebasestorage.app",
  messagingSenderId: "906536309317",
  appId: "1:906536309317:web:6c690f7940ba365385092c",
  measurementId: "G-SJPH8LW7J6"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) :getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);