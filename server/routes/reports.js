const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/reports — get all reports (admin) or user's reports
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    let query, values;
    if (userId) {
      query = "SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC";
      values = [userId];
    } else {
      query = "SELECT * FROM reports ORDER BY created_at DESC";
      values = [];
    }
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// POST /api/reports — submit a report
router.post("/", requireAuth, async (req, res) => {
  try {
    const { type, description, fileUrl } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO reports (user_id, survivor_id, user_email, user_name, type, description, file_url)
       VALUES ($1, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, req.user.email, req.user.fullname || req.user.name, type, description, fileUrl || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

// PUT /api/reports/:id — update report status
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query("UPDATE reports SET status = $1 WHERE id = $2", [status, req.params.id]);
    res.json({ message: "Report updated" });
  } catch (err) {
    console.error("Error updating report:", err);
    res.status(500).json({ error: "Failed to update report" });
  }
});

module.exports = router;
