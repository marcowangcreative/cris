"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { blankEvent } from "@/lib/defaults";
import { formatMoney, quoteTotal } from "@/lib/money";
import { buildSchedule, membersForDay, toDurations } from "@/lib/schedule";
import { daysUntil, fmtDateShort } from "@/lib/time";
import type { PlannerEvent, Stylist } from "@/lib/types";
import { useStudio } from "./auth-provider";
import { Shell } from "./shell";
import { Button, Pill } from "./ui";

function firstDate(event: PlannerEvent): string {
  return event.days.map((day) => day.date).filter(Boolean).sort()[0] ?? "";
}

function dateLabel(event: PlannerEvent): string {
  const dates = event.days.map((day) => day.date).filter(Boolean).sort();
  if (!dates.length) return "Date not set";
  if (dates.length === 1) return fmtDateShort(dates[0]);
  return `${fmtDateShort(dates[0])} – ${fmtDateShort(dates[dates.length - 1])}`;
}

function hasConflict(event: PlannerEvent, stylists: Stylist[]): boolean {
  const assigned = stylists.filter((stylist) => event.stylistIds.includes(stylist.id));
  return event.days.some((day) => {
    if (!day.readyBy) return false;
    const party = membersForDay(event.members, day.id, event.days.length);
    if (!party.length) return false;
    const schedule = buildSchedule(party, assigned, day.readyBy, toDurations(event), day.id, {
      callTime: day.callTime,
      travelBufferMins: day.travelBufferMins,
    });
    return schedule.conflicts.length > 0;
  });
}

export function Dashboard() {
  const studio = useStudio();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [creating, setCreating] = useState(false);

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...studio.events]
      .filter((event) => {
        if (!needle) return true;
        return `${event.coupleName} ${event.venue} ${event.location}`.toLowerCase().includes(needle);
      })
      .filter((event) => {
        const remaining = daysUntil(firstDate(event));
        if (filter === "upcoming") return remaining === null || remaining >= 0;
        if (filter === "past") return remaining !== null && remaining < 0;
        return true;
      })
      .sort((a, b) => firstDate(a).localeCompare(firstDate(b)));
  }, [studio.events, query, filter]);

  async function createEvent() {
    setCreating(true);
    try {
      const event = blankEvent();
      event.stylistIds = studio.stylists.map((stylist) => stylist.id);
      await studio.saveEvent(event);
      router.push(`/events/${event.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Shell
      actions={
        <Button onClick={() => void createEvent()} disabled={creating}>
          New event
        </Button>
      }
    >
      <main className="page" data-testid="dashboard">
        <div className="page-head">
          <div>
            <p className="kicker">{studio.studioName}</p>
            <h1>Events</h1>
            <p className="lede">Schedule hair and makeup backward from each ready-by time.</p>
          </div>
        </div>
        {studio.error ? <p className="error-box">{studio.error}</p> : null}
        <div className="toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search couple or venue"
            aria-label="Search events"
          />
          <div className="filters" role="group" aria-label="Filter events">
            {(["upcoming", "past", "all"] as const).map((item) => (
              <Button key={item} size="small" variant={filter === item ? "primary" : "ghost"} onClick={() => setFilter(item)}>
                {item}
              </Button>
            ))}
          </div>
        </div>
        {events.length === 0 ? (
          <div className="empty card">
            <h2>No events yet</h2>
            <p className="lede">Create an event for the couple, then send them a private link to fill in the party.</p>
            <Button onClick={() => void createEvent()} disabled={creating}>
              New event
            </Button>
          </div>
        ) : (
          <div className="stack">
            {events.map((event) => {
              const remaining = daysUntil(firstDate(event));
              const quote = quoteTotal(event.members);
              const conflict = hasConflict(event, studio.stylists);
              return (
                <Link key={event.id} href={`/events/${event.id}`} className="event-card" data-testid="event-card">
                  <div>
                    <h2>{event.coupleName || "Untitled event"}</h2>
                    <div className="meta">
                      {dateLabel(event)}
                      {event.venue ? ` · ${event.venue}` : ""}
                      {event.location ? `, ${event.location}` : ""}
                    </div>
                    <div className="pills">
                      <Pill tone={event.status}>{event.status}</Pill>
                      <Pill>{event.members.length} {event.members.length === 1 ? "person" : "people"}</Pill>
                      {quote > 0 ? <Pill>{formatMoney(quote)}</Pill> : null}
                      {event.days.length > 1 ? <Pill>{event.days.length} days</Pill> : null}
                      {conflict ? <Pill tone="warn">Call-time conflict</Pill> : null}
                    </div>
                  </div>
                  <div className="countdown">
                    {remaining === null ? (
                      <span>No date</span>
                    ) : remaining >= 0 ? (
                      <>
                        <strong>{remaining}</strong>
                        <span>{remaining === 1 ? "day" : "days"} out</span>
                      </>
                    ) : (
                      <span>Passed</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}
