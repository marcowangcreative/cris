import Link from "next/link";
import { MaisonFrame } from "@/components/maison/shell";

export const metadata = { title: "Maison" };

const band = "Private light  ·  One client  ·  The whole day  ·  Houston  ·  ";
const stills = [
  ["/images/waves-1600.webp", "Waves, in soft light"],
  ["/images/blonde-1600.webp", "A long blonde length"],
  ["/images/braid-1600.webp", "A glossy braid"],
  ["/images/after-1600.webp", "Straight, after"],
  ["/images/before-1600.webp", "Waves, before"],
  ["/images/blonding-1600.webp", "Lived-in blonde"],
] as const;

export default function MaisonHome() {
  return (
    <MaisonFrame>
      <section className="maison-open">
        <figure className="maison-portrait">
          {/* Placeholder photograph. Swap for a picture of Jordan. Credits: IMAGE_CREDITS.md. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-1600.webp" alt="Brunette hair lifted in warm light" />
          <p className="maison-initials">jw</p>
        </figure>
        <p className="maison-caption">One client. The whole day. Houston.</p>
      </section>
      <section className="maison-bleed" aria-label="Jordan">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/salon-1600.webp" alt="Hair being finished in a bright room" />
        <h1>Jordan</h1>
      </section>
      <section className="maison-quiet">
        <p className="maison-kicker">The house</p>
        <h2>A quiet room, and the whole afternoon.</h2>
        <p>
          Private transformations are reserved one at a time, beginning at 10:00 a.m.
          Central. Nothing else is booked into that day.
        </p>
      </section>
      <section className="maison-pin" aria-label="Lustre">
        <div className="maison-pin-sticky">
          <p className="maison-word">lustre</p>
          <p className="maison-word">lustre</p>
          <p className="maison-word">lustre</p>
        </div>
      </section>
      <div className="maison-band" aria-hidden="true">
        <div className="maison-band-track">
          <span>{band.repeat(4)}</span>
          <span>{band.repeat(4)}</span>
        </div>
      </div>
      <section className="maison-film" aria-label="Hair studies">
        <div className="maison-film-track">
          {[...stills, ...stills].map(([src, alt], index) => (
            <figure key={`${src}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} />
              <figcaption className="maison-kicker">{alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="maison-close">
        <p className="maison-kicker">January</p>
        <h2>The dates, held in light.</h2>
        <p>
          <Link href="/maison/transformations">See the open days</Link>
        </p>
        <p className="maison-kicker">
          <Link href="/maison/weddings">Weddings & Bridal — inquire</Link>
        </p>
      </section>
    </MaisonFrame>
  );
}
