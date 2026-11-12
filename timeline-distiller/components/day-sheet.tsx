"use client";

import type { ReactNode } from "react";
import { blankBeat, blankChecklistItem, blankConstraint, blankContact, blankGroup, blankLocation, visibleTo } from "@/lib/assemble";
import { countNames } from "@/lib/formals";
import { formatSlotClock } from "@/lib/slotting";
import { viewLabel } from "@/lib/sheet-text";
import type { Assignee, Beat, ChecklistItem, DaySheet, View } from "@/lib/types";
import { BEAT_KINDS, KIND_LABEL, SEGMENT_LABEL, SEGMENTS } from "@/lib/types";
import { formatClock } from "@/lib/time";

const ASSIGNEES: Assignee[] = ["lead", "second", "both"];

export function DaySheetView({
  sheet,
  view,
  editing,
  onChange,
}: {
  sheet: DaySheet;
  view: View;
  editing: boolean;
  onChange: (next: DaySheet) => void;
}) {
  const beats = sheet.beats.filter((beat) => visibleTo(beat.assignee, view));
  const formalsBeat = sheet.beats.find((beat) => beat.kind === "family-formals");
  const showFormals = sheet.formalSlots.slots.length > 0 && (view !== "second" || (formalsBeat ? visibleTo(formalsBeat.assignee, view) : false));

  return (
    <article className="sheet" id="day-sheet">
      <header className="sheet-head">
        <div>
          {editing ? (
            <input
              aria-label="Couple"
              value={sheet.couple}
              onChange={(event) => onChange({ ...sheet, couple: event.target.value, coupleInferred: true })}
            />
          ) : (
            <h1>{sheet.couple || "Wedding day"}</h1>
          )}
          {editing ? (
            <input
              aria-label="Date"
              value={sheet.date}
              onChange={(event) => onChange({ ...sheet, date: event.target.value, dateInferred: true })}
            />
          ) : (
            <p className="meta">
              {sheet.date || "Date not on the timeline"}
              {" · "}
              {viewLabel(view)}
            </p>
          )}
          <SourceMark
            line={sheet.coupleSourceLine}
            inferred={sheet.coupleInferred}
            excerpt={sheet.coupleSourceExcerpt}
          />
        </div>
        <p className="sunset">
          Sunset
          <strong>check sunset</strong>
          {sheet.sunsetNote && sheet.sunsetNote !== "Check sunset." ? sheet.sunsetNote : "Do not guess the clock."}
        </p>
      </header>
      {sheet.demo ? (
        <p className="demo-flag">Sample wedding. Priya, Elias, and everyone else here are fictional. No model was called.</p>
      ) : null}
      {sheet.rejected.length ? (
        <p className="warn">
          {sheet.rejected.length} item{sheet.rejected.length === 1 ? "" : "s"} dropped or ungrounded:{" "}
          {sheet.rejected.map((item) => item.label).join(", ")}.
        </p>
      ) : null}

      <Section title="People to call">
        <ul className="facts">
          {sheet.contacts.map((contact) => (
            <li key={contact.id}>
              {editing ? (
                <div className="edit-grid">
                  <input aria-label="Role" value={contact.role} onChange={(event) => patchContact(sheet, contact.id, { role: event.target.value }, onChange)} />
                  <input aria-label="Name" value={contact.name} onChange={(event) => patchContact(sheet, contact.id, { name: event.target.value }, onChange)} />
                  <input aria-label="Phone" value={contact.phone} onChange={(event) => patchContact(sheet, contact.id, { phone: event.target.value }, onChange)} />
                  <button type="button" className="danger" onClick={() => onChange({ ...sheet, contacts: sheet.contacts.filter((item) => item.id !== contact.id) })}>
                    Remove contact
                  </button>
                </div>
              ) : (
                <div className="fact-main">
                  <span>
                    <strong>{contact.role}.</strong> {contact.name} {contact.phone}
                  </span>
                  <SourceMark line={contact.sourceLine} inferred={contact.inferred} excerpt={contact.sourceExcerpt} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {editing ? (
          <button type="button" className="ghost" onClick={() => onChange({ ...sheet, contacts: [...sheet.contacts, blankContact()] })}>
            Add contact
          </button>
        ) : null}
      </Section>

      <Section title="Ask the planner">
        <ul className="gaps">
          {[...sheet.detectorGaps, ...sheet.modelGaps].map((gap) => (
            <li key={gap.id}>
              {gap.text}{" "}
              <SourceMark line={gap.sourceLine} inferred={gap.inferred} excerpt={gap.sourceExcerpt} />
            </li>
          ))}
        </ul>
        {sheet.detectorGaps.length + sheet.modelGaps.length === 0 ? <p className="quiet">No conflicts detected.</p> : null}
      </Section>

      <Section title="Hard rules">
        <ul className="rules">
          {sheet.constraints.map((rule) => (
            <li key={rule.id}>
              {editing ? (
                <div className="stack">
                  <input aria-label="Rule" value={rule.text} onChange={(event) => onChange({
                    ...sheet,
                    constraints: sheet.constraints.map((item) => item.id === rule.id ? { ...item, text: event.target.value, inferred: true } : item),
                  })} />
                  <button type="button" className="danger" onClick={() => onChange({ ...sheet, constraints: sheet.constraints.filter((item) => item.id !== rule.id) })}>
                    Remove rule
                  </button>
                </div>
              ) : (
                <div className="fact-main">
                  <span>{rule.text}</span>
                  <SourceMark line={rule.sourceLine} inferred={rule.inferred} excerpt={rule.sourceExcerpt} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {editing ? (
          <button type="button" className="ghost" onClick={() => onChange({ ...sheet, constraints: [...sheet.constraints, blankConstraint()] })}>
            Add rule
          </button>
        ) : null}
      </Section>

      {sheet.locations.length || editing ? (
        <Section title="Places">
          <ul className="facts">
            {sheet.locations.map((location) => (
              <li key={location.id}>
                {editing ? (
                  <div className="edit-grid">
                    <input aria-label="Place role" value={location.role} onChange={(event) => onChange({
                      ...sheet,
                      locations: sheet.locations.map((item) => item.id === location.id ? { ...item, role: event.target.value } : item),
                    })} />
                    <input aria-label="Place name" value={location.name} onChange={(event) => onChange({
                      ...sheet,
                      locations: sheet.locations.map((item) => item.id === location.id ? { ...item, name: event.target.value } : item),
                    })} />
                    <input aria-label="Address" value={location.address} onChange={(event) => onChange({
                      ...sheet,
                      locations: sheet.locations.map((item) => item.id === location.id ? { ...item, address: event.target.value, inferred: true } : item),
                    })} />
                    <button type="button" className="danger" onClick={() => onChange({ ...sheet, locations: sheet.locations.filter((item) => item.id !== location.id) })}>
                      Remove place
                    </button>
                  </div>
                ) : (
                  <div className="fact-main">
                    <span>
                      <strong>{location.role}.</strong> {location.name}
                      {location.address ? ` — ${location.address}` : ""}
                    </span>
                    <SourceMark line={location.sourceLine} inferred={location.inferred} excerpt={location.sourceExcerpt} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {editing ? (
            <button type="button" className="ghost" onClick={() => onChange({ ...sheet, locations: [...sheet.locations, blankLocation()] })}>
              Add place
            </button>
          ) : null}
        </Section>
      ) : null}

      <Section title="Timeline">
        {beats.length ? beats.map((beat) => (
          <BeatRow key={beat.id} beat={beat} editing={editing} sheet={sheet} onChange={onChange} />
        )) : (
          <p className="quiet">Nothing on the {viewLabel(view).toLowerCase()} view. Switch to Full to see every row.</p>
        )}
        {editing ? (
          <button type="button" className="ghost" onClick={() => onChange({ ...sheet, beats: [...sheet.beats, blankBeat()] })}>
            Add timeline row
          </button>
        ) : null}
      </Section>

      <Section title="Family formals">
        {showFormals ? (
          <>
            <p className="quiet">
              {sheet.formalSlots.windowStart != null && sheet.formalSlots.windowEnd != null
                ? `${formatClock(sheet.formalSlots.windowStart)}–${formatClock(sheet.formalSlots.windowEnd)}. `
                : "No window on the timeline. "}
              Small groups are {sheet.baseMinutes} min. Groups over 6 people get an extra 30 seconds each.
            </p>
            {sheet.formalSlots.warning ? <p className="warn">{sheet.formalSlots.warning}</p> : null}
            <ol className="formal-list">
              {sheet.formalSlots.slots.map((slot, index) => (
                <li key={slot.id} className={slot.overflows ? "is-over" : undefined}>
                  {editing ? (
                    <div className="stack">
                      <input aria-label={`Group ${index + 1} label`} value={slot.label} onChange={(event) => updateGroup(sheet, slot.id, { label: event.target.value }, onChange)} />
                      <input aria-label={`Group ${index + 1} people`} value={slot.people} onChange={(event) => updateGroup(sheet, slot.id, { people: event.target.value, count: countNames(event.target.value) }, onChange)} />
                      <button type="button" className="danger" onClick={() => onChange({ ...sheet, formalGroups: sheet.formalGroups.filter((group) => group.id !== slot.id) })}>
                        Remove group
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="group-line">
                        <span className="clock">{formatSlotClock(slot)}</span>
                        {slot.overflows ? <span className="past">Past window</span> : null}
                      </div>
                      <strong>{index + 1}. {slot.label}</strong>
                      <span className="quiet"> ({slot.count})</span>
                      <div>{slot.people}</div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="quiet">
            {view === "second"
              ? "Family formals stay with the lead unless you set that row to Second or Both."
              : "No formals list yet. Paste a Formals link or type the groups, then distill again."}
          </p>
        )}
        {editing ? (
          <button type="button" className="ghost" onClick={() => onChange({ ...sheet, formalGroups: [...sheet.formalGroups, blankGroup()] })}>
            Add group
          </button>
        ) : null}
      </Section>

      <Section title="Must-haves">
        {SEGMENTS.map((segment) => {
          const items = sheet.checklist.filter((item) => item.segment === segment && visibleTo(item.assignee, view));
          if (!items.length && !editing) return null;
          return (
            <div key={segment} className="segment">
              <h3>{SEGMENT_LABEL[segment]}</h3>
              {items.map((item) => (
                <ChecklistRow key={item.id} item={item} editing={editing} sheet={sheet} onChange={onChange} />
              ))}
              {editing ? (
                <button type="button" className="texty" onClick={() => onChange({ ...sheet, checklist: [...sheet.checklist, blankChecklistItem(segment)] })}>
                  Add to {SEGMENT_LABEL[segment].toLowerCase()}
                </button>
              ) : null}
            </div>
          );
        })}
      </Section>

      <Section title="Notes">
        {editing ? (
          <textarea aria-label="Notes" value={sheet.notes} onChange={(event) => onChange({ ...sheet, notes: event.target.value })} />
        ) : (
          <p>{sheet.notes.trim() || "None."}</p>
        )}
      </Section>
      <p className="quiet">This copy stays in this browser. Uploads are not logged and nothing is written to a server.</p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SourceMark({ line, inferred, excerpt }: { line: number | null; inferred: boolean; excerpt: string }) {
  if (!line && !inferred) return null;
  return (
    <span className="marks">
      {inferred ? <span className="pill">Inferred</span> : null}
      {line ? (
        <span className="cite" title={excerpt}>
          Line {line}
        </span>
      ) : null}
    </span>
  );
}

function BeatRow({
  beat,
  editing,
  sheet,
  onChange,
}: {
  beat: Beat;
  editing: boolean;
  sheet: DaySheet;
  onChange: (next: DaySheet) => void;
}) {
  function patch(partial: Partial<Beat>) {
    onChange({
      ...sheet,
      beats: sheet.beats.map((item) => (item.id === beat.id ? { ...item, ...partial } : item)),
    });
  }

  if (editing) {
    return (
      <div className="beat">
        <div className="edit-grid">
          <input aria-label="Start" value={beat.time} onChange={(event) => patch({ time: event.target.value })} />
          <input aria-label="End" value={beat.endTime} onChange={(event) => patch({ endTime: event.target.value })} />
        </div>
        <div className="stack">
          <input aria-label="Title" value={beat.title} onChange={(event) => patch({ title: event.target.value })} />
          <select aria-label="Kind" value={beat.kind} onChange={(event) => patch({ kind: event.target.value as Beat["kind"] })}>
            {BEAT_KINDS.map((kind) => (
              <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>
            ))}
          </select>
          <input aria-label="Location" value={beat.location} onChange={(event) => patch({ location: event.target.value })} />
          <textarea aria-label="What to shoot" value={beat.whatToShoot} onChange={(event) => patch({ whatToShoot: event.target.value })} />
          <input aria-label="People" value={beat.people} onChange={(event) => patch({ people: event.target.value })} />
          <select aria-label="Shooter" value={beat.assignee} onChange={(event) => patch({ assignee: event.target.value as Assignee, assigneeInferred: false })}>
            {ASSIGNEES.map((assignee) => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
          <button type="button" className="danger" onClick={() => onChange({ ...sheet, beats: sheet.beats.filter((item) => item.id !== beat.id) })}>
            Remove row
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="beat">
      <div>
        <div className="clock">{beat.time || "TBD"}</div>
        {beat.endTime ? <div className="clock">– {beat.endTime}</div> : null}
      </div>
      <div>
        <header>
          <h3>{beat.title}</h3>
          <span className={`who ${beat.assignee}`}>{beat.assignee === "both" ? "Both" : beat.assignee === "lead" ? "Lead" : "Second"}</span>
        </header>
        <p className="quiet">
          {KIND_LABEL[beat.kind]}
          {beat.location ? ` · ${beat.location}` : ""}
          {beat.assigneeInferred ? " · shooter guessed" : ""}
        </p>
        {beat.whatToShoot ? <p className="shoot">{beat.whatToShoot}</p> : null}
        {beat.people ? <p className="people">{beat.people}</p> : null}
        <SourceMark line={beat.sourceLine} inferred={beat.inferred} excerpt={beat.sourceExcerpt} />
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  editing,
  sheet,
  onChange,
}: {
  item: ChecklistItem;
  editing: boolean;
  sheet: DaySheet;
  onChange: (next: DaySheet) => void;
}) {
  function patch(partial: Partial<ChecklistItem>) {
    onChange({
      ...sheet,
      checklist: sheet.checklist.map((row) => (row.id === item.id ? { ...row, ...partial } : row)),
    });
  }

  return (
    <div className="check-row">
      <input
        id={item.id}
        type="checkbox"
        checked={item.done}
        aria-label={item.text || "Must-have"}
        onChange={(event) => patch({ done: event.target.checked })}
      />
      {editing ? (
        <>
          <input aria-label="Must-have" value={item.text} onChange={(event) => patch({ text: event.target.value })} />
          <select aria-label="Checklist shooter" value={item.assignee} onChange={(event) => patch({ assignee: event.target.value as Assignee })}>
            {ASSIGNEES.map((assignee) => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
          <button type="button" className="danger" onClick={() => onChange({ ...sheet, checklist: sheet.checklist.filter((row) => row.id !== item.id) })}>
            Remove
          </button>
        </>
      ) : (
        <label htmlFor={item.id}>{item.text}</label>
      )}
    </div>
  );
}

function patchContact(
  sheet: DaySheet,
  id: string,
  partial: Partial<DaySheet["contacts"][number]>,
  onChange: (next: DaySheet) => void,
) {
  onChange({
    ...sheet,
    contacts: sheet.contacts.map((contact) => (contact.id === id ? { ...contact, ...partial, inferred: true } : contact)),
  });
}

function updateGroup(
  sheet: DaySheet,
  id: string,
  partial: Partial<DaySheet["formalGroups"][number]>,
  onChange: (next: DaySheet) => void,
) {
  onChange({
    ...sheet,
    formalGroups: sheet.formalGroups.map((group) => (group.id === id ? { ...group, ...partial } : group)),
  });
}
