module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-document", (docId) => {
      socket.join(docId);
      console.log(`User ${socket.id} joined document ${docId}`);
    });

    socket.on("text-change", ({ docId, content }) => {
      socket.to(docId).emit("receive-changes", content);
    });

    socket.on("save-document", async ({ docId, content }) => {
      const Document = require("./models/Document");
      await Document.update({ content }, { where: { id: docId } });
      console.log(`Document ${docId} saved`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
