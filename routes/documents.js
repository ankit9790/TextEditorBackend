// routes/documents.js
const express = require("express");
const Document = require("../models/Document");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Get documents owned by user
router.get("/", async (req, res) => {
  try {
    const docs = await Document.findAll({ where: { ownerId: req.user.id } });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join by docId (returns full document including internal id)
router.get("/join/:docId", async (req, res) => {
  try {
    const doc = await Document.findOne({ where: { docId: req.params.docId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get by internal id
router.get("/:id", async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new document
router.post("/", async (req, res) => {
  const { title, content, docId } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "Title is required" });
  try {
    const existingDoc = docId
      ? await Document.findOne({ where: { docId } })
      : null;
    if (existingDoc)
      return res.status(400).json({ error: "Document ID already exists" });

    const doc = await Document.create({
      title,
      content: content || "",
      ownerId: req.user.id,
      docId: docId?.trim() || undefined,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update content (owner or collaborator)
router.put("/:id", async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { content, title } = req.body;
    if (content !== undefined) doc.content = content;
    if (title !== undefined && req.user.id === doc.ownerId) doc.title = title;

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (owner only)
router.delete("/:id", async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (doc.ownerId !== req.user.id)
      return res
        .status(403)
        .json({ error: "Only owner can delete this document" });

    await doc.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
