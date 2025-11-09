module.exports = (io) => {
  const Document = require("../models/Document");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a document room using internal id
    socket.on("join-document", async (docId) => {
      try {
        // Find document by internal id
        const doc = await Document.findByPk(docId);
        if (!doc) {
          socket.emit("load-document", "");
          return console.error(`Document ${docId} not found`);
        }

        // Join room using internal id
        socket.join(doc.id);
        console.log(`User ${socket.id} joined document room ${doc.id}`);

        // Send current content to this user
        socket.emit("load-document", doc.content || "");

        // Notify others in the room (optional)
        socket.to(doc.id).emit("user-joined", { userId: socket.id });
      } catch (err) {
        console.error("Error joining document:", err.message);
        socket.emit("load-document", "");
      }
    });

    // Broadcast text changes to others in the same room
    socket.on("text-change", ({ docId, content }) => {
      socket.to(docId).emit("receive-changes", content);
    });

    // Save document content to DB
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
