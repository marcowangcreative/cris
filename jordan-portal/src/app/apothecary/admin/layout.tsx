import { redirect } from "next/navigation";
import { ApothecaryFooter, ApothecaryHeader } from "@/components/apothecary/shell";
import { getActor } from "@/server/session";

export default async function ApothecaryAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") redirect("/apothecary/login");
  return (
    <div className="rx">
      <ApothecaryHeader showLogout portalLabel="Log out" />
      <main id="content" className="rx-main">
        {children}
      </main>
      <ApothecaryFooter />
    </div>
  );
}
