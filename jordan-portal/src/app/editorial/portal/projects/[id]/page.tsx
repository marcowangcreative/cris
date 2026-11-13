import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readDemoDb } from "@/lib/demo/store";
import { getActor } from "@/server/session";

export const metadata = { title: "Photographs" };

export default async function EditorialPhotos({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/editorial/login");
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id && item.client_id === actor.clientId);
  if (!project) notFound();
  const assets = db.assets.filter((item) => item.project_id === project.id);
  return (
    <div>
      <p className="zine-kicker">Specimens</p>
      <h1 style={{ marginTop: "0.3rem" }}>Current hair</h1>
      <ul className="zine-grid" style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
        {assets.map((asset) => (
          <li key={asset.id} className="zine-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/assets/${asset.id}`}
              alt={asset.kind === "current_hair" ? "Current hair" : "Inspiration"}
            />
          </li>
        ))}
      </ul>
      {assets.length === 0 ? <p>No photographs on this record yet.</p> : null}
      <p className="zine-kicker" style={{ marginTop: "1rem" }}>
        <Link href="/editorial/portal">Back to the record</Link>
      </p>
    </div>
  );
}
