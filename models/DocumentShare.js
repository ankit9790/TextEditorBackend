const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DocumentShare = sequelize.define("DocumentShare", {
  documentId: { type: DataTypes.INTEGER, allowNull: false },
  sharedWith: { type: DataTypes.INTEGER, allowNull: false },
  permission: { type: DataTypes.ENUM("view", "edit"), defaultValue: "view" },
});

module.exports = DocumentShare;
