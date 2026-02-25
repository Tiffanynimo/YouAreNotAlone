const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/flagged-messages — get all flagged messages (admin)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM flagged_messages ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching flagged messages:", err);
    res.status(500).json({ error: "Failed to fetch flagged messages" });
  }
});

// DELETE /api/flagged-messages/:id — remove a flagged message
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM flagged_messages WHERE id = $1", [req.params.id]);
    res.json({ message: "Flagged message removed" });
  } catch (err) {
    console.error("Error removing flagged message:", err);
    res.status(500).json({ error: "Failed to remove flagged message" });
  }
});

module.exports = router;
