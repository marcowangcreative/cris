import { ClientShareScreen } from "@/components/share-screens";

export default async function ClientSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClientShareScreen token={token} />;
}
