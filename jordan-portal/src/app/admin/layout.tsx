import { AdminHeader } from "@/components/shell";
import { requireAdmin } from "@/server/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <AdminHeader />
      <main id="content" className="studio-desk mx-auto w-full max-w-6xl px-6 py-10">
        {children}
      </main>
    </>
  );
}
