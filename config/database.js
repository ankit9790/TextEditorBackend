require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Neon Serverless
    },
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Neon Database Successfully");

    // Auto-create tables if not exist (NO DATA LOSS)
    await sequelize.sync({ alter: true });
    console.log("🧩 Models synchronized (tables updated if needed)");
  } catch (error) {
    console.error("❌ Database Connection Error:", error.message);
  }
}

connectDB();

module.exports = sequelize;
