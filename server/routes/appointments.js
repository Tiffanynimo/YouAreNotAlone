const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/appointments — filtered by role/user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { role, professionalType, userId, status } = req.query;
    let query = "SELECT * FROM appointments";
    const conditions = [];
    const values = [];
    let idx = 1;

    if (professionalType) {
      conditions.push(`professional_type = $${idx++}`);
      values.push(professionalType);
    }
    if (userId) {
      conditions.push(`survivor_id = $${idx++}`);
      values.push(userId);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY date ASC";

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// POST /api/appointments — create appointment
router.post("/", requireAuth, async (req, res) => {
  try {
    const { professionalType, date, reason, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO appointments (survivor_id, user_email, user_name, professional_type, date, reason, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [req.user.id, req.user.email, req.user.fullname || req.user.name, professionalType, date, reason, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// PUT /api/appointments/:id/approve — approve appointment (professional claims it)
router.put("/:id/approve", requireAuth, async (req, res) => {
  try {
    // Transaction-safe: only approve if not already assigned
    const { rows } = await pool.query(
      `UPDATE appointments
       SET status = 'scheduled', professional_id = $1, counselor_name = $2, approved_at = NOW()
       WHERE id = $3 AND (professional_id IS NULL)
       RETURNING *`,
      [req.user.id, req.user.fullname || req.user.name, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: "Already assigned or not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error approving appointment:", err);
    res.status(500).json({ error: "Failed to approve appointment" });
  }
});

// PUT /api/appointments/:id/decline — decline appointment
router.put("/:id/decline", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE appointments SET status = 'cancelled', declined_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error declining appointment:", err);
    res.status(500).json({ error: "Failed to decline appointment" });
  }
});

// PUT /api/appointments/:id/complete — mark appointment completed
router.put("/:id/complete", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE appointments SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error completing appointment:", err);
    res.status(500).json({ error: "Failed to complete appointment" });
  }
});

// PUT /api/appointments/:id/cancel — cancel appointment
router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE appointments SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

module.exports = router;
