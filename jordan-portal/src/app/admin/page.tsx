import Link from "next/link";
import { DateTime } from "luxon";
import { Kicker, Pill } from "@/components/ui";
import { attentionItems, searchStudio, upcomingSchedule } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Studio" };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const db = readDemoDb();
  const now = DateTime.now();
  const schedule = upcomingSchedule(db, now);
  const attention = attentionItems(db);
  const found = searchStudio(db, query);
  return (
    <div className="space-y-12">
      <header>
        <Kicker>Schedule</Kicker>
        <h1 className="mt-2 font-serif text-5xl">The weeks ahead</h1>
      </header>
      <form className="flex flex-wrap gap-3" action="/admin">
        <label className="min-w-64 flex-1 text-sm">
          <span className="sr-only">Search clients and projects</span>
          <input name="q" defaultValue={query} placeholder="Search a name, email, or Stripe reference" />
        </label>
        <button type="submit" className="bg-ink px-5 py-3 text-sm text-paper">
          Search
        </button>
      </form>
      {query ? (
        <section>
          <h2 className="font-serif text-3xl">Matches</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {found.clients.map((client) => (
              <li key={client.id} className="flex items-center justify-between py-3">
                <span>
                  {client.full_name}
                  <span className="ml-2 text-sm text-stone">{client.email}</span>
                </span>
                <Link href={`/admin/clients/${client.id}`} className="text-sm text-wine">
                  Open
                </Link>
              </li>
            ))}
            {found.projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {project.kind} · {project.status.replaceAll("_", " ")}
                </span>
                <Link href={`/admin/projects/${project.id}`} className="text-wine">
                  Project
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="font-serif text-3xl">Needs attention</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {attention.slice(0, 8).map((item) => (
            <li key={`${item.projectId}-${item.label}`}>
              <Link href={item.href} className="block border border-line bg-card px-4 py-3 hover:border-ink">
                <span className="text-sm text-stone">{item.clientName}</span>
                <span className="mt-1 block">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-3xl">Upcoming</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {schedule.map((row) => (
            <li key={`${row.kind}-${row.at}-${row.who}`} className="grid gap-2 py-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] md:items-center">
              <div>
                <p className="text-sm text-stone">{row.label}</p>
                <p className="font-serif text-2xl">{row.who}</p>
              </div>
              <p>{row.kind}</p>
              <Pill tone={row.status === "confirmed" ? "good" : row.status.includes("pending") ? "bad" : "warn"}>
                {row.status}
              </Pill>
              <Link href={row.href} className="text-sm text-wine">
                Open
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
