"use client";

import { useEffect, useState, useRef } from "react";
import socket from "../socket";

interface UserProfile {
  nickname: string;
  imageUrl: string;
  interests: string[];
}

export default function ChatClient({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        setOwnProfile(JSON.parse(saved));
      }
    }

    if (!socket.connected) socket.connect();
    socket.emit("join-room", roomId);

    const onReceive = (msg: string) => setMessages((s) => [...s, `${partner?.nickname || "Partner"}: ${msg}`]);
    const onPartnerLeft = () => setPartnerLeft(true);
    const onPartnerJoined = (data: UserProfile) => setPartner(data);

    socket.on("receive-message", onReceive);
    socket.on("partner-left", onPartnerLeft);
    socket.on("partner-joined", onPartnerJoined);

    return () => {
      socket.off("receive-message", onReceive);
      socket.off("partner-left", onPartnerLeft);
      socket.off("partner-joined", onPartnerJoined);
    };
  }, [roomId, partner?.nickname]);

  const sendMessage = () => {
    if (!input.trim() || partnerLeft) return;
    setMessages((prev) => [...prev, `${ownProfile?.nickname || "You"}: ${input}`]);
    socket.emit("send-message", { roomId, message: input });
    setInput("");
  };

  const leaveChat = () => {
    socket.emit("leave-room", roomId);
    window.location.href = "/";
  };

  const skipChat = () => {
    socket.emit("leave-room", roomId);
    window.location.href = "/?skip=true";
  };

  return (
    <div className="flex flex-col h-screen bg-[#2b2d31] text-white">
      {/* Header */}
      <div className="bg-[#36393f] shadow-md p-4 flex items-center justify-between">
        <button onClick={leaveChat} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition">Leave</button>
        {partner && (
          <div className="flex items-center">
            <img src={partner.imageUrl || "/default-avatar.png"} alt="Partner" className="w-10 h-10 rounded-full mr-3" />
            <div>
              <p className="font-semibold text-white">{partner.nickname || "Anonymous"}</p>
              <p className="text-sm text-gray-400">Interests: {partner.interests?.join(", ") || "None"}</p>
            </div>
          </div>
        )}
        <button onClick={skipChat} className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded transition">Skip</button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="bg-[#36393f] border border-gray-600 rounded-lg h-full flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className="mb-2 text-white">{m}</div>
            ))}
            <div ref={messagesEndRef} />
            {partnerLeft && <div className="text-red-400 mt-2">Your partner has left the chat.</div>}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-600">
            <div className="flex gap-2">
              <input
                suppressHydrationWarning
                className="border border-gray-600 bg-[#2b2d31] text-white p-2 flex-1 rounded"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                disabled={partnerLeft}
              />
              <button onClick={sendMessage} className="bg-[#57f287] hover:bg-[#4ade80] text-black px-4 py-2 rounded transition" disabled={partnerLeft}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
