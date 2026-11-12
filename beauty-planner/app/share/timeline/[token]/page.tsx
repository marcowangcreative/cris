import { TimelineShareScreen } from "@/components/share-screens";

export default async function TimelineSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TimelineShareScreen token={token} />;
}
