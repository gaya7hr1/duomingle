import WaitingClient from "../components/WaitingClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const params = await searchParams;
  const userId = params?.userId ?? "";
  return <WaitingClient userId={userId} />;
}
