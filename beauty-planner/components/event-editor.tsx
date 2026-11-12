"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copyText } from "@/lib/download";
import { blankDay } from "@/lib/defaults";
import { formatMoney, quoteTotal } from "@/lib/money";
import { fmtDateShort } from "@/lib/time";
import { STATUSES, type EventDay, type PlannerEvent, type Stylist } from "@/lib/types";
import { PackingList } from "./packing-list";
import { PartyEditor } from "./party-editor";
import { Shell } from "./shell";
import { TeamEditor } from "./team-editor";
import { TimelineView } from "./timeline-view";
import { Button, Field } from "./ui";

const STEPS = [
  { n: 1, label: "Event" },
  { n: 2, label: "Party" },
  { n: 3, label: "Team" },
  { n: 4, label: "Timeline" },
  { n: 5, label: "Packing" },
];

export function EventEditor({
  initial,
  stylists,
  onSave,
  onDelete,
  onSaveStylist,
  onDeleteStylist,
}: {
  initial: PlannerEvent;
  stylists: Stylist[];
  onSave: (event: PlannerEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveStylist: (stylist: Stylist) => Promise<void>;
  onDeleteStylist: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const skipSave = useRef(true);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void saveRef.current(event).then(() => setError(null)).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not save");
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [event]);

  const assigned = stylists.filter((stylist) => event.stylistIds.includes(stylist.id));
  const quote = quoteTotal(event.members);
  const step = Math.min(5, Math.max(1, event.lastStep || 1));

  function patch(partial: Partial<PlannerEvent>) {
    setEvent((current) => ({ ...current, ...partial }));
  }

  function patchDay(index: number, partial: Partial<EventDay>) {
    const days = event.days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...partial } : day));
    patch({ days });
  }

  async function copyClientLink() {
    await copyText(`${window.location.origin}/share/client/${event.clientToken}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Shell
      actions={
        <>
          <span className="hide-sm" style={{ color: "#f0d7b0" }}>{event.coupleName}</span>
          <label className="field" style={{ minWidth: 120 }}>
            <span className="hide-sm" style={{ color: "#a89886" }}>Status</span>
            <select
              aria-label="Event status"
              value={event.status}
              onChange={(input) => patch({ status: input.target.value as PlannerEvent["status"] })}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
        </>
      }
    >
      <main className="page">
        <div className="page-head">
          <div>
            <p className="kicker">{[event.venue, event.location].filter(Boolean).join(" · ") || "New event"}</p>
            <h1>{event.coupleName || "Untitled event"}</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="kicker">Quote</p>
            <strong className="display" style={{ fontSize: 32 }} data-testid="quote">{formatMoney(quote)}</strong>
          </div>
        </div>
        {error ? <p className="error-box" role="alert">{error}</p> : null}
        <nav className="steps no-print" aria-label="Event steps">
          {STEPS.map((item, index) => (
            <span key={item.n} style={{ display: "inline-flex", alignItems: "center" }}>
              <button
                type="button"
                className="step"
                data-state={step === item.n ? "current" : step > item.n ? "done" : "todo"}
                onClick={() => patch({ lastStep: item.n })}
              >
                <b>{step > item.n ? "✓" : item.n}</b>
                {item.label}
              </button>
              {index < STEPS.length - 1 ? <span className="step-line" /> : null}
            </span>
          ))}
        </nav>

        {step === 1 ? (
          <section>
            <div className="section-title">
              <h2>The celebration</h2>
              <p className="lede">Each day gets its own ready-by time. The timeline is built backward from it.</p>
            </div>
            <div className="card">
              <div className="grid-2">
                <div className="span-2">
                  <Field label="Couple">
                    <input value={event.coupleName} onChange={(input) => patch({ coupleName: input.target.value })} placeholder="Avery Chen & Jordan Hale" />
                  </Field>
                </div>
                <Field label="Venue">
                  <input value={event.venue} onChange={(input) => patch({ venue: input.target.value })} />
                </Field>
                <Field label="Destination">
                  <input value={event.location} onChange={(input) => patch({ location: input.target.value })} />
                </Field>
                <div className="span-2">
                  <Field label="Getting-ready location">
                    <input value={event.room} onChange={(input) => patch({ room: input.target.value })} />
                  </Field>
                </div>
                <Field label="Photographer">
                  <input value={event.photographer} onChange={(input) => patch({ photographer: input.target.value })} />
                </Field>
                <Field label="Videographer">
                  <input value={event.videographer} onChange={(input) => patch({ videographer: input.target.value })} />
                </Field>
                <div className="span-2">
                  <Field label="Notes">
                    <textarea value={event.notes} onChange={(input) => patch({ notes: input.target.value })} />
                  </Field>
                </div>
              </div>
              <h3 className="display" style={{ fontSize: 26 }}>Days</h3>
              {event.days.map((day, index) => (
                <div key={day.id} className="day-card card" style={{ boxShadow: "none", marginBottom: 10 }}>
                  <div className="row-between">
                    <Field label={`Day ${index + 1} label`}>
                      <input value={day.label} onChange={(input) => patchDay(index, { label: input.target.value })} />
                    </Field>
                    {event.days.length > 1 ? (
                      <Button size="small" variant="danger" onClick={() => patch({ days: event.days.filter((item) => item.id !== day.id) })}>
                        Remove day
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <Field label="Date"><input type="date" value={day.date} onChange={(input) => patchDay(index, { date: input.target.value })} /></Field>
                    <Field label="Ceremony"><input type="time" value={day.ceremonyTime} onChange={(input) => patchDay(index, { ceremonyTime: input.target.value })} /></Field>
                    <Field label="Ready by"><input type="time" value={day.readyBy} onChange={(input) => patchDay(index, { readyBy: input.target.value })} /></Field>
                    <Field label="Artist call"><input type="time" value={day.callTime} onChange={(input) => patchDay(index, { callTime: input.target.value })} /></Field>
                    <Field label="Travel buffer (min)">
                      <input type="number" min={0} step={5} value={day.travelBufferMins} onChange={(input) => patchDay(index, { travelBufferMins: Number(input.target.value) || 0 })} />
                    </Field>
                  </div>
                  {day.date ? <p className="meta">{fmtDateShort(day.date)}</p> : null}
                </div>
              ))}
              <Button variant="secondary" onClick={() => patch({ days: [...event.days, blankDay(`Day ${event.days.length + 1}`)] })}>
                Add a day
              </Button>
              <h3 className="display" style={{ fontSize: 26 }}>Service timing</h3>
              <p className="meta">Studio only. The client link cannot change these.</p>
              <div className="grid-4">
                <Field label="Bride hair"><input type="number" min={5} step={5} value={event.brideHair} onChange={(input) => patch({ brideHair: Number(input.target.value) || 0 })} /></Field>
                <Field label="Bride makeup"><input type="number" min={5} step={5} value={event.brideMakeup} onChange={(input) => patch({ brideMakeup: Number(input.target.value) || 0 })} /></Field>
                <Field label="Other hair"><input type="number" min={5} step={5} value={event.defaultHair} onChange={(input) => patch({ defaultHair: Number(input.target.value) || 0 })} /></Field>
                <Field label="Other makeup"><input type="number" min={5} step={5} value={event.defaultMakeup} onChange={(input) => patch({ defaultMakeup: Number(input.target.value) || 0 })} /></Field>
                <Field label="Buffer between people"><input type="number" min={0} step={5} value={event.bufferMins} onChange={(input) => patch({ bufferMins: Number(input.target.value) || 0 })} /></Field>
                <Field label="Bride touch-up"><input type="number" min={0} step={5} value={event.brideTouchupMins} onChange={(input) => patch({ brideTouchupMins: Number(input.target.value) || 0 })} /></Field>
              </div>
              <div className="checkline" style={{ marginTop: 12 }}>
                <label><input type="checkbox" checked={event.isOutdoor} onChange={(input) => patch({ isOutdoor: input.target.checked })} /> Outdoor ceremony</label>
                <label><input type="checkbox" checked={event.hasExtensions} onChange={(input) => patch({ hasExtensions: input.target.checked })} /> Extensions</label>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <>
            <PartyEditor
              members={event.members}
              days={event.days}
              stylists={assigned}
              onChange={(members) => patch({ members })}
            />
            <div className="btn-row" style={{ justifyContent: "center", marginTop: 16 }}>
              <Button variant="secondary" onClick={() => void copyClientLink()}>
                {copied ? "Client link copied" : "Copy client link"}
              </Button>
            </div>
            <p className="center-note">The client can edit the party only. They cannot see other events, prices, or the full roster.</p>
          </>
        ) : null}

        {step === 3 ? (
          <TeamEditor
            roster={stylists}
            assignedIds={event.stylistIds}
            onAssign={(stylistIds) => patch({ stylistIds })}
            onSave={onSaveStylist}
            onDelete={async (id) => {
              await onDeleteStylist(id);
              setEvent((current) => ({
                ...current,
                stylistIds: current.stylistIds.filter((item) => item !== id),
                members: current.members.map((member) => (member.stylistId === id ? { ...member, stylistId: "" } : member)),
              }));
            }}
          />
        ) : null}

        {step === 4 ? <TimelineView event={event} stylists={stylists} showQuote /> : null}
        {step === 5 ? <PackingList event={event} onChange={(packState) => patch({ packState })} /> : null}

        <div className="btn-row no-print" style={{ justifyContent: "space-between", marginTop: 22 }}>
          {step > 1 ? <Button variant="ghost" onClick={() => patch({ lastStep: step - 1 })}>Back</Button> : <span />}
          {step < 5 ? (
            <Button onClick={() => patch({ lastStep: step + 1 })}>
              {step === 3 ? "Generate timeline" : "Continue"}
            </Button>
          ) : null}
        </div>
        <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 28 }}>
          <Button
            variant="danger"
            size="small"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void onDelete(event.id).then(() => router.push("/"));
            }}
          >
            {confirmDelete ? "Delete this event" : "Delete event"}
          </Button>
        </div>
      </main>
    </Shell>
  );
}
