export function Crest({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="none" stroke="#1b3f34" strokeWidth="0.6" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#7a4550" strokeWidth="0.4" />
      <path
        d="M32 16c1.2 6 6 9 6 15a6 6 0 1 1-12 0c0-6 4.8-9 6-15z"
        fill="none"
        stroke="#1b3f34"
        strokeWidth="0.7"
      />
      <text
        x="32"
        y="50"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="8"
        fill="#1b3f34"
        letterSpacing="1"
      >
        JW
      </text>
    </svg>
  );
}

export function Botanical({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 420" className={className} aria-hidden="true">
      <rect width="320" height="420" fill="#e6eee8" />
      <g fill="none" stroke="#1b3f34" strokeWidth="0.7">
        <path d="M160 392 V168" />
        <path d="M160 300c-36-8-62-36-48-62 22 8 40 28 48 62z" />
        <path d="M160 248c34-6 64-30 52-58-24 6-42 28-52 58z" />
        <path d="M160 210c-28-4-48-24-40-46 18 6 32 22 40 46z" />
        <circle cx="160" cy="118" r="46" />
        <circle cx="160" cy="118" r="30" />
        <circle cx="160" cy="118" r="14" />
        <path d="M160 72c8 14 8 24 0 36-8-12-8-22 0-36z" />
        <path d="M114 118c14 8 24 8 36 0-10-6-20-6-36 0z" />
        <path d="M206 118c-14 8-24 8-36 0 10-6 20-6 36 0z" />
        <path d="M160 164c8-14 8-24 0-36-8 12-8 22 0 36z" />
      </g>
    </svg>
  );
}

export function Portrait({
  label = "Portrait of Jordan here",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <figure className={`relative border border-line ${className}`}>
      <Botanical className="aspect-[4/5] h-auto w-full" />
      <figcaption className="absolute bottom-0 left-0 right-0 border-t border-line bg-paper/90 px-4 py-3 text-[0.62rem] uppercase tracking-[0.22em] text-garden">
        {label}
      </figcaption>
    </figure>
  );
}

export function Wordmark({
  as: Tag = "span",
  className = "",
}: {
  as?: "span" | "h1" | "p";
  className?: string;
}) {
  return (
    <Tag className={`font-serif font-normal tracking-tight ${className}`}>
      Jordan Wang
    </Tag>
  );
}
