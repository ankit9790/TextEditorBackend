// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./config/database");
const cors = require("cors");

// Ensure models are registered with Sequelize
require("./models/User");
require("./models/Document");
require("./models/DocumentShare");

// API routes
const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");

const app = express();
const server = http.createServer(app);

// CORS: allow local dev origin and deployed frontend origin(s).
// In production you may restrict this to your Vercel origin only.
app.use(
  cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_ORIGIN || "*"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// mount APIs
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);

// Socket.IO configuration tuned for cloud deployment (Render)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", process.env.FRONTEND_ORIGIN || "*"],
    methods: ["GET", "POST"],
  },
  // keepalive tuning to reduce surprise disconnects on proxies
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7,
  allowEIO3: true,
});

// attach websocket handlers (modular)
require("./websockets")(io);

// 404 fallback
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

// Start server after syncing DB models
const PORT = process.env.PORT || 3000;
sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(PORT, () => {
      console.log(
        `🚀 Server running at ${
          PORT === 3000 ? `http://localhost:${PORT}` : `0.0.0.0:${PORT}`
        }`
      );
      console.log("Socket.IO ready");
    });
  })
  .catch((err) => {
    console.error("❌ Failed to sync database:", err);
  });
