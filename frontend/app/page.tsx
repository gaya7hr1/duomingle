"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import socket from "./socket";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const handleMatched = ({ roomId }: { roomId: string }) => {
      router.push(`/chatroom/${roomId}`);
    };
    socket.on("matched", handleMatched);
    return () => {
      socket.off("matched", handleMatched);
    };
  }, [router]);

  const startChat = async () => {
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
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    if (data?.status === "matched") {
      router.push(`/chatroom/${data.roomId}`);
    } else {
      router.push(`/waiting?userId=${userId}`);
    }
  };

  return <button onClick={startChat}>Start Chat</button>;
}
