"use client";

import { useState } from "react";
import { copyText, downloadText } from "@/lib/download";
import { artistDayIcs } from "@/lib/ics";
import { formatMoney, quoteTotal } from "@/lib/money";
import { buildSchedule, membersForDay, serviceOnDay, toDurations, type Schedule, type Slot } from "@/lib/schedule";
import { timelineText } from "@/lib/timeline-text";
import { fmtDate, fmtDateShort, fmtTime, parseTime } from "@/lib/time";
import { roleLabel, serviceLabel, specialtyLabel, type PlannerEvent, type Stylist } from "@/lib/types";
import { Button, Pill } from "./ui";

const ACCENTS = ["#7c5a34", "#215c38", "#7c3140", "#31506a", "#5a4680"];

function busiestDayId(event: PlannerEvent): string {
  let best = event.days[0]?.id ?? "";
  let count = -1;
  for (const day of event.days) {
    const size = membersForDay(event.members, day.id, event.days.length).length;
    if (size > count) {
      best = day.id;
      count = size;
    }
  }
  return best;
}

function slotLabel(type: Slot["type"]): string {
  if (type === "touchup") return "Touch-up";
  if (type === "hair") return "Hair";
  return "Makeup";
}

function fileSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artist";
}

export function TimelineView({
  event,
  stylists,
  interactive = true,
  showQuote = false,
}: {
  event: PlannerEvent;
  stylists: Stylist[];
  interactive?: boolean;
  showQuote?: boolean;
}) {
  const [dayId, setDayId] = useState(() => busiestDayId(event));
  const [copied, setCopied] = useState("");
  const active = event.days.find((day) => day.id === dayId) ?? event.days[0];
  const assigned = stylists.filter((stylist) => event.stylistIds.includes(stylist.id));

  async function copyTimeline() {
    await copyText(timelineText(event, stylists));
    setCopied("text");
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function copyLink() {
    const url = `${window.location.origin}/share/timeline/${event.timelineToken}`;
    await copyText(url);
    setCopied("link");
    window.setTimeout(() => setCopied(""), 2000);
  }

  return (
    <section data-testid="timeline">
      <div className="section-title">
        <h2>Hair & makeup timeline</h2>
        <p className="lede">Built backward from ready-by. Makeup sits closest to the deadline, then hair, and the bride finishes last.</p>
      </div>
      {event.days.length > 1 && active ? (
        <div className="toolbar no-print" style={{ justifyContent: "center" }}>
          {event.days.map((day) => (
            <Button key={day.id} size="small" variant={day.id === active.id ? "primary" : "ghost"} onClick={() => setDayId(day.id)}>
              {day.label}
              {day.date ? ` · ${fmtDateShort(day.date)}` : ""}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="no-print">
        {active ? <DaySchedule event={event} dayId={active.id} stylists={assigned} /> : null}
        {showQuote ? <QuoteTable event={event} /> : null}
        <ReferenceCards event={event} />
        {interactive ? (
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 18 }}>
            <Button variant="secondary" onClick={() => void copyTimeline()}>
              {copied === "text" ? "Copied" : "Copy text"}
            </Button>
            <Button onClick={() => window.print()}>Print / PDF</Button>
            {event.timelineToken ? (
              <Button variant="ghost" onClick={() => void copyLink()}>
                {copied === "link" ? "Link copied" : "Copy timeline link"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="print-only">
        <h1 className="display" style={{ fontStyle: "italic", textAlign: "center" }}>
          {event.coupleName || "Timeline"}
        </h1>
        <p className="center-note">{[event.venue, event.location].filter(Boolean).join(", ")}</p>
        {event.days.map((day) => (
          <DaySchedule key={day.id} event={event} dayId={day.id} stylists={assigned} force />
        ))}
        <ReferenceCards event={event} />
      </div>
    </section>
  );
}

function DaySchedule({
  event,
  dayId,
  stylists,
  force = false,
}: {
  event: PlannerEvent;
  dayId: string;
  stylists: Stylist[];
  force?: boolean;
}) {
  const day = event.days.find((item) => item.id === dayId);
  if (!day) return null;
  const party = membersForDay(event.members, day.id, event.days.length);
  const schedule = day.readyBy
    ? buildSchedule(party, stylists, day.readyBy, toDurations(event), day.id, {
        callTime: day.callTime,
        travelBufferMins: day.travelBufferMins,
      })
    : null;

  return (
    <div style={{ marginBottom: 18 }}>
      {force ? (
        <h3 className="display" style={{ fontSize: 28, marginBottom: 8 }}>
          {day.label}
          {day.date ? ` · ${fmtDate(day.date)}` : ""}
        </h3>
      ) : null}
      {!day.readyBy ? <p className="center-note">Set a ready-by time for this day.</p> : null}
      {day.readyBy && party.length === 0 ? <p className="center-note">No one is assigned to this day.</p> : null}
      {schedule && schedule.start !== null ? (
        <p className="center-note">
          Styling begins <strong>{fmtTime(schedule.start)}</strong>
          {" · "}
          Ready by <strong>{fmtTime(parseTime(day.readyBy) ?? schedule.end ?? 0)}</strong>
          {day.callTime ? ` · Call ${fmtTime(parseTime(day.callTime) ?? 0)}` : ""}
          {day.travelBufferMins > 0 ? ` + ${day.travelBufferMins} min travel` : ""}
        </p>
      ) : null}
      {schedule && schedule.conflicts.length > 0 ? (
        <div className="warn-box" data-testid="conflict-warning" role="alert" style={{ margin: "12px 0" }}>
          {schedule.conflicts.map((conflict) => (
            <p key={conflict.message} style={{ margin: "4px 0" }}>
              {conflict.message}
            </p>
          ))}
        </div>
      ) : null}
      {schedule ? (
        <>
          <div className="stats">
            <Stat label="Party" value={party.length} />
            <Stat label="Hair" value={party.filter((member) => serviceOnDay(member, day.id) !== "makeup").length} />
            <Stat label="Makeup" value={party.filter((member) => serviceOnDay(member, day.id) !== "hair").length} />
            <Stat label="Artists" value={schedule.tracks.length} />
          </div>
          {schedule.tracks.map((track, index) => (
            <TrackCard
              key={track.stylist.id}
              schedule={schedule}
              index={index}
              track={track}
              dayDate={day.date}
              dayLabel={day.label}
              coupleName={event.coupleName}
              location={[event.room, event.venue].filter(Boolean).join(", ")}
              interactive={!force}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TrackCard({
  schedule,
  track,
  index,
  dayDate,
  dayLabel,
  coupleName,
  location,
  interactive,
}: {
  schedule: Schedule;
  track: Schedule["tracks"][number];
  index: number;
  dayDate: string;
  dayLabel: string;
  coupleName: string;
  location: string;
  interactive: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <article className="track" style={{ marginBottom: 12 }}>
      <div className="row-between">
        <div className="member-main">
          <span className="avatar" style={{ background: accent, color: "white" }}>
            {(track.stylist.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{track.stylist.name}</strong>
            <div className="meta">{specialtyLabel(track.stylist.specialty)}</div>
          </div>
        </div>
        {interactive ? (
          <Button
            size="small"
            variant="ghost"
            disabled={!dayDate}
            onClick={() =>
              downloadText(
                `${fileSlug(track.stylist.name)}-${fileSlug(dayLabel)}.ics`,
                artistDayIcs({
                  stylist: track.stylist,
                  day: { date: dayDate, label: dayLabel },
                  coupleName,
                  location,
                  slots: track.slots,
                }),
                "text/calendar",
              )
            }
          >
            {dayDate ? "Download .ics" : "Add a date for .ics"}
          </Button>
        ) : null}
      </div>
      {schedule.start !== null && schedule.end !== null ? (
        <Gantt slots={track.slots} start={schedule.start} end={schedule.end} />
      ) : null}
      {track.slots.map((slot) => (
        <div key={`${slot.memberId}-${slot.type}`} className={`slot ${slot.type}`}>
          <time>
            {fmtTime(slot.start)} – {fmtTime(slot.end)}
          </time>
          <div className="who">
            <strong>{slot.name}</strong>
            <Pill role={slot.role}>{roleLabel(slot.role)}</Pill>
            <Pill tone={slot.type}>{slotLabel(slot.type)}</Pill>
          </div>
          <span className="meta">{slot.dur} min</span>
        </div>
      ))}
    </article>
  );
}

function Gantt({ slots, start, end }: { slots: Slot[]; start: number; end: number }) {
  const span = end - start;
  if (span <= 0) return null;
  return (
    <div className="gantt" aria-hidden="true">
      {slots.map((slot) => {
        const left = ((slot.start - start) / span) * 100;
        const width = Math.max(((slot.end - slot.start) / span) * 100, 1.5);
        return (
          <div key={`${slot.memberId}-${slot.type}`} className={`gantt-bar ${slot.type}`} style={{ left: `${left}%`, width: `${width}%` }}>
            {width > 9 ? slot.name.split(" ")[0] : ""}
          </div>
        );
      })}
    </div>
  );
}

function QuoteTable({ event }: { event: PlannerEvent }) {
  const total = quoteTotal(event.members);
  if (total <= 0) return null;
  return (
    <div className="card" style={{ marginTop: 8 }} data-testid="quote">
      <div className="row-between">
        <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
          Quote
        </h3>
        <strong>{formatMoney(total)}</strong>
      </div>
      <table className="quote-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Service</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {event.members.map((member) => (
            <tr key={member.id}>
              <td>{member.name || "Unnamed"}</td>
              <td>{serviceLabel(member.services)}</td>
              <td>{formatMoney(member.price || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferenceCards({ event }: { event: PlannerEvent }) {
  if (!event.members.length) return null;
  return (
    <>
      <h3 className="display" style={{ fontSize: 28, margin: "22px 0 10px" }}>
        Party reference
      </h3>
      <div className="refs">
        {event.members.map((member) => (
          <article key={member.id} className="card">
            <strong>{member.name || "Unnamed"}</strong>
            <div className="pills">
              <Pill role={member.role}>{roleLabel(member.role)}</Pill>
              <Pill tone={member.services}>{serviceLabel(member.services)}</Pill>
            </div>
            {member.notes ? <p className="meta">{member.notes}</p> : null}
          </article>
        ))}
      </div>
    </>
  );
}
