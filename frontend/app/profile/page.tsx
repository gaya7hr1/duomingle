"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const interests = ["Sports", "Music", "Movies", "Books", "Travel", "Technology", "Food", "Gaming"];

interface UserProfile {
  nickname: string;
  imageUrl: string;
  interests: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    nickname: "",
    imageUrl: "",
    interests: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  const handleInterestChange = (interest: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      interests: checked
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest),
    }));
  };

  const saveProfile = () => {
    if (!profile.nickname.trim()) {
      alert("Please enter a nickname.");
      return;
    }
    if (profile.interests.length === 0) {
      alert("Please select at least one interest.");
      return;
    }
    localStorage.setItem("userProfile", JSON.stringify(profile));
    router.push("/");
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-[#2b2d31] min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-white">Set Your Profile</h1>
      <div className="mb-4">
        <label className="block mb-2 text-gray-300">Nickname:</label>
        <input
          type="text"
          value={profile.nickname}
          onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
          className="border border-gray-600 bg-[#36393f] text-white p-2 w-full rounded"
          placeholder="Enter your nickname"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2 text-gray-300">Profile Image URL:</label>
        <input
          type="url"
          value={profile.imageUrl}
          onChange={(e) => setProfile(prev => ({ ...prev, imageUrl: e.target.value }))}
          className="border border-gray-600 bg-[#36393f] text-white p-2 w-full rounded"
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2 text-gray-300">Interests:</label>
        {interests.map(interest => (
          <label key={interest} className="block text-gray-300">
            <input
              type="checkbox"
              checked={profile.interests.includes(interest)}
              onChange={(e) => handleInterestChange(interest, e.target.checked)}
              className="mr-2"
            />
            {interest}
          </label>
        ))}
      </div>
      <button onClick={saveProfile} className="bg-[#57f287] hover:bg-[#4ade80] text-black px-4 py-2 rounded w-full transition">
        Save Profile
      </button>
    </div>
  );
}