module.exports = (io) => {
  // Import models once at the top
  const Document = require("../models/Document");
  const User = require("../models/User");
  const DocumentShare = require("../models/DocumentShare");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-document", async (docId) => {
      socket.join(docId);
      console.log(`User ${socket.id} joined document ${docId}`);

      // ✅ Send existing content to client when they join
      try {
        const doc = await Document.findByPk(docId);
        const content = doc?.content || "";
        socket.emit("load-document", content);
      } catch (err) {
        console.error("Error loading document:", err.message);
        socket.emit("load-document", "");
      }
    });

    socket.on("text-change", ({ docId, content }) => {
      // ✅ Broadcast only to others
      socket.to(docId).emit("receive-changes", content);
    });

    socket.on("save-document", async ({ docId, content }) => {
      try {
        await Document.update({ content }, { where: { id: docId } });
        console.log(`Document ${docId} saved`);
      } catch (err) {
        console.error("Error saving document:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
