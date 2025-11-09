// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./config/database");
const cors = require("cors");

// Import models so sequelize picks them up
require("./models/User");
require("./models/Document");
require("./models/DocumentShare");

// Routes
const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");

const app = express();
const server = http.createServer(app);

// CORS - allow Vercel frontends and others. Use wildcard if using default subdomains.
app.use(
  cors({
    origin: "*", // you can tighten this later to your Vercel domain
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);

// Configure Socket.IO: tuned for deployment on Render
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins (Vercel default subdomains). Lock to your frontend domain in prod if desired.
    methods: ["GET", "POST"],
  },
  // ping/pong keepalive tuning — helps keep WebSocket alive on some proxies/cloud platforms
  pingInterval: 25000,
  pingTimeout: 60000,
  // larger buffer in case of large editor content
  maxHttpBufferSize: 1e7,
  // enable per-message deflate if you want to reduce bandwidth (default enabled)
  allowEIO3: true, // backwards compat (optional)
});

// Attach websockets logic (we keep this modular)
require("./websockets")(io);

// 404 handler
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

// Start server after DB sync
const PORT = process.env.PORT || 3000;
sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(PORT, () => {
      console.log(
        `🚀 Server running at ${
          PORT === 3000 ? `http://localhost:${PORT}` : `http://0.0.0.0:${PORT}`
        }`
      );
      console.log(`Socket.IO is ready`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to sync database:", err);
  });
