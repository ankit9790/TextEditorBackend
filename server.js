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

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);

// WebSocket setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
require("./websockets")(io);

// 404 handler
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

// ✅ Start server after DB sync (NO DATA LOSS)
const PORT = process.env.PORT || 3000;
sequelize
  .sync({ alter: true }) // ✅ Adjusts tables if needed (keeps data)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to sync database:", err);
  });
