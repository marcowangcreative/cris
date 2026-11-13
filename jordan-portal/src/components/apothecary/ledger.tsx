"use client";

import { useState } from "react";
import type { ReleaseCell } from "@/components/release-picker";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Ledger({
  title,
  cells,
}: {
  title: string;
  cells: Array<ReleaseCell | null>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = cells.find((cell) => cell?.iso === selected) ?? null;
  return (
    <div className="rx-ledger">
      <p className="rx-jost rx-center">{title}</p>
      <div className="rx-weekdays rx-jost" style={{ marginTop: "1rem" }}>
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="rx-days">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} />;
          if (!cell.inBatch) {
            return (
              <div key={cell.iso} className="rx-day rx-muted">
                {cell.day}
              </div>
            );
          }
          return (
            <button
              key={cell.iso}
              type="button"
              aria-pressed={selected === cell.iso}
              onClick={() => setSelected(cell.iso)}
              className={`rx-day ${cell.available ? "rx-day-open" : "rx-day-held"}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <p className="rx-center rx-muted" style={{ marginTop: "1rem" }} aria-live="polite">
        {chosen
          ? `${chosen.iso}: ${chosen.detail}`
          : "A held day is struck through. Choosing a day here does not reserve it."}
      </p>
    </div>
  );
}
