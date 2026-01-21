import { db } from "../firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const form = document.getElementById("verifyForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const caseId = document.getElementById("caseId").value;
  const survivorId = document.getElementById("survivorId").value;

  try {
    // Assuming Firestore doc IDs are CASEID_SURVIVORID
    const docRef = doc(db, "verifications", caseId + "_" + survivorId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().used === false) {
      // Mark as used
      await updateDoc(docRef, { used: true });

      // Show success and redirect to login
      alert("Verification successful! You can now log in.");
      window.location.href = "../authorization/login.html";

    } else {
      alert("Invalid Case ID / Survivor ID or already verified.");
    }
  } catch (err) {
    console.error(err);
    alert("Error verifying. Try again.");
  }
});
