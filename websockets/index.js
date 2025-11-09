// websockets/index.js
module.exports = (io) => {
  const Document = require("../models/Document");
  const User = require("../models/User");
  const DocumentShare = require("../models/DocumentShare");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Resolve either numeric internal id (pk) OR docId (UUID / owner-provided) to { doc, roomId }
    async function resolveToRoom(joinIdentifier) {
      if (!joinIdentifier && joinIdentifier !== 0) return null;

      // Try numeric PK first
      const asNumber = Number(joinIdentifier);
      if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        const byPk = await Document.findByPk(asNumber);
        if (byPk) return { doc: byPk, roomId: String(byPk.id) };
      }

      // Fallback: treat as docId string (owner provided or uuid)
      const byDocId = await Document.findOne({
        where: { docId: String(joinIdentifier).trim() },
      });
      if (byDocId) return { doc: byDocId, roomId: String(byDocId.id) };

      return null;
    }

    // Support both event names for join (backwards compatibility)
    const joinEvents = ["join-document", "join-room"];
    joinEvents.forEach((evt) => {
      socket.on(evt, async (joinIdentifier) => {
        try {
          const resolved = await resolveToRoom(joinIdentifier);
          if (!resolved) {
            socket.emit("load-document", ""); // tell client: nothing found
            console.log(`Join failed: ${joinIdentifier}`);
            return;
          }

          const { doc, roomId } = resolved;

          // Leave other document rooms to avoid leakage
          try {
            const rooms = Array.from(socket.rooms || []);
            for (const r of rooms) {
              if (r !== socket.id && r !== roomId) socket.leave(r);
            }
          } catch (e) {
            /* ignore */
          }

          // Join the room using internal id (string)
          socket.join(roomId);
          console.log(
            `Socket ${socket.id} joined room ${roomId} (docId: ${doc.docId})`
          );

          // Send the current content only to this socket (initial load)
          socket.emit("load-document", doc.content || "");

          // Optionally notify others someone joined
          socket.to(roomId).emit("user-joined", { socketId: socket.id });
        } catch (err) {
          console.error("Join handler error:", err);
          socket.emit("load-document", "");
        }
      });
    });

    // Text change broadcast (payload may contain roomId or docId)
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

    // Save document content to DB (expects numeric internal id in roomId)
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
