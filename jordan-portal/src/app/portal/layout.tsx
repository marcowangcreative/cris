import { PortalHeader, SiteFooter } from "@/components/shell";
import { readDemoDb } from "@/lib/demo/store";
import { requireClient } from "@/server/session";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClient();
  const client = readDemoDb().clients.find((item) => item.id === session.clientId);
  return (
    <>
      <PortalHeader name={client?.full_name ?? "Client"} />
      <main id="content">{children}</main>
      <SiteFooter />
    </>
  );
}
