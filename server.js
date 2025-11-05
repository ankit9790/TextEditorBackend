require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./config/database");
const cors = require("cors");

// Import models
require("./models/User");
require("./models/Document");
require("./models/DocumentShare");

// Routes
const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // Note: credentials=true is ignored with origin="*"
  })
);

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);

// WebSocket setup (allow all origins)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
require("./websockets")(io);

// 404 handler
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

// Start server after DB sync
const PORT = process.env.PORT || 3000;
sequelize
  .sync()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to sync database:", err);
  });
