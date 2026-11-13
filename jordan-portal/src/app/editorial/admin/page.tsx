import Link from "next/link";
import { DateTime } from "luxon";
import { attentionItems, upcomingSchedule } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";

export const metadata = { title: "Desk" };

export default async function EditorialAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim().toLowerCase();
  const db = readDemoDb();
  const attention = attentionItems(db).filter(
    (item) =>
      !query ||
      item.clientName.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query),
  );
  const schedule = upcomingSchedule(db, DateTime.now());
  return (
    <div className="zine-quiet">
      <p className="zine-star">desk</p>
      <p className="zine-kicker">Studio</p>
      <h1 style={{ margin: "0.25rem 0 0" }}>The weeks ahead</h1>
      <form action="/editorial/admin" style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <label className="zine-kicker" htmlFor="desk-q">
          Search
        </label>
        <input id="desk-q" name="q" defaultValue={query} placeholder="A name" />
        <button className="zine-button" type="submit">
          Search
        </button>
      </form>
      <h2 style={{ marginTop: "1.6rem" }}>Needs attention</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {attention.slice(0, 8).map((item) => (
          <li className="zine-row" key={`${item.projectId}-${item.label}`}>
            <Link href={item.href.replace("/admin/projects/", "/editorial/admin/projects/")}>
              <span className="zine-kicker">{item.clientName}</span>
              <span style={{ display: "block" }}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 style={{ marginTop: "1.6rem" }}>Upcoming</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {schedule.slice(0, 8).map((row) => (
          <li className="zine-row" key={`${row.kind}-${row.at}-${row.who}`}>
            <div>
              <span className="zine-kicker">{row.kind}</span>
              <span style={{ display: "block" }}>{row.who}</span>
              <span style={{ display: "block", color: "#6d6860" }}>{row.label}</span>
            </div>
            <span>{row.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
