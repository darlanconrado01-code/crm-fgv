
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
  authDomain: "crm-fgv-3868c.firebaseapp.com",
  projectId: "crm-fgv-3868c",
  storageBucket: "crm-fgv-3868c.firebasestorage.app",
  messagingSenderId: "501480125467",
  appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be",
  measurementId: "G-6E0EP3FRKE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not supported or blocked:", e);
  }
}
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
