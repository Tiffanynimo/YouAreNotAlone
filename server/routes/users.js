const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/users — list all users (for chat user selection, admin)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, phone, fullname, bio, status FROM \"user\""
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id — get single user profile
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, phone, fullname, bio, status FROM \"user\" WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/users/:id — update user profile
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { fullname, phone, bio, role, status } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (fullname !== undefined) { updates.push(`fullname = $${idx++}`); values.push(fullname); updates.push(`name = $${idx++}`); values.push(fullname); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }

    if (updates.length === 0) return res.json({ message: "Nothing to update" });

    updates.push(`"updatedAt" = NOW()`);
    values.push(req.params.id);

    const query = `UPDATE "user" SET ${updates.join(", ")} WHERE id = $${idx}`;
    await pool.query(query, values);
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM "user" WHERE id = $1', [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
