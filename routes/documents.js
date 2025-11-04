const express = require("express");
const Document = require("../models/Document");
const DocumentShare = require("../models/DocumentShare");

const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

router.use(auth);

router.get("/", async (req, res) => {
  const docs = await Document.findAll({ where: { ownerId: req.user.id } });
  res.json(docs);
});

router.post("/", async (req, res) => {
  const doc = await Document.create({ ...req.body, ownerId: req.user.id });
  res.status(201).json(doc);
});

router.get("/:id", async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  res.json(doc);
});

router.put("/:id", async (req, res) => {
  const doc = await Document.update(req.body, { where: { id: req.params.id } });
  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  await Document.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
});

module.exports = router;

router.post("/:id/share", auth, async (req, res) => {
  const { sharedWith, permission } = req.body;
  const documentId = req.params.id;

  try {
    const share = await DocumentShare.create({
      documentId,
      sharedWith,
      permission,
    });
    res.status(201).json({ message: "Document shared successfully", share });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to share document", details: err.message });
  }
});
