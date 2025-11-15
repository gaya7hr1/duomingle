import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// mapping userId -> Set(socketId)
const userSockets = new Map();
//sockets funs
function addSocketForUser(userId, socketId) {
  if (!userId) return;
  const set = userSockets.get(userId) ?? new Set();
  set.add(socketId);
  userSockets.set(userId, set);
}
function removeSocketForUser(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}
function getSocketsForUser(userId) {
  const set = userSockets.get(userId);
  return set ? Array.from(set) : [];
}

let waitingUsers = []; // { userId }[]
let matches = {}; // roomId -> { user1, user2 }

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", (userId) => {
    socket.data.userId = userId;
    addSocketForUser(userId, socket.id);
    console.log("Registered user:", userId, "->", socket.id);
  });

  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on("send-message", ({ roomId, message }) => {
    if (!roomId || typeof message !== "string") return;
    console.log(`Message in ${roomId} from ${socket.id}: ${message}`);
    socket.to(roomId).emit("receive-message", message);
  });

  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    if (uid) removeSocketForUser(uid, socket.id);
    console.log("Socket disconnected:", socket.id, "userId:", uid);
  });
});

app.post("/join-queue", (req, res) => {
  console.log("POST /join-queue body:", req.body);
  try { 
    const { userId, interests } = req.body ?? {}; // never sent intrests from frontend yet
    if (!userId) return res.status(400).json({ error: "userId required" });

    // drop waiting users without active sockets
    waitingUsers = waitingUsers.filter((w) => getSocketsForUser(w.userId).length > 0);

    const partnerIndex = waitingUsers.findIndex((w) => w && w.userId && w.userId !== userId);
    if (partnerIndex === -1) {
      waitingUsers.push({ userId, interests });
      console.log("User queued:", userId, "waitingCount:", waitingUsers.length);
      return res.json({ status: "waiting" });
    }

    const partner = waitingUsers.splice(partnerIndex, 1)[0];
    if (!partner || !partner.userId) {
      console.error("Invalid partner:", partner);
      return res.status(500).json({ error: "no valid partner" });
    }

    const roomId = uuid();
    matches[roomId] = { user1: partner.userId, user2: userId };

    const partnerSockets = getSocketsForUser(partner.userId);
    const userSocketsForUser = getSocketsForUser(userId);

    console.log("Matched", userId, "with", partner.userId, "room", roomId, "partnerSockets:", partnerSockets.length, "userSockets:", userSocketsForUser.length);

    partnerSockets.forEach((sid) => io.to(sid).emit("matched", { roomId }));
    userSocketsForUser.forEach((sid) => io.to(sid).emit("matched", { roomId }));

    return res.json({ status: "matched", roomId });
  } catch (err) {
    console.error("Error in /join-queue:", err); // ??
    return res.status(500).json({ error: "internal server error" });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend + Socket running on http://localhost:${PORT}`));
