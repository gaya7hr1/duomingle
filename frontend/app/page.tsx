"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import socket from "./socket";

const interests = ["Sports", "Music", "Movies", "Books", "Travel", "Technology", "Food", "Gaming"];

interface UserProfile {
  nickname: string;
  imageUrl: string;
  interests: string[];
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    }

    const handleMatched = ({ roomId }: { roomId: string }) => {
      router.push(`/chatroom/${roomId}`);
    };
    socket.on("matched", handleMatched);
    return () => {
      socket.off("matched", handleMatched);
    };
  }, [router]);

  useEffect(() => {
    if (profile && searchParams.get("skip") === "true") {
      startChat();
    }
  }, [profile, searchParams]);

  const startChat = async () => {
    if (!profile) {
      alert("Please set your profile first.");
      return;
    }

    const userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);

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

    socket.emit("register", { userId, ...profile });

    const res = await fetch("https://duomingle.onrender.com/join-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, interests: profile.interests }),
    });

    const data = await res.json();
    if (data?.status === "matched") {
      router.push(`/chatroom/${data.roomId}`);
    } else {
      router.push(`/waiting?userId=${userId}`);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center bg-[#2b2d31] min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-white">Duomingle</h1>
      <p className="mb-6 text-gray-300">Anonymous random chat with interest matching</p>
      {profile ? (
        <div className="mb-4 bg-[#36393f] p-4 rounded-lg">
          <img src={profile.imageUrl || "/assets/example.jpg"} alt="Profile" className="w-16 h-16 rounded-full mx-auto mb-2" />
          <p className="font-semibold text-white">{profile.nickname}</p>
          <p className="text-sm text-gray-400">Interests: {profile.interests.join(", ")}</p>
        </div>
      ) : (
        <p className="mb-4 text-gray-300">Set up your profile to start chatting!</p>
      )}
      <div className="space-y-2">
        <button onClick={() => router.push("/profile")} className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded w-full transition">
          {profile ? "Edit Profile" : "Set Profile"}
        </button>
        <button onClick={startChat} className="bg-[#57f287] hover:bg-[#4ade80] text-black px-4 py-2 rounded w-full transition" disabled={!profile}>
          Start Chat
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-md mx-auto text-center bg-[#2b2d31] min-h-screen"><h1 className="text-3xl font-bold mb-4 text-white">Loading...</h1></div>}>
      <HomePageContent />
    </Suspense>
  );
}
