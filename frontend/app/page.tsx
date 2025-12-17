"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "./socket";

const interests = ["Sports", "Music", "Movies", "Books", "Travel", "Technology", "Food", "Gaming"];

export default function HomePage() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    const handleMatched = ({ roomId }: { roomId: string }) => {
      router.push(`/chatroom/${roomId}`);
    };
    socket.on("matched", handleMatched);
    return () => {
      socket.off("matched", handleMatched);
    };
  }, [router]);

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setSelectedInterests(prev => [...prev, interest]);
    } else {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    }
  };

  const startChat = async () => {
    if (selectedInterests.length === 0) {
      alert("Please select at least one interest.");
      return;
    }

    const userId = crypto.randomUUID();

    if (!socket.connected) {
      await new Promise<void>((resolve) => {
        const onConnect = () => {
          socket.off("connect", onConnect);
          resolve();
        };
        socket.on("connect", onConnect);
        socket.connect();
      });
    }

    socket.emit("register", userId);

    const res = await fetch("http://localhost:3001/join-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, interests: selectedInterests }),
    });

    const data = await res.json();
    if (data?.status === "matched") {
      router.push(`/chatroom/${data.roomId}`);
    } else {
      router.push(`/waiting?userId=${userId}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Select Your Interests</h1>
      <div className="mb-4">
        {interests.map(interest => (
          <label key={interest} className="block">
            <input
              type="checkbox"
              checked={selectedInterests.includes(interest)}
              onChange={(e) => handleInterestChange(interest, e.target.checked)}
              className="mr-2"
            />
            {interest}
          </label>
        ))}
      </div>
      <button onClick={startChat} className="bg-blue-500 text-white px-4 py-2 rounded">Start Chat</button>
    </div>
  );
}
