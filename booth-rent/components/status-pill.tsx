const TONES: Record<string, string> = {
  sent: "border-ink text-ink",
  processing: "border-brass text-brass",
  paid: "border-green text-green",
  failed: "border-clay text-clay",
  void: "border-line text-ink-soft",
  draft: "border-line text-ink-soft",
  overdue: "border-clay bg-clay text-paper",
  cap: "border-brass text-brass",
  minimum: "border-green text-green-deep",
  retry: "border-clay text-clay",
  skip: "border-line text-ink-soft",
};

export function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center border px-1.5 py-0.5 text-[0.7rem] uppercase tracking-[0.12em] ${TONES[tone] ?? TONES.draft}`}>
      {children}
    </span>
  );
}
