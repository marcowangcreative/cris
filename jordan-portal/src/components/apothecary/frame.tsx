import type { ReactNode } from "react";

function Notch({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true">
      <path
        d="M35 2 H18 Q14 14 2 18 V35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M35 7 H20 Q16 16 7 20 V35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
    </svg>
  );
}

export function LabelFrame({
  children,
  className = "",
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <div className={`rx-frame ${tight ? "rx-frame-tight" : ""} ${className}`}>
      <Notch className="rx-notch rx-notch-tl" />
      <Notch className="rx-notch rx-notch-tr" />
      <Notch className="rx-notch rx-notch-bl" />
      <Notch className="rx-notch rx-notch-br" />
      <span className="rx-rule rx-rule-x rx-rule-top" />
      <span className="rx-rule rx-rule-x rx-rule-top-in" />
      <span className="rx-rule rx-rule-x rx-rule-bottom" />
      <span className="rx-rule rx-rule-x rx-rule-bottom-in" />
      <span className="rx-rule rx-rule-y rx-rule-left" />
      <span className="rx-rule rx-rule-y rx-rule-left-in" />
      <span className="rx-rule rx-rule-y rx-rule-right" />
      <span className="rx-rule rx-rule-y rx-rule-right-in" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Ornament() {
  return (
    <svg className="rx-ornament" viewBox="0 0 140 16" aria-hidden="true">
      <line x1="0" y1="8" x2="58" y2="8" stroke="currentColor" strokeWidth="1" />
      <path d="M70 8 L74 3.2 L78 8 L74 12.8 Z" fill="currentColor" />
      <line x1="82" y1="8" x2="140" y2="8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// Placeholder photographs. Swap for pictures of Jordan. Credits: IMAGE_CREDITS.md.
const specimens = {
  hero: {
    src: "/images/hero",
    alt: "Brunette hair lifted against a plain wall, gray sweater, soft light",
    caption: "No. 01 — Brunette, soft light",
  },
  blonding: {
    src: "/images/blonding",
    alt: "Back view of long balayage hair",
    caption: "No. 02 — Blonding",
  },
  bridal: {
    src: "/images/bridal",
    alt: "Bridal updo with a pearl hair vine",
    caption: "No. 03 — Bridal updo",
  },
  salon: {
    src: "/images/salon",
    alt: "Stylist blow-drying a client in a bright salon",
    caption: "No. 04 — The room",
  },
  before: {
    src: "/images/before",
    alt: "Close-up of brunette waves",
    caption: "Before",
  },
  after: {
    src: "/images/after",
    alt: "Close-up of glossy straight hair",
    caption: "After",
  },
  gown: {
    src: "/images/gown",
    alt: "Bridal hair falling down the back of a pale gown",
    caption: "No. 05 — Bridal hair",
  },
} as const;

export type SpecimenName = keyof typeof specimens;

export function Specimen({
  name,
  className = "",
}: {
  name: SpecimenName;
  className?: string;
}) {
  const photo = specimens[name];
  return (
    <figure className={`rx-specimen ${className}`}>
      <LabelFrame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${photo.src}-1600.webp`}
          srcSet={`${photo.src}-800.webp 800w, ${photo.src}-1600.webp 1600w`}
          sizes="(min-width: 768px) 36rem, 100vw"
          alt={photo.alt}
        />
      </LabelFrame>
      <figcaption className="rx-jost">{photo.caption}</figcaption>
    </figure>
  );
}
