// websockets/index.js
module.exports = (io) => {
  const Document = require("../models/Document");
  const User = require("../models/User");
  const DocumentShare = require("../models/DocumentShare");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    /**
     * Helper: resolve a join identifier to the internal numeric document id.
     * Accepts either:
     *  - numeric internal id (e.g. "12" or 12)
     *  - docId UUID string (owner-provided or generated)
     * Returns: { doc, roomId } or null if not found
     */
    async function resolveToRoom(joinIdentifier) {
      if (!joinIdentifier && joinIdentifier !== 0) return null;
      // try numeric id first
      const asNumber = Number(joinIdentifier);
      if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        const docByPk = await Document.findByPk(asNumber);
        if (docByPk) return { doc: docByPk, roomId: String(docByPk.id) };
      }

      // fallback: treat as docId string (UUID or owner-supplied)
      const docByDocId = await Document.findOne({
        where: { docId: String(joinIdentifier).trim() },
      });
      if (docByDocId) return { doc: docByDocId, roomId: String(docByDocId.id) };

      return null;
    }

    // Accept either "join-document" or "join-room" from clients (both supported)
    const joinHandlers = ["join-document", "join-room"];
    joinHandlers.forEach((evt) => {
      socket.on(evt, async (joinIdentifier) => {
        try {
          const resolved = await resolveToRoom(joinIdentifier);
          if (!resolved) {
            // no document found — inform only this client
            socket.emit("load-document", "");
            console.log(
              `Join attempt failed for identifier "${joinIdentifier}"`
            );
            return;
          }

          const { doc, roomId } = resolved;

          // Make sure socket leaves any other rooms for documents to prevent cross-room leakage
          // (optional: only leave rooms that look like document rooms)
          try {
            const rooms = Array.from(socket.rooms || []);
            for (const r of rooms) {
              if (r !== socket.id && r !== roomId) {
                socket.leave(r);
              }
            }
          } catch (e) {
            // ignore
          }

          // Join the resolved room (use string room ids)
          socket.join(roomId);
          console.log(
            `Socket ${socket.id} joined room ${roomId} (docId: ${doc.docId})`
          );

          // Send the current content only to this socket
          socket.emit("load-document", doc.content || "");

          // Optionally notify others that someone joined (non-essential)
          socket.to(roomId).emit("user-joined", { socketId: socket.id });
        } catch (err) {
          console.error("Error in join handler:", err);
          socket.emit("load-document", "");
        }
      });
    });

    /**
     * TEXT-CHANGE
     * Client should emit: socket.emit("text-change", { roomId: "<internal id>", content: "<html>" })
     * We accept field names 'roomId' or 'docId' (backwards compatibility).
     * We broadcast to others in the same room only.
     */
    socket.on("text-change", (payload) => {
      try {
        if (!payload) return;
        const room = payload.roomId ?? payload.docId ?? null;
        const content = payload.content ?? "";

        if (!room) return;

        // Broadcast only to others in the same room
        socket.to(String(room)).emit("receive-changes", content);
      } catch (err) {
        console.error("text-change handler error:", err);
      }
    });

    /**
     * SAVE-DOCUMENT
     * Client should emit: socket.emit("save-document", { roomId: "<internal id>", content: "<html>" })
     * We'll persist content to DB using the numeric internal id.
     */
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
        // Optionally, confirm saved to client (not required)
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
