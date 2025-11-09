// websockets/index.js
// Robust Socket.IO handler: resolves docId or numeric id and uses internal id as room key
module.exports = (io) => {
  const Document = require("../models/Document");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Resolve a join identifier (internal numeric id or docId string) to a document and roomId
    async function resolveToRoom(joinIdentifier) {
      if (!joinIdentifier && joinIdentifier !== 0) return null;

      // Try numeric primary key first
      const asNumber = Number(joinIdentifier);
      if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        const docByPk = await Document.findByPk(asNumber);
        if (docByPk) return { doc: docByPk, roomId: String(docByPk.id) };
      }

      // Fallback: treat as docId string (UUID or owner-provided)
      const docByDocId = await Document.findOne({
        where: { docId: String(joinIdentifier).trim() },
      });
      if (docByDocId) return { doc: docByDocId, roomId: String(docByDocId.id) };

      return null;
    }

    // Support both 'join-document' and 'join-room' events for compatibility
    const joinEvents = ["join-document", "join-room"];
    joinEvents.forEach((evt) => {
      socket.on(evt, async (joinIdentifier) => {
        try {
          const resolved = await resolveToRoom(joinIdentifier);
          if (!resolved) {
            socket.emit("load-document", ""); // inform client nothing found
            console.log(`Join failed for identifier: ${joinIdentifier}`);
            return;
          }

          const { doc, roomId } = resolved;

          // Ensure socket leaves other document rooms (prevent multiple-document leakage)
          try {
            const rooms = Array.from(socket.rooms || []);
            for (const r of rooms) {
              if (r !== socket.id && r !== roomId) socket.leave(r);
            }
          } catch (e) {
            // ignore
          }

          // Join the room by internal id (string) — this is the authoritative room key
          socket.join(roomId);
          console.log(
            `Socket ${socket.id} joined room ${roomId} (docId: ${doc.docId})`
          );

          // Send current content only to this newly joined socket
          socket.emit("load-document", doc.content || "");

          // Notify other members (optional)
          socket.to(roomId).emit("user-joined", { socketId: socket.id });
        } catch (err) {
          console.error("Join handler error:", err);
          socket.emit("load-document", "");
        }
      });
    });

    // Broadcast text changes to everyone else in the room.
    // Accepts { roomId: <internal id>, content } or { docId: <docId>, content } for compatibility
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

    // Persist content to DB — expects numeric internal id in roomId
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
