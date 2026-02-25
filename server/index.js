require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const { toNodeHandler } = require("better-auth/node");
const auth = require("./auth");

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

// Track online users: socketId → { id, nickname }
const onlineUsers = new Map();

io.on("connection", (socket) => {
  // Client sends { id, nickname } on connect
  socket.on("join", ({ id, nickname }) => {
    onlineUsers.set(socket.id, { id, nickname });
    // Broadcast updated user list to everyone
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  // Public message — broadcast to all
  socket.on("public-message", ({ nickname, text }) => {
    io.emit("public-message", {
      nickname,
      text,
      timestamp: new Date().toISOString(),
    });
  });

  // Private message — send only to recipient's socket
  socket.on("private-message", ({ toNickname, fromNickname, text }) => {
    // Find the recipient socket
    for (const [sid, user] of onlineUsers.entries()) {
      if (user.nickname === toNickname) {
        io.to(sid).emit("private-message", {
          from: fromNickname,
          text,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
    // Also echo back to sender
    socket.emit("private-message", {
      from: fromNickname,
      to: toNickname,
      text,
      timestamp: new Date().toISOString(),
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

// Serve static frontend files
app.use(express.static(path.join(__dirname, "..", "client")));

// Redirect root to homepage
app.get("/", (req, res) => {
  res.redirect("/homepage/homepage.html");
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
