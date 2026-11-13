"use client";

import { useState } from "react";

export type ReleaseCell = {
  iso: string;
  day: number;
  inBatch: boolean;
  available: boolean;
  detail: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ReleasePicker({
  title,
  cells,
}: {
  title: string;
  cells: Array<ReleaseCell | null>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = cells.find((cell) => cell?.iso === selected) ?? null;

  return (
    <div className="border-t border-line pt-8">
      <p className="text-[0.62rem] uppercase tracking-[0.22em] text-garden">Release</p>
      <h2 className="mt-3 font-serif text-4xl font-normal italic">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
        Open days are the published 10:00 a.m. starts. Held days stay with a booking
        or a commitment. Choosing one here does not reserve it.
      </p>
      <div className="mt-6 grid grid-cols-7 gap-1.5 text-center text-[0.62rem] uppercase tracking-[0.14em] text-stone">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} />;
          if (!cell.inBatch) {
            return (
              <div key={cell.iso} className="py-3 text-sm text-stone/70">
                {cell.day}
              </div>
            );
          }
          const open = cell.available;
          return (
            <button
              key={cell.iso}
              type="button"
              aria-pressed={selected === cell.iso}
              onClick={() => setSelected(cell.iso)}
              className={`min-h-12 border text-sm font-light ${
                open ? "border-garden text-garden" : "border-line text-stone"
              } ${selected === cell.iso ? "bg-paper-deep" : "bg-transparent"}`}
            >
              <span className="block font-serif text-lg leading-none">{cell.day}</span>
              <span className="mt-1 block text-[0.58rem] uppercase tracking-[0.12em]">
                {open ? "Open" : "Held"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
        {chosen
          ? `${chosen.iso}: ${chosen.detail}`
          : "Select a released day to read why it is open or held."}
      </p>
    </div>
  );
}
