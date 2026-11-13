import Link from "next/link";
import { DateTime } from "luxon";
import { attentionItems, upcomingSchedule } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Desk" };

export default async function ApothecaryAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const db = readDemoDb();
  const now = DateTime.now();
  const attention = attentionItems(db);
  const schedule = upcomingSchedule(db, now);
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? attention.filter(
        (item) =>
          item.clientName.toLowerCase().includes(needle) ||
          item.label.toLowerCase().includes(needle),
      )
    : attention;
  return (
    <div>
      <header className="rx-center">
        <p className="rx-jost">Desk</p>
        <h1 className="rx-display" style={{ marginTop: "0.4rem" }}>
          The weeks ahead
        </h1>
      </header>
      <form className="rx-signup" action="/apothecary/admin">
        <label className="rx-jost" htmlFor="desk-q">
          Search
        </label>
        <input id="desk-q" name="q" defaultValue={query} placeholder="A name" />
        <button className="rx-button" type="submit">
          Search
        </button>
      </form>
      <section style={{ marginTop: "2rem" }}>
        <h2 className="rx-title rx-center">Needs attention</h2>
        <ul className="rx-catalogue">
          {rows.slice(0, 8).map((item) => (
            <li className="rx-line" key={`${item.projectId}-${item.label}`}>
              <Link href={toDesk(item.href)}>
                <span className="rx-jost">{item.clientName}</span>
                <span style={{ display: "block" }}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ marginTop: "2.25rem" }}>
        <h2 className="rx-title rx-center">Upcoming</h2>
        <ul className="rx-catalogue">
          {schedule.slice(0, 8).map((row) => (
            <li className="rx-line" key={`${row.kind}-${row.at}-${row.who}`}>
              <div>
                <span className="rx-jost">{row.kind}</span>
                <span style={{ display: "block" }}>{row.who}</span>
                <span className="rx-muted" style={{ display: "block", fontSize: "1rem" }}>
                  {row.label}
                </span>
              </div>
              <span className={row.status === "confirmed" ? "" : "rx-muted"}>{row.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function toDesk(href: string): string {
  if (href.startsWith("/admin/projects/")) {
    return href.replace("/admin/projects/", "/apothecary/admin/projects/");
  }
  return "/apothecary/admin";
}
