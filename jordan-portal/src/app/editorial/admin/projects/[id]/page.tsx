import Link from "next/link";
import { notFound } from "next/navigation";
import { clientName } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Project" };

export default async function EditorialAdminProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id);
  if (!project) notFound();
  return (
    <div className="zine-quiet">
      <p className="zine-kicker">{project.kind}</p>
      <h1 style={{ marginTop: "0.3rem" }}>{clientName(db, project.client_id)}</h1>
      <p>{project.status.replaceAll("_", " ")}</p>
      <p className="zine-kicker">
        <Link href="/editorial/admin">Back to the desk</Link>
      </p>
    </div>
  );
}
