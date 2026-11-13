import Link from "next/link";
import { notFound } from "next/navigation";
import { Kicker } from "@/components/ui";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Client" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = readDemoDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) notFound();
  const projects = db.projects.filter((item) => item.client_id === client.id);
  return (
    <div>
      <Kicker>Client</Kicker>
      <h1 className="mt-2 font-serif text-5xl">{client.full_name}</h1>
      <p className="mt-2 text-ink-soft">
        {client.email}
        {client.phone ? ` · ${client.phone}` : ""}
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center justify-between py-3">
            <span>
              {project.kind} · {project.status.replaceAll("_", " ")}
            </span>
            <Link href={`/admin/projects/${project.id}`} className="text-sm text-wine">
              Open project
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
