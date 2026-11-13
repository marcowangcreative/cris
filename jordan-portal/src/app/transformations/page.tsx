import { DateTime } from "luxon";
import { Photo } from "@/components/collage";
import { ReleasePicker, type ReleaseCell } from "@/components/release-picker";
import { SiteFrame } from "@/components/site-frame";
import { Placeholder } from "@/components/ui";
import { evaluateReleaseDates } from "@/lib/domain/availability";
import { readDemoDb } from "@/lib/demo/store";
import { monthLabel } from "@/lib/domain/time";
import { publicCopy } from "@/lib/content";
import { getConfig } from "@/lib/rules";

export const metadata = { title: "Private Transformations" };

export default function TransformationsPage() {
  const calendly = getConfig().calendlyTransformationUrl;
  const db = readDemoDb();
  const batch =
    db.release_batches.find((item) => item.status === "published") ??
    db.release_batches[0];
  const evaluations = batch
    ? evaluateReleaseDates(db, batch.id, DateTime.now())
    : [];
  const cells = batch
    ? buildCells(batch.target_year, batch.target_month, evaluations)
    : [];
  const steps = [
    `Dates open in monthly batches. By default, the 1st opens the month two months ahead — February 1 opens April. The release day and time are still an owner decision. Publishing is manual for launch.`,
    `Every public start is 10:00 a.m. Central. One transformation client per day, on three weekdays you configure. The rest of that workday is protected.`,
    `Reserve with a ${publicCopy.deposit} deposit through Calendly. Stripe runs inside Calendly. The deposit applies toward the final total. This site never collects a card.`,
    `A virtual consultation is included after the deposit. No fee. The default length is 30 minutes. Zoom or Teams is not chosen yet.`,
    `You complete intake, share photos, and approve a written proposal. The minimum investment is ${publicCopy.minimum} for cut, color, and a finished style within the agreed scope.`,
    `The balance is collected in Boulevard at the end. The deposit is recorded there as an external payment, not as a discount.`,
  ];
  return (
    <SiteFrame>
      <article className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="grid items-end md:grid-cols-2">
          <div className="px-0 py-10 md:py-16 md:pr-12">
            <h1 className="text-[32px] leading-[1.15] tracking-[0.08em] md:text-[48px] md:tracking-[0.1em]">
              Private Transformations
            </h1>
            <p className="mt-6 max-w-md text-[14px] leading-[20px]">
              The minimum investment is {publicCopy.minimum}. That covers cut, color,
              and a finished style within the scope you approve. One client each day,
              starting at 10:00 a.m.
            </p>
          </div>
          <Photo label="Transformation photo" className="aspect-[4/5] md:aspect-auto md:min-h-[560px]" />
        </div>

        <ol className="mt-16 border-t border-line">
          {steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-6">
              <span className="text-[0.62rem] uppercase tracking-[0.18em] text-stone">0{index + 1}</span>
              <p className="text-sm font-light leading-6 text-ink-soft">{step}</p>
            </li>
          ))}
        </ol>

        {batch ? (
          <div className="mt-14">
            <ReleasePicker
              title={monthLabel(batch.target_year, batch.target_month)}
              cells={cells}
            />
          </div>
        ) : null}

        <div className="mt-12 max-w-3xl">
          <Placeholder>{publicCopy.bookingTerms}</Placeholder>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={calendly}
            className="btn"
          >
            Reserve a date
          </a>
          <p className="max-w-sm text-sm text-stone">
            Opens the configurable Calendly link. Payment is required there before
            a date is confirmed.
          </p>
        </div>
      </article>
    </SiteFrame>
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
