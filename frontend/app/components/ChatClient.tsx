"use client";

import { useEffect, useState } from "react";
import socket from "../socket";

export default function ChatClient({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join-room", roomId);

    const onReceive = (msg: string) => setMessages((s) => [...s, msg]);
    socket.on("receive-message", onReceive);

    return () => {
      socket.off("receive-message", onReceive);
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, input]);
    socket.emit("send-message", { roomId, message: input });
    setInput("");
  };

  return (
    <div className="p-6">
      <div className="border h-80 p-4 overflow-y-auto mb-4 rounded">
        {messages.map((m, i) => <div key={i}>{m}</div>)}
      </div>

      <div className="flex gap-2">
        <input
          suppressHydrationWarning
          className="border p-2 flex-1 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          suppressHydrationWarning
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
