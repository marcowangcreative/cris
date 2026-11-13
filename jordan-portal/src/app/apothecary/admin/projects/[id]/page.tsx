import Link from "next/link";
import { notFound } from "next/navigation";
import { clientName } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Project" };

export default async function ApothecaryAdminProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id);
  if (!project) notFound();
  return (
    <div className="rx-center">
      <p className="rx-jost">{project.kind}</p>
      <h1 className="rx-display" style={{ marginTop: "0.4rem" }}>
        {clientName(db, project.client_id)}
      </h1>
      <p className="rx-italic" style={{ marginTop: "0.8rem" }}>
        {project.status.replaceAll("_", " ")}
      </p>
      <p className="rx-jost" style={{ marginTop: "1.5rem" }}>
        <Link href="/apothecary/admin">Back to the desk</Link>
      </p>
    </div>
  );
}
