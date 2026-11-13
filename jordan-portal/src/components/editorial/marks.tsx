import type { CSSProperties } from "react";

export function Star({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M20 3 L23 15 L36 16 L26 24 L29 37 L20 30 L11 37 L14 24 L4 16 L17 15 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Cross({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 36 36" aria-hidden="true">
      <path d="M6 7 L30 30 M30 6 L6 31" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Arrow({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 36" aria-hidden="true">
      <path d="M4 20 C 24 8, 46 28, 68 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M58 10 L70 16 L60 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DashedFigure() {
  return (
    <svg className="zine-dash" viewBox="0 0 100 150" aria-hidden="true">
      <path
        d="M28 14 C 40 6, 62 8, 74 20 C 90 36, 88 70, 80 96 C 72 124, 48 142, 30 132 C 10 120, 8 78, 16 48 C 20 30, 18 20, 28 14"
        fill="none"
        stroke="#4a0e14"
        strokeWidth="1.4"
        strokeDasharray="3.2 2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
