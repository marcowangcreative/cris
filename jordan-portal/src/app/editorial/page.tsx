import Link from "next/link";
import { Arrow, Cross, DashedFigure, Star } from "@/components/editorial/marks";
import { ZineFrame } from "@/components/editorial/shell";
import { MarkerWordmark } from "@/components/editorial/wordmark";

export const metadata = { title: "Editorial" };

export default function EditorialHome() {
  return (
    <ZineFrame>
      <div className="zine-grid">
        <figure className="zine-card zine-card-tall">
          {/* Placeholder photographs. Swap for pictures of Jordan. Credits: IMAGE_CREDITS.md. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-1600.webp" alt="Brunette hair lifted in soft light" style={{ objectPosition: "50% 30%" }} />
          <DashedFigure />
          <Star className="zine-mark" style={{ top: "8%", right: "8%", width: "1.6rem" }} />
        </figure>
        <div className="zine-block zine-block-cobalt">
          <p className="zine-kicker">One client<br />a day</p>
        </div>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/blonding-1600.webp" alt="Long balayage, dark root to blonde" style={{ objectPosition: "50% 20%" }} />
          <p className="zine-note" style={{ top: "12%", left: "8%", transform: "rotate(-12deg)" }}>
            blonding
          </p>
        </figure>
        <div className="zine-block zine-block-tomato">
          <p className="zine-kicker">10:00 a.m.<br />Central</p>
        </div>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/salon-1600.webp" alt="Blow-dry in a bright salon" />
          <Cross className="zine-mark" style={{ top: "10%", left: "8%", width: "1.4rem", color: "#d7261e" }} />
        </figure>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/braid-1600.webp" alt="Glossy braid" style={{ objectPosition: "60% 40%" }} />
        </figure>
        <div className="zine-block zine-block-marigold">
          <p className="zine-kicker">Houston<br />studio</p>
          <Arrow className="zine-mark" style={{ top: "18%", right: "8%", width: "4rem", color: "#161513" }} />
        </div>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/blonde-1600.webp" alt="Long glossy blonde hair" style={{ objectPosition: "70% 40%" }} />
          <Star className="zine-mark" style={{ bottom: "12%", left: "8%", width: "1.3rem", color: "#d7261e" }} />
        </figure>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/after-1600.webp" alt="Close-up of glossy straight hair" style={{ objectPosition: "50% 40%" }} />
        </figure>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/waves-1600.webp" alt="Long waves on linen" style={{ objectPosition: "50% 60%" }} />
        </figure>
        <figure className="zine-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/before-1600.webp" alt="Close-up of brunette waves" style={{ objectPosition: "50% 30%" }} />
          <p className="zine-note" style={{ right: "6%", bottom: "14%", transform: "rotate(8deg)" }}>
            gloss
          </p>
        </figure>
        <div className="zine-block zine-block-pink">
          <p className="zine-kicker">The whole<br />day</p>
        </div>
        <MarkerWordmark className="zine-script" />
      </div>
      <div className="zine-columns">
        <p className="zine-kicker">JW SS/27</p>
        <p>Private transformations, reserved one client at a time.</p>
        <p className="zine-kicker">
          <Link href="/editorial/weddings">Weddings & Bridal — inquire</Link>
          <br />
          Houston, TX
          <br />
          <Link href="/editorial/transformations">The drop</Link>
        </p>
      </div>
    </ZineFrame>
  );
}
