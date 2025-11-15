"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import socket from "../socket";

export default function WaitingClient({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {

    const onConnect = () => {
      console.log("Socket connected:", socket.id);
      socket.emit("register", userId);
    };

    const onMatched = ({ roomId }: { roomId: string }) => {
      console.log(" Matched! roomId:", roomId);
      router.push(`/chatroom/${roomId}`);
    };

    socket.on("connect", onConnect);
    socket.on("matched", onMatched);

    return () => {
      socket.off("connect", onConnect);
      socket.off("matched", onMatched);
    };
  }, [userId, router]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Waiting for a match...</h1>
      <p className="text-gray-600">User ID: {userId}</p>
    </div>
  );
}
