import Link from "next/link";
import { LabelFrame } from "@/components/apothecary/frame";
import { readDemoDb } from "@/lib/demo/store";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/server/session";

export const metadata = { title: "Photographs" };

export default async function ApothecaryPhotos({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/apothecary/login");
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id && item.client_id === actor.clientId);
  if (!project) notFound();
  const assets = db.assets.filter((item) => item.project_id === project.id);
  return (
    <div>
      <p className="rx-jost rx-center">Specimens</p>
      <h1 className="rx-display rx-center" style={{ marginTop: "0.4rem" }}>
        Current hair and inspiration
      </h1>
      <ul id="photos" className="rx-grid rx-grid-2" style={{ marginTop: "1.75rem" }}>
        {assets.map((asset, index) => (
          <li key={asset.id}>
            <figure className="rx-specimen">
              <LabelFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/assets/${asset.id}`}
                  alt={asset.kind === "current_hair" ? "Current hair" : "Inspiration"}
                />
              </LabelFrame>
              <figcaption className="rx-jost">
                No. {String(index + 1).padStart(2, "0")} — {asset.kind.replaceAll("_", " ")}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {assets.length === 0 ? (
        <p className="rx-center rx-muted" style={{ marginTop: "1rem" }}>
          No photographs on this record yet.
        </p>
      ) : null}
      <p className="rx-center rx-jost" style={{ marginTop: "1.5rem" }}>
        <Link href="/apothecary/portal">Back to the card</Link>
      </p>
    </div>
  );
}
