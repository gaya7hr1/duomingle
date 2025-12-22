import io  from "socket.io-client";

const SOCKET_URL = "https://duomingle.onrender.com";
const socket = io(SOCKET_URL, { autoConnect: false, transports: ["websocket"] });

export default socket;
