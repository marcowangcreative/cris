const strokes: Array<{ d: string; width: number }> = [
  { width: 31, d: "M150 62 Q176 44 160 86 Q146 132 162 176 Q176 220 148 252 Q116 286 72 278 Q40 270 46 242 Q54 216 88 222" },
  { width: 27, d: "M230 176 Q214 112 268 74 Q328 32 392 70 Q456 108 440 174 Q424 244 346 258 Q262 274 222 214 Q196 168 238 124 Q262 98 304 104" },
  { width: 28, d: "M500 268 Q492 198 506 132 Q516 74 500 40" },
  { width: 24, d: "M506 74 Q572 34 628 74 Q674 110 636 158 Q598 196 528 168" },
  { width: 22, d: "M556 160 Q612 198 658 230 Q696 256 728 286" },
  { width: 29, d: "M790 48 Q776 118 788 186 Q798 246 774 282" },
  { width: 25, d: "M788 70 Q886 28 962 86 Q1024 140 972 206 Q924 266 812 242 Q768 228 782 188" },
  { width: 24, d: "M1068 286 Q1098 186 1136 86 Q1148 48 1164 34" },
  { width: 23, d: "M1152 52 Q1198 150 1246 240 Q1260 272 1274 292" },
  { width: 18, d: "M1104 176 Q1152 158 1196 180" },
  { width: 27, d: "M1324 284 Q1334 190 1320 108 Q1312 52 1336 36" },
  { width: 24, d: "M1330 58 Q1388 130 1440 206 Q1462 242 1478 276" },
  { width: 22, d: "M1468 268 Q1482 176 1470 96 Q1464 52 1488 40" },
];

/** Hand-traced marker word. Strokes draw on once, unless motion is reduced. */
export function MarkerWordmark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1540 320" role="img" aria-label="Jordan">
      {strokes.map((stroke) => (
        <path key={stroke.d} d={stroke.d} strokeWidth={stroke.width} pathLength={1} />
      ))}
    </svg>
  );
}
