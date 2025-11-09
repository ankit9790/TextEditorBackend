// server.js
// Deployment-ready Express + Socket.IO server tuned for Render
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sequelize = require("./config/database");
const cors = require("cors");

// ensure models registered
require("./models/User");
require("./models/Document");
require("./models/DocumentShare");

// routes
const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");

const app = express();
const server = http.createServer(app);

// CORS: allow local dev and deployed frontend (tighten in prod by setting FRONTEND_ORIGIN env on Render)
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_ORIGIN || "*", // set FRONTEND_ORIGIN on Render to tighten CORS
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// mount API endpoints
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);

// Socket.IO configuration (tuned for cloud)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  // helpful for cloud deployments and proxies
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7, // accept larger messages (editor HTML)
  allowEIO3: true,
});

// attach websockets logic (in separate file)
require("./websockets")(io);

// 404 fallback
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

// start after DB sync to ensure tables ready
const PORT = process.env.PORT || 3000;
sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("Socket.IO ready");
    });
  })
  .catch((err) => {
    console.error("❌ Failed to sync database:", err);
  });
