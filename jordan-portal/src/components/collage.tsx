export function Crest({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="#fffaf3" stroke="#143d2e" strokeWidth="1.4" />
      <circle cx="40" cy="40" r="30" fill="none" stroke="#7a1c3a" strokeWidth="0.8" />
      <path
        d="M40 16c2 8 8 12 8 20a8 8 0 1 1-16 0c0-8 6-12 8-20z"
        fill="#143d2e"
      />
      <path d="M28 48c6 8 18 8 24 0" fill="none" stroke="#e25b1a" strokeWidth="1.4" />
      <text
        x="40"
        y="66"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="9"
        fill="#143d2e"
      >
        JW
      </text>
    </svg>
  );
}

export function Botanical({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 360" className={className} aria-hidden="true">
      <rect width="280" height="360" fill="#f6f0e4" />
      <g fill="none" stroke="#1a1612" strokeWidth="1.4">
        <path d="M140 330 V120" />
        <path d="M140 250 C90 230 70 180 88 140" />
        <path d="M140 210 C190 190 214 150 196 112" />
        <path d="M140 170 C100 150 86 110 110 86" />
        <ellipse cx="78" cy="132" rx="28" ry="16" transform="rotate(-30 78 132)" />
        <ellipse cx="108" cy="78" rx="22" ry="12" transform="rotate(-20 108 78)" />
        <ellipse cx="206" cy="108" rx="30" ry="16" transform="rotate(24 206 108)" />
        <circle cx="140" cy="78" r="34" />
        <circle cx="140" cy="78" r="18" />
        <path d="M140 44c6 10 6 18 0 28c-6-10-6-18 0-28z" />
        <path d="M118 70c14 4 18 14 22 22" />
        <path d="M162 70c-14 4-18 14-22 22" />
        <circle cx="196" cy="168" r="16" />
        <path d="M184 160c8 10 16 12 24 8" />
        <path d="M60 210c20-8 28 10 18 22c-16 4-28-6-18-22z" />
        <path d="M48 248h36M54 256h24" strokeWidth="0.8" />
        <path d="M140 300c-18 8-24 22-16 30" />
        <path d="M140 290c16 10 22 24 12 34" />
        <ellipse cx="112" cy="300" rx="18" ry="8" transform="rotate(-18 112 300)" />
        <ellipse cx="168" cy="308" rx="20" ry="9" transform="rotate(16 168 308)" />
        <path d="M150 96c18 8 26 4 34-8" />
        <path d="M128 100c-16 6-24 2-30-10" />
      </g>
      <g fill="#143d2e" opacity="0.9">
        <circle cx="140" cy="78" r="6" />
        <circle cx="196" cy="168" r="4" />
      </g>
    </svg>
  );
}

export function Squiggle({ className = "h-6 w-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 24" className={className} aria-hidden="true">
      <path
        d="M2 14c10-12 18 12 28 0s18 12 28 0 18 12 28 0 16 8 32-2"
        fill="none"
        stroke="#1a1612"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
    <Tag className={`font-serif font-semibold uppercase leading-[0.84] tracking-[-0.03em] ${className}`}>
      Jordan Wang <span aria-hidden="true">{"//"}</span>
    </Tag>
  );
}

export function BottleSticker() {
  return (
    <div className="sticker w-28 rounded-[1.6rem] border-2 border-ink bg-card px-3 py-4 text-center">
      <p className="font-serif text-sm leading-tight">Studio</p>
      <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-garden">
        Houston
      </p>
    </div>
  );
}

export function HouseSticker() {
  return (
    <div className="sticker w-36 border-2 border-ink bg-blush px-3 pb-3 pt-2 text-center">
      <svg viewBox="0 0 80 28" className="mx-auto h-7 w-16" aria-hidden="true">
        <path d="M4 26 L40 4 L76 26" fill="none" stroke="#1a1612" strokeWidth="2" />
      </svg>
      <p className="font-serif text-sm leading-tight">Private days</p>
      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em]">10:00 a.m.</p>
    </div>
  );
}

export function BubbleSticker() {
  return (
    <div className="sticker relative rounded-full border-2 border-ink bg-butter px-4 py-3 text-center">
      <p className="text-[0.62rem] uppercase tracking-[0.18em]">For the day</p>
      <p className="font-serif text-lg leading-none">One client</p>
    </div>
  );
}

export function EnvelopeSticker() {
  return (
    <div className="sticker w-36 border-2 border-ink bg-card px-3 py-4 text-center">
      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-wine">Inquire</p>
      <p className="mt-1 font-script text-2xl text-garden">with care</p>
    </div>
  );
}
