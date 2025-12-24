# Duomingle 

A real-time anonymous chat backend with interest-based matchmaking, built using **Node.js**, **Express**, and **Socket.IO**.  
This service powers Duomingle’s live chat, user pairing, and room management while supporting production deployment with a separated frontend and backend architecture.

---

## Features

- Real-time messaging using WebSockets (Socket.IO)
- Anonymous user matching based on shared interests
- Room-based chat with join/leave notifications
- Rate-limited matchmaking endpoint
- CORS-protected for production use

---

##  Tech Stack

- **Node.js**
- **Express**
- **Socket.IO**
- **UUID** – room ID generation
- **express-rate-limit** – API abuse protection
- **HTTP server** for persistent WebSocket connections

---
##  Architecture
Frontend (Next.js on Vercel)
        |
        |  REST + WebSockets
        v
Backend (Express + Socket.IO on Render)


- Frontend is deployed on **Vercel**
- Backend is deployed on **Render** (required for WebSocket support)
- Socket.IO manages all real-time communication
- REST API handles matchmaking logic

---

##  API Endpoints

### `POST /join-queue`

Adds a user to the matchmaking queue or matches them with another user.

**Request Body**
```json
{
  "userId": "string",
  "interests": ["Music", "Sports"]
}
```
**Response**
```json
{ "status": "waiting" }
```
```json
{
  "status": "matched",
  "roomId": "uuid"
}
```
## Socket.IO Events
### Client → Server
| Event          | Payload                          | Description                  |
| -------------- | -------------------------------- | ---------------------------- |
| `register`     | `{ userId, nickname, imageUrl }` | Registers a socket to a user |
| `join-room`    | `roomId`                         | Joins a matched room         |
| `send-message` | `{ roomId, message }`            | Sends a chat message         |
| `leave-room`   | `roomId`                         | Leaves the room              |

### Server → Client

| Event             | Payload                  | Description           |
| ----------------- | ------------------------ | --------------------- |
| `matched`         | `{ roomId, partner }`    | Match found           |
| `receive-message` | `message`                | Incoming chat message |
| `partner-joined`  | `{ nickname, imageUrl }` | Partner joined room   |
| `partner-left`    | —                        | Partner disconnected  |

