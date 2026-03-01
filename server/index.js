require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const { toNodeHandler } = require("better-auth/node");
const auth = require("./auth");
const pool = require("./db");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

const CORS_ORIGIN = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// CORS for Express
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io available to Express routes
app.locals.io = io;

// Track online users: socketId → { id, nickname }
const onlineUsers = new Map();

io.on("connection", (socket) => {
  // Client sends { id, nickname } on connect
  socket.on("join", ({ id, nickname }) => {
    onlineUsers.set(socket.id, { id, nickname });
    // Broadcast updated user list to everyone
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  // Join a private dashboard chat room for real-time messages
  socket.on("join-chat-room", (roomId) => {
    socket.join(`chat:${roomId}`);
  });

  // Public message — save to DB and broadcast to all
  socket.on("public-message", ({ nickname, text, userId }) => {
    const timestamp = new Date().toISOString();

    // Save to PostgreSQL (fire and forget)
    pool.query(
      "INSERT INTO peer_chat_messages (type, sender_id, sender_nickname, text) VALUES ('public', $1, $2, $3)",
      [userId || null, nickname, text]
    ).catch(err => console.error("Error saving public peer message:", err));

    io.emit("public-message", { nickname, text, timestamp });
  });

  // Private message — save to DB and send to recipient
  socket.on("private-message", ({ toNickname, fromNickname, text, userId }) => {
    const timestamp = new Date().toISOString();

    // Save to PostgreSQL (fire and forget)
    pool.query(
      "INSERT INTO peer_chat_messages (type, sender_id, sender_nickname, recipient_nickname, text) VALUES ('private', $1, $2, $3, $4)",
      [userId || null, fromNickname, toNickname, text]
    ).catch(err => console.error("Error saving private peer message:", err));

    // Send to recipient
    for (const [sid, user] of onlineUsers.entries()) {
      if (user.nickname === toNickname) {
        io.to(sid).emit("private-message", {
          from: fromNickname,
          text,
          timestamp,
        });
        break;
      }
    }
    // Echo back to sender
    socket.emit("private-message", {
      from: fromNickname,
      to: toNickname,
      text,
      timestamp,
      isSelf: true,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online-users", Array.from(onlineUsers.values()));
  });
});

// BetterAuth handler — must come BEFORE express.json() so it can parse its own body
app.all("/api/auth/*", toNodeHandler(auth));

// JSON body parser for all other routes
app.use(express.json());

// API routes
app.use("/api/users", require("./routes/users"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/verifications", require("./routes/verifications"));
app.use("/api/activity-logs", require("./routes/activityLogs"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/resources", require("./routes/resources"));
app.use("/api/flagged-messages", require("./routes/flaggedMessages"));
app.use("/api/peer-chat", require("./routes/peerChat"));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "..", "client")));

// Redirect root to homepage
app.get("/", (req, res) => {
  res.redirect("/homepage/homepage.html");
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
