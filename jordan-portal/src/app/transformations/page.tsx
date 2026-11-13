import { SiteFrame } from "@/components/site-frame";
import { Kicker, Placeholder } from "@/components/ui";
import { publicCopy } from "@/lib/content";
import { getConfig } from "@/lib/rules";

export const metadata = { title: "Private Transformations" };

export default function TransformationsPage() {
  const calendly = getConfig().calendlyTransformationUrl;
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
      <article className="mx-auto w-full max-w-3xl px-6 py-10">
        <Kicker>Private Transformations</Kicker>
        <h1 className="mt-4 font-serif text-5xl leading-tight md:text-6xl">
          One client. One day.
        </h1>
        <p className="mt-6 text-lg leading-8 text-ink-soft">
          The minimum investment is {publicCopy.minimum}. That covers cut, color,
          and a finished style within the scope you approve.
        </p>
        <ol className="mt-12 space-y-8">
          {steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[3rem_1fr] gap-4">
              <span className="font-serif text-2xl text-wine">0{index + 1}</span>
              <p className="leading-7 text-ink-soft">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <Placeholder>{publicCopy.bookingTerms}</Placeholder>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={calendly}
            className="inline-flex bg-ink px-5 py-3 text-sm tracking-wide text-paper hover:bg-wine"
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
