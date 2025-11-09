// websockets/index.js
module.exports = (io) => {
  const Document = require("../models/Document");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Resolve joinIdentifier (internal id or docId) -> { doc, roomId }
    async function resolveToRoom(joinIdentifier) {
      if (!joinIdentifier && joinIdentifier !== 0) return null;

      // Try numeric internal id first
      const asNumber = Number(joinIdentifier);
      if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        const byPk = await Document.findByPk(asNumber);
        if (byPk) return { doc: byPk, roomId: String(byPk.id) };
      }

      // Fallback: docId string (UUID or owner-supplied)
      const byDocId = await Document.findOne({
        where: { docId: String(joinIdentifier).trim() },
      });
      if (byDocId) return { doc: byDocId, roomId: String(byDocId.id) };

      return null;
    }

    // Support either event name for compatibility
    const joinEvents = ["join-document", "join-room"];
    joinEvents.forEach((evt) => {
      socket.on(evt, async (joinIdentifier) => {
        try {
          const resolved = await resolveToRoom(joinIdentifier);
          if (!resolved) {
            // If not found, tell this client to show empty state (or error)
            socket.emit("load-document", "");
            console.log(`Join failed for identifier: ${joinIdentifier}`);
            return;
          }

          const { doc, roomId } = resolved;

          // Leave other document rooms to avoid being in multiple document rooms
          try {
            const rooms = Array.from(socket.rooms || []);
            for (const r of rooms) {
              if (r !== socket.id && r !== roomId) socket.leave(r);
            }
          } catch (e) {
            /* ignore */
          }

          // Join room using internal id (string). This ensures uniform room key.
          socket.join(roomId);
          console.log(
            `Socket ${socket.id} joined room ${roomId} (docId: ${doc.docId})`
          );

          // Send the current document content only to this client
          socket.emit("load-document", doc.content || "");

          // Notify others (optional)
          socket.to(roomId).emit("user-joined", { socketId: socket.id });
        } catch (err) {
          console.error("Error in join handler:", err);
          socket.emit("load-document", "");
        }
      });
    });

    // Broadcast incoming text changes to others in the room
    // Accepts payload.roomId (preferred) or payload.docId (compat)
    socket.on("text-change", (payload) => {
      try {
        if (!payload) return;
        const room = payload.roomId ?? payload.docId ?? null;
        const content = payload.content ?? "";
        if (!room) return;
        socket.to(String(room)).emit("receive-changes", content);
      } catch (err) {
        console.error("text-change error:", err);
      }
    });

    // Persist saved content to DB. Expects numeric internal id (roomId)
    socket.on("save-document", async (payload) => {
      try {
        if (!payload) return;
        const room = payload.roomId ?? payload.docId ?? null;
        const content = payload.content ?? "";
        if (!room) return;

        const idNum = Number(room);
        if (Number.isNaN(idNum)) {
          console.error("save-document: invalid room id:", room);
          return;
        }

        await Document.update({ content }, { where: { id: idNum } });
        socket.emit("saved-document", { id: idNum });
      } catch (err) {
        console.error("save-document error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
