import ChatClient from "../../components/ChatClient";

interface ChatPageProps {
  params: Promise<{ roomid: string }>; // params is a Promise
}

export default async function ChatPage({ params }: ChatPageProps) {
  const resolvedParams = await params; // have to await params
  const { roomid } = resolvedParams;

  return <ChatClient roomId={roomid} />;
}


