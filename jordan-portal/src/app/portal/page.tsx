import Link from "next/link";
import { Crest } from "@/components/collage";
import { Kicker, Pill } from "@/components/ui";
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <Kicker>Your projects</Kicker>
          <h1 className="mt-2 font-serif text-6xl leading-[0.9]">
            {client ? client.full_name.split(" ")[0] : "Hello"}, you are expected.
          </h1>
          <p className="font-script text-4xl text-wine">a private studio note</p>
        </div>
        <Crest className="hidden h-20 w-20 sm:block" />
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
