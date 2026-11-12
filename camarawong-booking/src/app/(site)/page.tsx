import Link from "next/link";
import { studio } from "@/lib/config";
import { formatDuration, formatMoney } from "@/lib/format";

const steps = [
  ["01", "Choose", "Pick the station or a collection. Add an hour if the corporate set needs to stay up."],
  ["02", "Hold a date", "Open days and start times come from the studio book. A hold lasts twenty minutes."],
  ["03", "Sign and pay", "A short agreement, your name, and the amount due today. The date is not reserved until both are done."],
  ["04", "We arrive", "Load-in notes are on the booking. Portraits go to the gallery email as a QR code."],
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Houston · On-site portraits</p>
          <h1>Book the station.</h1>
        </div>
        <p className="lede">
          A photographer, studio light, and a quiet setup, brought to the party. Guests leave with the pictures on their phones. You do not spend a week on email.
        </p>
      </section>

      <section className="menu" id="collections" aria-labelledby="collections-title">
        <div className="menu-head">
          <h2 id="collections-title">Collections</h2>
          <p>
            The corporate station is the one built to be finished online. Digital, Printed, and Custom can be booked the same way when you already know — or you can write first.
          </p>
        </div>
        {studio.packages.map((pkg, index) => (
          <article className="collection" key={pkg.id}>
            <p className="index">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h3>{pkg.name}</h3>
              <p>{pkg.summary}</p>
              <ul className="includes">
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="meta">
                {formatDuration(pkg.durationMinutes)}
                {" · "}
                {pkg.paymentMode === "full" ? "Paid in full" : `${studio.depositPercent}% to reserve`}
              </p>
              {pkg.addons.map((addon) => (
                <p className="addon-line" key={addon.id}>
                  {addon.name} {formatMoney(addon.priceCents)}
                  {addon.priceIsPlaceholder ? " · placeholder" : ""}
                </p>
              ))}
            </div>
            <div className="collection-buy">
              <p className="price">{formatMoney(pkg.priceCents)}</p>
              {pkg.priceIsPlaceholder ? <span className="flag">Placeholder</span> : null}
              <Link className="button" href={`/book/${pkg.id}`}>
                {pkg.bookLabel}
              </Link>
              <Link className="text-link" href={`/inquiry?package=${pkg.id}`}>
                {pkg.inquireLabel}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="steps" aria-labelledby="how-title">
        <h2 id="how-title">How a booking goes</h2>
        <div className="step-grid">
          {steps.map(([index, title, copy]) => (
            <article key={index}>
              <p className="eyebrow">{index}</p>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="note">
        <h2>Not a photo booth.</h2>
        <p className="lede">
          Nobody is posing for a novelty strip. The light is a studio light, a photographer is actually taking the picture, and the night comes back as a QR code.
        </p>
      </section>
    </main>
  );
}
