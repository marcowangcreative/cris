import { DateTime } from "luxon";
import { Catalogue } from "@/components/apothecary/catalogue";
import { Specimen } from "@/components/apothecary/frame";
import { Ledger } from "@/components/apothecary/ledger";
import { FirstAccessForm, ReleaseCountdown } from "@/components/apothecary/release-note";
import { ApothecaryFrame } from "@/components/apothecary/shell";
import type { ReleaseCell } from "@/components/release-picker";
import { evaluateReleaseDates } from "@/lib/domain/availability";
import { monthLabel, suggestedReleaseInstant } from "@/lib/domain/time";
import { readDemoDb } from "@/lib/demo/store";
import { publicCopy } from "@/lib/content";
import { getConfig } from "@/lib/rules";

export const metadata = { title: "The list" };

export default function ApothecaryTransformations() {
  const db = readDemoDb();
  const now = DateTime.now();
  const batch =
    db.release_batches.find((item) => item.status === "published") ??
    db.release_batches[0];
  const evaluations = batch ? evaluateReleaseDates(db, batch.id, now) : [];
  const cells = batch
    ? buildCells(batch.target_year, batch.target_month, evaluations)
    : [];
  const upcoming = db.release_batches
    .filter((item) => item.status !== "published")
    .map((item) => ({
      when: suggestedReleaseInstant(item.target_year, item.target_month),
      label: monthLabel(item.target_year, item.target_month),
    }))
    .filter((item) => item.when > now.setZone("America/Chicago"))
    .sort((a, b) => a.when.toMillis() - b.when.toMillis())[0];
  const calendly = getConfig().calendlyTransformationUrl;
  return (
    <ApothecaryFrame>
      <header className="rx-center">
        <p className="rx-jost">No. 01</p>
        <h1 className="rx-display" style={{ marginTop: "0.4rem" }}>
          Private transformations
        </h1>
        <p className="rx-body" style={{ marginTop: "1rem" }}>
          The minimum covers cut, color, and a finished style within the scope
          you approve. One client each day, starting at 10:00 a.m. Central. The
          deposit is paid through Calendly and applies toward the total.
        </p>
      </header>
      <section id="list">
        <Catalogue weddings={false} />
        <p className="rx-center rx-muted" style={{ marginTop: "0.8rem" }}>
          {publicCopy.bookingTerms}
        </p>
      </section>
      <section className="rx-grid rx-grid-2" style={{ marginTop: "2.5rem" }}>
        <Specimen name="before" />
        <Specimen name="after" />
      </section>
      {batch ? (
        <section id="ledger" style={{ marginTop: "2.75rem" }}>
          <h2 className="rx-title rx-center">Ledger</h2>
          <Ledger title={monthLabel(batch.target_year, batch.target_month)} cells={cells} />
        </section>
      ) : null}
      {upcoming ? (
        <section style={{ marginTop: "2.75rem" }}>
          <ReleaseCountdown
            target={upcoming.when.toISO() ?? ""}
            label={`${upcoming.label} opens ${upcoming.when.setZone("America/Chicago").toFormat("LLLL d")} at ${upcoming.when.setZone("America/Chicago").toFormat("h:mm a")} Central.`}
          />
          <div style={{ marginTop: "1.25rem" }}>
            <FirstAccessForm />
          </div>
        </section>
      ) : null}
      <p className="rx-center" style={{ marginTop: "2rem" }}>
        <a className="rx-button" href={calendly}>
          Reserve a date
        </a>
      </p>
    </ApothecaryFrame>
  );
}

function buildCells(
  year: number,
  month: number,
  evaluations: { date: string; available: boolean; detail: string }[],
): Array<ReleaseCell | null> {
  const start = DateTime.fromObject({ year, month, day: 1 }, { zone: "America/Chicago" });
  const byDate = new Map(evaluations.map((item) => [item.date, item]));
  const cells: Array<ReleaseCell | null> = [];
  for (let i = 1; i < start.weekday; i += 1) cells.push(null);
  const days = start.daysInMonth ?? 30;
  for (let day = 1; day <= days; day += 1) {
    const iso = start.set({ day }).toISODate() ?? "";
    const found = byDate.get(iso);
    cells.push({
      iso,
      day,
      inBatch: Boolean(found),
      available: found?.available ?? false,
      detail: found?.detail ?? "Outside this release.",
    });
  }
  return cells;
}
