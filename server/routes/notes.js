const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/notes — get notes for current therapist
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notes WHERE therapist_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /api/notes — create a note
router.post("/", requireAuth, async (req, res) => {
  try {
    const { patientName, noteText } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO notes (therapist_id, patient_name, note_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, patientName, noteText]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating note:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// PUT /api/notes/:id — update a note
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { noteText } = req.body;
    await pool.query(
      "UPDATE notes SET note_text = $1, updated_at = NOW() WHERE id = $2",
      [noteText, req.params.id]
    );
    res.json({ message: "Note updated" });
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// DELETE /api/notes/:id — delete a note
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM notes WHERE id = $1", [req.params.id]);
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
