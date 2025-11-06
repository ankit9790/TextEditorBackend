const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const Document = sequelize.define("Document", {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT },
  docId: {
    type: DataTypes.STRING,
    unique: true,
    defaultValue: () => uuidv4(),
  },
  ownerId: { type: DataTypes.INTEGER },
});

module.exports = Document;
