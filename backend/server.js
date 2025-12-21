import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting: 10 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/join-queue", limiter);

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

let waitingUsers = []; // { userId, interests: [] }[]
let matches = {}; // roomId -> { user1, user2 }

// Helper to find room for a user
function getRoomForUser(userId) {
  for (const [roomId, match] of Object.entries(matches)) {
    if (match.user1 === userId || match.user2 === userId) {
      return { roomId, match };
    }
  }
  return null;
}

// Helper to remove match
function removeMatch(roomId) {
  delete matches[roomId];
}

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
    socket.data.roomId = roomId; // Store roomId in socket data
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on("send-message", ({ roomId, message }) => {
    if (!roomId || typeof message !== "string") return;
    const trimmed = message.trim();
    if (trimmed.length === 0 || trimmed.length > 500) return; // limit message length
    console.log(`Message in ${roomId} from ${socket.id}: ${trimmed}`);
    socket.to(roomId).emit("receive-message", trimmed);
  });

  socket.on("leave-room", (roomId) => {
    if (!roomId) return;
    const uid = socket.data.userId;
    if (!uid) return;

    const roomInfo = getRoomForUser(uid);
    if (roomInfo && roomInfo.roomId === roomId) {
      const { match } = roomInfo;
      const partnerId = match.user1 === uid ? match.user2 : match.user1;
      const partnerSockets = getSocketsForUser(partnerId);
      partnerSockets.forEach((sid) => io.to(sid).emit("partner-left"));
      removeMatch(roomId);
      console.log("User left room:", roomId, "notified partner");
    }
    socket.leave(roomId);
    socket.data.roomId = null;
  });

  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    if (uid) {
      removeSocketForUser(uid, socket.id);

      // Check if user was in a match
      const roomInfo = getRoomForUser(uid);
      if (roomInfo) {
        const { roomId, match } = roomInfo;
        const partnerId = match.user1 === uid ? match.user2 : match.user1;
        const partnerSockets = getSocketsForUser(partnerId);
        partnerSockets.forEach((sid) => io.to(sid).emit("partner-left"));
        removeMatch(roomId);
        console.log("Notified partner and removed match for room:", roomId);
      }
    } else {
      console.log("Socket disconnected:", socket.id, "no userId");
    }
  });
});

app.post("/join-queue", (req, res) => {
  console.log("POST /join-queue body:", req.body);
  try { 
    const { userId, interests } = req.body ?? {};
    if (!userId || typeof userId !== "string" || userId.length === 0) return res.status(400).json({ error: "valid userId required" });
    if (!Array.isArray(interests)) return res.status(400).json({ error: "interests must be an array" });

    // drop waiting users without active sockets
    waitingUsers = waitingUsers.filter((w) => getSocketsForUser(w.userId).length > 0);

    // Find partner with common interests
    let partnerIndex = -1;
    for (let i = 0; i < waitingUsers.length; i++) {
      const w = waitingUsers[i];
      if (w.userId !== userId) {
        const common = interests.filter(interest => w.interests.includes(interest));
        if (common.length > 0) {
          partnerIndex = i;
          break;
        }
      }
    }

    // If no partner with common interests, take any
    if (partnerIndex === -1) {
      partnerIndex = waitingUsers.findIndex((w) => w && w.userId && w.userId !== userId);
    }

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
    console.error("Error in /join-queue:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend + Socket running on http://localhost:${PORT}`));
app.get("/", (req, res) => {
  res.send("backend is running ");
});

