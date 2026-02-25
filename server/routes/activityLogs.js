const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// POST /api/activity-logs — log an activity
router.post("/", requireAuth, async (req, res) => {
  try {
    const { action, target, userRole } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO activity_logs (user_id, action, target, user_role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, action, target || null, userRole || req.user.role || "user"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error logging activity:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

// GET /api/activity-logs — get activity logs (admin)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

module.exports = router;
