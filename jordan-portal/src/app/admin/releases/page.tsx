import { DateTime } from "luxon";
import { Kicker, Pill, SubmitButton } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/content";
import { evaluateReleaseDates } from "@/lib/domain/availability";
import { readDemoDb } from "@/lib/demo/store";
import { monthLabel, suggestedReleaseInstant, formatChicago } from "@/lib/domain/time";
import { createBatchAction, publishBatchAction } from "@/server/actions";

export const metadata = { title: "Releases" };

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const query = await searchParams;
  const db = readDemoDb();
  const now = DateTime.now();
  return (
    <div className="space-y-12">
      <header>
        <Kicker>Release batches</Kicker>
        <h1 className="mt-2 font-serif text-5xl">Open a month by hand</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
          Default rule, still awaiting owner approval: the 1st opens the month two
          months ahead. February 1 would open April. Publishing does not move or
          cancel existing bookings.
        </p>
        {query.error ? <p className="mt-4 text-sm text-bad">{query.error}</p> : null}
        {query.saved ? <p className="mt-4 text-sm text-good">Saved.</p> : null}
      </header>
      {db.release_batches.map((batch) => {
        const dates = evaluateReleaseDates(db, batch.id, now);
        const suggested = suggestedReleaseInstant(batch.target_year, batch.target_month);
        return (
          <section key={batch.id} className="engraved bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-3xl">
                {monthLabel(batch.target_year, batch.target_month)}
              </h2>
              <Pill tone={batch.status === "published" ? "good" : "warn"}>{batch.status}</Pill>
            </div>
            <p className="mt-2 text-sm text-stone">
              Weekdays: {batch.weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ")}.
              Suggested release {formatChicago(suggested.toISO() ?? "")}.
              {batch.published_at ? ` Published ${formatChicago(batch.published_at)}.` : " Not published."}
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dates.map((date) => (
                <li
                  key={date.date}
                  className={`date-chip text-sm ${date.available ? "date-chip-open" : "date-chip-held"}`}
                >
                  <span className="block">{date.date}</span>
                  <span className="text-stone">{date.detail}</span>
                </li>
              ))}
            </ul>
            {batch.status === "draft" ? (
              <form action={publishBatchAction} className="mt-6 space-y-3 text-sm">
                <input type="hidden" name="batchId" value={batch.id} />
                <p className="font-serif text-2xl">Pre-publish checklist</p>
                <Check name="weddings" label="Wedding commitments in this month are reconciled." />
                <Check name="travel" label="Travel blocks are reviewed." />
                <Check name="personal" label="Personal blocks are reviewed." />
                <Check name="existing" label="Existing bookings stay as they are. Publishing will not change them." />
                <SubmitButton>Publish this month</SubmitButton>
              </form>
            ) : null}
          </section>
        );
      })}
      <form action={createBatchAction} className="invite-card p-6">
        <h2 className="font-serif text-3xl">New draft</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Year</span>
            <input name="year" type="number" defaultValue={2027} required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Month</span>
            <input name="month" type="number" min={1} max={12} defaultValue={4} required />
          </label>
        </div>
        <fieldset className="mt-4 flex flex-wrap gap-4 text-sm">
          <legend className="mb-2 text-xs uppercase tracking-[0.16em] text-stone">
            Exactly three weekdays
          </legend>
          {WEEKDAY_LABELS.slice(1).map((label, index) => (
            <label key={label} className="flex items-center gap-2">
              <input type="checkbox" name="weekday" value={index + 1} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <SubmitButton>Create draft</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} />
      <span>{label}</span>
    </label>
  );
}
