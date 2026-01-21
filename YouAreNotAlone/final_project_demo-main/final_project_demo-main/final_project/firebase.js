// Import Firebase core SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

// Firebase Authentication
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firestore Database
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAE8Q1weR2L39KFeEwFXRA-XMAd-0r5vE",
  authDomain: "youarenotalone-77f91.firebaseapp.com",
  projectId: "youarenotalone-77f91",
  storageBucket: "youarenotalone-77f91.appspot.com", // <- use correct format
  messagingSenderId: "547838609220",
  appId: "1:547838609220:web:9d1fa07ed191eef928b911",
  measurementId: "G-D97TW5BCWK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // <- ADD THIS
