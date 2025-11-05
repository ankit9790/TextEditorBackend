require("dotenv").config();
const { Sequelize } = require("sequelize");

// Initialize Sequelize with Neon Serverless Database
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Neon Serverless
    },
  },
  logging: false, // Disable SQL query logging (set true if needed)
  pool: {
    max: 5, // Maximum number of connections
    min: 0, // Minimum number of connections
    acquire: 30000, // Maximum time in ms that pool will try to get connection before throwing error
    idle: 10000, // Maximum time in ms that a connection can be idle before being released
  },
});

module.exports = sequelize;
