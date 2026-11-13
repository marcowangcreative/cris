import Link from "next/link";
import { Kicker, Pill } from "@/components/ui";
import { nextAction } from "@/lib/domain/access";
import { readDemoDb } from "@/lib/demo/store";
import { requireClient } from "@/server/session";

export const metadata = { title: "Your portal" };

export default async function PortalHome() {
  const session = await requireClient();
  const db = readDemoDb();
  const projects = db.projects.filter((item) => item.client_id === session.clientId);
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-6">
      <Kicker>Your projects</Kicker>
      <h1 className="mt-3 font-serif text-5xl">What is next</h1>
      <ul className="mt-10 space-y-4">
        {projects.map((project) => {
          const next = nextAction(db, project.id);
          return (
            <li key={project.id} className="border border-line bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <Pill>{project.kind === "wedding" ? "Wedding" : "Transformation"}</Pill>
                <span className="text-xs uppercase tracking-[0.16em] text-stone">
                  {project.status.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="mt-4 font-serif text-3xl">{next.title}</h2>
              <p className="mt-2 leading-7 text-ink-soft">{next.detail}</p>
              <Link href={next.href} className="mt-4 inline-block text-sm text-wine hover:underline">
                Open the project
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
