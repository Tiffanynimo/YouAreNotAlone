const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/notifications — get notifications for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications — create a notification
router.post("/", requireAuth, async (req, res) => {
  try {
    const { userId, appointmentId, message, type } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, appointment_id, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, appointmentId || null, message, type || "appointment"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// PUT /api/notifications/:id/read — mark notification as read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read = TRUE WHERE id = $1", [req.params.id]);
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

module.exports = router;
