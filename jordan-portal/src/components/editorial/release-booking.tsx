"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import {
  buildHandoff,
  chooseOpenDate,
  type Handoff,
} from "@/lib/booking/handoff";
import type { AvailabilityDay } from "@/lib/booking/types";
import { formatUsd } from "@/lib/format";
import { RULES } from "@/lib/rules";

export function ReleaseBooking({
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
    const next = buildHandoff({ live, eventUrl, date, time });
    setHandoff(next);
    if (next.mode === "live") openCalendly(next.url);
  }

  const when = date
    ? DateTime.fromISO(date, { zone: "America/Chicago" }).toFormat("cccc, LLLL d")
    : "";

  return (
    <div>
      <ul className="zine-dates">
        {days.map((day) => (
          <li key={day.date} className={day.status === "held" ? "is-held" : ""}>
            <button
              type="button"
              className="zine-date-button"
              disabled={day.status !== "open"}
              aria-pressed={date === day.date}
              onClick={() => pick(day)}
            >
              {DateTime.fromISO(day.date).toFormat("ccc d")}
              {day.status === "held" ? " held" : ""}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="zine-kicker">{error}</p> : null}
      {date && time ? (
        <section className="zine-summary" aria-live="polite">
          <p className="zine-kicker">Selected date</p>
          <h2 style={{ margin: "0.35rem 0 0" }}>{when}</h2>
          <p style={{ margin: "0.6rem 0 0" }}>
            {formatTime(time)} Central. The minimum is {formatUsd(RULES.transformationMinimumCents)}. The
            deposit is {formatUsd(RULES.depositCents)}, collected only in the confirmation step.
          </p>
          {times.length > 1 ? (
            <div className="zine-times">
              {times.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="zine-date-button"
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
          <p style={{ marginTop: "1rem" }}>
            <button type="button" className="zine-button" onClick={confirm}>
              Continue to confirmation
            </button>
          </p>
        </section>
      ) : null}
      {handoff?.mode === "mock" ? (
        <section className="zine-fake" role="dialog" aria-label="Fake confirmation">
          <p className="zine-kicker">Sample only</p>
          <h2 style={{ margin: "0.35rem 0 0" }}>Fake confirmation</h2>
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
