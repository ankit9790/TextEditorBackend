const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Document = sequelize.define("Document", {
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
});

Document.belongsTo(User, { as: "owner" });
Document.belongsToMany(User, { through: "DocumentShares", as: "sharedWith" });

module.exports = Document;
