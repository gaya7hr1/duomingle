"use client";

import { useEffect, useState } from "react";
import socket from "../socket";

export default function ChatClient({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [partnerLeft, setPartnerLeft] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join-room", roomId);

    const onReceive = (msg: string) => setMessages((s) => [...s, msg]);
    const onPartnerLeft = () => setPartnerLeft(true);

    socket.on("receive-message", onReceive);
    socket.on("partner-left", onPartnerLeft);

    return () => {
      socket.off("receive-message", onReceive);
      socket.off("partner-left", onPartnerLeft);
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input.trim() || partnerLeft) return;
    setMessages((prev) => [...prev, input]);
    socket.emit("send-message", { roomId, message: input });
    setInput("");
  };

  const leaveChat = () => {
    socket.emit("leave-room", roomId);
    window.location.href = "/";
  };

  return (
    <div className="p-6">
      <div className="border h-80 p-4 overflow-y-auto mb-4 rounded">
        {messages.map((m, i) => <div key={i}>{m}</div>)}
        {partnerLeft && <div className="text-red-500 mt-2">Your partner has left the chat.</div>}
      </div>

      <div className="flex gap-2">
        <input
          suppressHydrationWarning
          className="border p-2 flex-1 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={partnerLeft}
        />
        <button
          suppressHydrationWarning
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded disabled:bg-gray-400"
          disabled={partnerLeft}
        >
          Send
        </button>
        <button
          suppressHydrationWarning
          onClick={leaveChat}
          className="bg-red-600 text-white px-4 rounded"
        >
          Leave Chat
        </button>
      </div>
    </div>
  );
}
