import Link from "next/link";
import { Pill } from "@/components/ui";
import { nextAction } from "@/lib/domain/access";
import { readDemoDb } from "@/lib/demo/store";
import { requireClient } from "@/server/session";

export const metadata = { title: "Your portal" };

export default async function PortalHome() {
  const session = await requireClient();
  const db = readDemoDb();
  const client = db.clients.find((item) => item.id === session.clientId);
  const projects = db.projects.filter((item) => item.client_id === session.clientId);
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-4">
      <div>
        <p className="text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">Private client record</p>
        <h1 className="mt-3 text-[24px] tracking-[0.04em]">
          {client ? client.full_name : "Client"}
        </h1>
      </div>
      <ul className="mt-10 space-y-5">
        {projects.map((project) => {
          const next = nextAction(db, project.id);
          return (
            <li key={project.id} className="invite-card p-6 md:p-8">
              <div className="flex items-center justify-between gap-3">
                <Pill>{project.kind === "wedding" ? "Wedding" : "Transformation"}</Pill>
                <span className="text-[0.68rem] uppercase tracking-[0.16em] text-stone">
                  {project.status.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-4xl leading-tight">{next.title}</h2>
              <p className="mt-3 max-w-xl leading-7 text-ink-soft">{next.detail}</p>
              <Link
                href={next.href}
                className="mt-5 inline-block text-[0.68rem] uppercase tracking-[0.18em] text-wine"
              >
                Open the project
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
