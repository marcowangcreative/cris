"use client";

import { formatMonth } from "@/lib/format";
import { shiftMonth } from "@/lib/civil-date";
import type { DayAvailability } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_WORD: Record<DayAvailability["status"], string> = {
  open: "open",
  closed: "closed",
  blocked: "blocked",
  full: "booked",
  past: "too soon",
  beyond: "too far",
};

export function MonthCalendar({
  month,
  firstWeekday,
  days,
  selectedDate,
  minMonth,
  maxMonth,
  loading,
  onMonth,
  onSelect,
}: {
  month: string;
  firstWeekday: number;
  days: DayAvailability[];
  selectedDate: string;
  minMonth: string;
  maxMonth: string;
  loading: boolean;
  onMonth: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="calendar">
      <div className="cal-nav">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonth(shiftMonth(month, -1))}
          disabled={month <= minMonth}
        >
          ←
        </button>
        <h3>{formatMonth(month)}</h3>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonth(shiftMonth(month, 1))}
          disabled={month >= maxMonth}
        >
          →
        </button>
      </div>
      <div className="dow" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="cal-grid" role="grid" aria-label={formatMonth(month)} aria-busy={loading}>
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const open = day.status === "open";
          const number = Number(day.date.slice(-2));
          return (
            <button
              key={day.date}
              type="button"
              className="day"
              role="gridcell"
              data-status={day.status}
              disabled={!open}
              aria-pressed={selectedDate === day.date}
              aria-label={`${day.date}, ${STATUS_WORD[day.status]}`}
              onClick={() => onSelect(day.date)}
            >
              {number}
              {day.status === "full" ? <small>Full</small> : null}
              {day.status === "blocked" ? <small>Block</small> : null}
            </button>
          );
        })}
      </div>
      <p className="legend">
        <span>Open days can be held</span>
        <span>Full is already reserved</span>
        <span>Block is closed by the desk</span>
      </p>
    </div>
  );
}
