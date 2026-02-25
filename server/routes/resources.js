const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/resources — get all resources
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM resources ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// POST /api/resources — add a resource (admin)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, fileUrl } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO resources (title, file_url, uploaded_by, uploaded_by_email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, fileUrl, req.user.id, req.user.email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating resource:", err);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

// PUT /api/resources/:id — update a resource
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    await pool.query("UPDATE resources SET title = $1 WHERE id = $2", [title, req.params.id]);
    res.json({ message: "Resource updated" });
  } catch (err) {
    console.error("Error updating resource:", err);
    res.status(500).json({ error: "Failed to update resource" });
  }
});

// DELETE /api/resources/:id — delete a resource
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM resources WHERE id = $1", [req.params.id]);
    res.json({ message: "Resource deleted" });
  } catch (err) {
    console.error("Error deleting resource:", err);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

module.exports = router;
