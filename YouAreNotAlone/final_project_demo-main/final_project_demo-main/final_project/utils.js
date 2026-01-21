import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * Log user activity to Firestore
 * @param {string} userId - The user's UID
 * @param {string} action - The action performed (e.g., "Booked appointment", "Viewed resources")
 * @param {string|null} target - Optional details about what was affected
 * @param {string} userRole - The user's role (e.g., "survivor", "counselor", "admin")
 */
export async function logActivity(userId, action, target = null, userRole = "user") {
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action,
      target,
      userRole,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}
