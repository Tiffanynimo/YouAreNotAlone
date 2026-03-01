const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/peer-chat/public — last 50 public messages (no auth required)
router.get("/public", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM peer_chat_messages
       WHERE type = 'public'
       ORDER BY created_at DESC LIMIT 50`
    );
    res.json(rows.reverse()); // oldest first
  } catch (err) {
    console.error("Error fetching public peer chat:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// GET /api/peer-chat/private?me=nick&with=nick — DM history between two nicknames
router.get("/private", async (req, res) => {
  try {
    const { me, with: other } = req.query;
    if (!me || !other) return res.json([]);

    const { rows } = await pool.query(
      `SELECT * FROM peer_chat_messages
       WHERE type = 'private'
         AND ((sender_nickname = $1 AND recipient_nickname = $2)
           OR (sender_nickname = $2 AND recipient_nickname = $1))
       ORDER BY created_at ASC LIMIT 100`,
      [me, other]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching private peer chat:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
