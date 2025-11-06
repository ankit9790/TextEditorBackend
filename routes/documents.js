const express = require("express");
const Document = require("../models/Document");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Get all documents owned by user
router.get("/", async (req, res) => {
  const docs = await Document.findAll({ where: { ownerId: req.user.id } });
  res.json(docs);
});

// Create new document
router.post("/", async (req, res) => {
  const { title, content } = req.body;
  const doc = await Document.create({ title, content, ownerId: req.user.id });
  res.status(201).json(doc);
});

// Get document by internal ID
router.get("/:id", async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json(doc);
});

// Get document by docId (for sharing)
router.get("/join/:docId", async (req, res) => {
  const doc = await Document.findOne({ where: { docId: req.params.docId } });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json(doc);
});

// Delete document
router.delete("/:id", async (req, res) => {
  await Document.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
});

module.exports = router;
