const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// GET /api/chat/rooms — get all chat rooms for current user
router.get("/rooms", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM chat_rooms WHERE $1 = ANY(participant_ids) ORDER BY last_message_time DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
});

// POST /api/chat/rooms — create or get existing chat room
router.post("/rooms", requireAuth, async (req, res) => {
  try {
    const { recipientId, recipientName } = req.body;
    const participantIds = [req.user.id, recipientId].sort();
    const chatRoomId = participantIds.join("_");

    // Check if room exists
    const existing = await pool.query("SELECT * FROM chat_rooms WHERE id = $1", [chatRoomId]);
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    const participants = {};
    participants[req.user.id] = `${req.user.fullname || req.user.name || req.user.email} (${req.user.role || "user"})`;
    participants[recipientId] = recipientName;

    const { rows } = await pool.query(
      `INSERT INTO chat_rooms (id, participants, participant_ids, last_message, last_message_time)
       VALUES ($1, $2, $3, '', NOW())
       RETURNING *`,
      [chatRoomId, JSON.stringify(participants), participantIds]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating chat room:", err);
    res.status(500).json({ error: "Failed to create chat room" });
  }
});

// GET /api/chat/rooms/:id/messages — get messages for a chat room
router.get("/rooms/:id/messages", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM messages WHERE chat_room_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/chat/rooms/:id/messages — send a message
router.post("/rooms/:id/messages", requireAuth, async (req, res) => {
  try {
    const { text, recipientId, recipientName } = req.body;
    const chatRoomId = req.params.id;

    const { rows } = await pool.query(
      `INSERT INTO messages (chat_room_id, sender_id, sender_name, sender_role, recipient_id, recipient_name, text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [chatRoomId, req.user.id, req.user.fullname || req.user.name, req.user.role || "user", recipientId, recipientName, text]
    );

    // Update chat room last message
    const preview = text.length > 50 ? text.substring(0, 50) + "..." : text;
    await pool.query(
      "UPDATE chat_rooms SET last_message = $1, last_message_time = NOW(), updated_at = NOW() WHERE id = $2",
      [preview, chatRoomId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// PUT /api/chat/messages/:id/read — mark message as read
router.put("/messages/:id/read", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE messages SET read = TRUE WHERE id = $1", [req.params.id]);
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Error marking message read:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

module.exports = router;
