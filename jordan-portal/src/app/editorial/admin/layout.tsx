import { redirect } from "next/navigation";
import { ZineFooter, ZineHeader } from "@/components/editorial/shell";
import { getActor } from "@/server/session";

export default async function EditorialAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") redirect("/editorial/login");
  return (
    <div className="zine">
      <div className="zine-sheet">
        <ZineHeader trailing="logout" />
        <main id="content">{children}</main>
        <ZineFooter />
      </div>
    </div>
  );
}
