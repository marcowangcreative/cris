"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { buildHandoff, chooseOpenDate, type Handoff } from "@/lib/booking/handoff";
import type { AvailabilityDay } from "@/lib/booking/types";
import { formatUsd } from "@/lib/format";
import { RULES } from "@/lib/rules";

const colors = { background: "f6f1ea", text: "2c211c", primary: "8c6a58" };

export function MaisonBooking({
  days,
  live,
  eventUrl,
}: {
  days: AvailabilityDay[];
  live: boolean;
  eventUrl: string;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chosen = date ? chooseOpenDate(days, date) : null;
  const times = chosen && chosen.ok ? chosen.times : [];

  function pick(day: AvailabilityDay) {
    setHandoff(null);
    const next = chooseOpenDate(days, day.date);
    if (!next.ok) {
      setDate(null);
      setTime(null);
      setError(next.error);
      return;
    }
    setError(null);
    setDate(next.date);
    setTime(next.times[0] ?? null);
  }

  function confirm() {
    if (!date || !time) return;
    const next = buildHandoff({ live, eventUrl, date, time, colors });
    setHandoff(next);
    if (next.mode === "live") openCalendly(next.url);
  }

  const when = date
    ? DateTime.fromISO(date, { zone: "America/Chicago" }).toFormat("cccc, LLLL d")
    : "";

  return (
    <div className="maison-book">
      <ul className="maison-dates">
        {days.map((day) => (
          <li key={day.date} className={day.status === "held" ? "is-held" : ""}>
            <button
              type="button"
              disabled={day.status !== "open"}
              aria-pressed={date === day.date}
              onClick={() => pick(day)}
            >
              <span>{DateTime.fromISO(day.date).toFormat("ccc d")}</span>
              <em>{day.status === "held" ? "Held" : "Open"}</em>
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="maison-kicker">{error}</p> : null}
      {date && time ? (
        <section className="maison-summary" aria-live="polite">
          <p className="maison-kicker">Selected</p>
          <h2>{when}</h2>
          <p>
            {formatTime(time)} Central. The minimum is {formatUsd(RULES.transformationMinimumCents)}.
            The deposit is {formatUsd(RULES.depositCents)}, taken only in the confirmation step.
          </p>
          {times.length > 1 ? (
            <div className="maison-times">
              {times.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={time === slot}
                  onClick={() => {
                    setTime(slot);
                    setHandoff(null);
                  }}
                >
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          ) : null}
          <p>
            <button type="button" className="maison-button" onClick={confirm}>
              Continue to confirmation
            </button>
          </p>
        </section>
      ) : null}
      {handoff?.mode === "mock" ? (
        <section className="maison-fake" role="dialog" aria-label="Fake confirmation">
          <p className="maison-kicker">Sample only</p>
          <h2>Fake confirmation</h2>
          <p>{handoff.label}</p>
          <p>
            {when} at {formatTime(handoff.summary.time)}. Minimum{" "}
            {formatUsd(handoff.summary.minimumCents)}. Deposit{" "}
            {formatUsd(handoff.summary.depositCents)}.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function formatTime(time: string): string {
  const parsed = DateTime.fromFormat(time, "HH:mm");
  return parsed.isValid ? parsed.toFormat("h:mm a").toLowerCase() : time;
}

function openCalendly(url: string) {
  const widget = (window as Window & {
    Calendly?: { initPopupWidget: (options: { url: string }) => void };
  }).Calendly;
  if (widget?.initPopupWidget) {
    widget.initPopupWidget({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
