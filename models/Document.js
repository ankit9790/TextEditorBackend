const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const Document = sequelize.define("Document", {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, defaultValue: "" },
  docId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: () => uuidv4(), // Generate UUID if owner doesn't provide
  },
  ownerId: { type: DataTypes.INTEGER, allowNull: false },
});

module.exports = Document;
