const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// POST /api/crypto/public-key — store caller's public key
router.post("/public-key", requireAuth, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ error: "publicKey is required" });

    await pool.query(
      `INSERT INTO user_public_keys (user_id, public_key)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET public_key = $2, created_at = NOW()`,
      [req.user.id, publicKey]
    );
    res.json({ message: "Public key stored" });
  } catch (err) {
    console.error("Error storing public key:", err);
    res.status(500).json({ error: "Failed to store public key" });
  }
});

// GET /api/crypto/public-key/:id — get any user's public key
router.get("/public-key/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT public_key FROM user_public_keys WHERE user_id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Public key not found" });
    res.json({ publicKey: rows[0].public_key });
  } catch (err) {
    console.error("Error fetching public key:", err);
    res.status(500).json({ error: "Failed to fetch public key" });
  }
});

module.exports = router;
