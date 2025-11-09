const express = require("express");
const Document = require("../models/Document");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Get all documents owned by user
router.get("/", async (req, res) => {
  try {
    const docs = await Document.findAll({ where: { ownerId: req.user.id } });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get document by docId (for joining)
router.get("/join/:docId", async (req, res) => {
  try {
    const doc = await Document.findOne({ where: { docId: req.params.docId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Return full document including internal id
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get document by internal ID
router.get("/:id", async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new document (owner can provide docId)
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

// Delete document (ONLY owner can delete)
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

// Update document content (owner or friend can edit)
router.put("/:id", async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { content } = req.body;
    if (content === undefined)
      return res.status(400).json({ error: "Content is required" });

    // Allow anyone to update content (owner or friend)
    await doc.update({ content });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
