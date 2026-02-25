const express = require("express");
const router = express.Router();
const pool = require("../db");

// POST /api/verifications/verify — verify a case
router.post("/verify", async (req, res) => {
  try {
    const { caseId, survivorId } = req.body;
    const docId = caseId + "_" + survivorId;

    const { rows } = await pool.query(
      "SELECT * FROM case_verifications WHERE id = $1",
      [docId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Invalid Case ID / Survivor ID" });
    }

    if (rows[0].used) {
      return res.status(400).json({ error: "Already verified" });
    }

    await pool.query(
      "UPDATE case_verifications SET used = TRUE WHERE id = $1",
      [docId]
    );

    res.json({ message: "Verification successful" });
  } catch (err) {
    console.error("Error verifying:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
