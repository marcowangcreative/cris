"use client";

import { useState } from "react";
import { blankMember } from "@/lib/defaults";
import { safeHttpUrl } from "@/lib/urls";
import { ROLES, SERVICES, roleLabel, serviceLabel, type EventDay, type Member, type ServiceKind, type Stylist } from "@/lib/types";
import { Button, Field, Pill } from "./ui";

export function PartyEditor({
  members,
  days,
  stylists,
  studio = true,
  onChange,
}: {
  members: Member[];
  days: EventDay[];
  stylists: Stylist[];
  studio?: boolean;
  onChange: (members: Member[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const hair = members.filter((member) => member.services !== "makeup").length;
  const makeup = members.filter((member) => member.services !== "hair").length;

  function update(id: string, patch: Partial<Member>) {
    onChange(members.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  }

  function add() {
    const dayIds = days.length === 1 ? days.map((day) => day.id) : [];
    const member = blankMember(dayIds);
    onChange([...members, member]);
    setEditingId(member.id);
  }

  function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      window.setTimeout(() => setConfirmId((current) => (current === id ? null : current)), 2500);
      return;
    }
    onChange(members.filter((member) => member.id !== id));
    if (editingId === id) setEditingId(null);
    setConfirmId(null);
  }

  return (
    <section>
      <div className="section-title">
        <h2>The party</h2>
        <p className="lede">{studio ? "Everyone receiving hair or makeup." : "Add everyone who needs services. Timing stays with your artists."}</p>
      </div>
      {members.length > 0 ? (
        <div className="stats">
          <div className="card stat"><strong>{hair}</strong><span>Hair</span></div>
          <div className="card stat"><strong>{makeup}</strong><span>Makeup</span></div>
          <div className="card stat"><strong>{members.length}</strong><span>People</span></div>
          <div className="card stat"><strong>{stylists.length}</strong><span>Artists</span></div>
        </div>
      ) : null}
      <div className="stack">
        {members.map((member) =>
          editingId === member.id ? (
            <MemberForm
              key={member.id}
              member={member}
              days={days}
              stylists={stylists}
              studio={studio}
              onChange={(patch) => update(member.id, patch)}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <article key={member.id} className="member-card">
              <div className="row-between">
                <div className="member-main">
                  <span className="avatar">{(member.name || "?").slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{member.name || "Unnamed"}</strong>
                    <div className="pills">
                      <Pill role={member.role}>{roleLabel(member.role)}</Pill>
                      <Pill tone={member.services}>{serviceLabel(member.services)}</Pill>
                      {studio && member.price > 0 ? <Pill>${member.price}</Pill> : null}
                    </div>
                    {member.notes ? <p className="meta">{member.notes}</p> : null}
                  </div>
                </div>
                <div className="btn-row">
                  <Button size="small" variant="ghost" onClick={() => setEditingId(member.id)}>Edit</Button>
                  <Button size="small" variant="danger" onClick={() => remove(member.id)}>
                    {confirmId === member.id ? "Confirm" : "Remove"}
                  </Button>
                </div>
              </div>
            </article>
          ),
        )}
      </div>
      {editingId === null ? (
        <Button variant="secondary" onClick={add} style={{ width: "100%", marginTop: 12 }}>
          Add person
        </Button>
      ) : null}
    </section>
  );
}

function MemberForm({
  member,
  days,
  stylists,
  studio,
  onChange,
  onDone,
}: {
  member: Member;
  days: EventDay[];
  stylists: Stylist[];
  studio: boolean;
  onChange: (patch: Partial<Member>) => void;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");

  function addUrl() {
    const safe = safeHttpUrl(url);
    if (!safe || member.urls.includes(safe)) return;
    onChange({ urls: [...member.urls, safe] });
    setUrl("");
  }

  function setDayService(dayId: string, value: string) {
    const next = { ...member.dayServices };
    if (!value) delete next[dayId];
    else next[dayId] = value as ServiceKind;
    onChange({ dayServices: next });
  }

  function toggleDay(dayId: string) {
    const has = member.dayIds.includes(dayId);
    onChange({ dayIds: has ? member.dayIds.filter((id) => id !== dayId) : [...member.dayIds, dayId] });
  }

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        onDone();
      }}
    >
      <div className="grid-2">
        <Field label="Name">
          <input value={member.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Avery Chen" autoFocus />
        </Field>
        <Field label="Role">
          <select value={member.role} onChange={(event) => onChange({ role: event.target.value as Member["role"] })}>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Services">
          <select value={member.services} onChange={(event) => onChange({ services: event.target.value as ServiceKind })}>
            {SERVICES.map((service) => (
              <option key={service.value} value={service.value}>{service.label}</option>
            ))}
          </select>
        </Field>
        {stylists.length > 0 ? (
          <Field label="Preferred artist">
            <select value={member.stylistId} onChange={(event) => onChange({ stylistId: event.target.value })}>
              <option value="">Auto-assign</option>
              {stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>{stylist.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
        {studio ? (
          <>
            <Field label="Price (USD)">
              <input type="number" min={0} step={10} value={member.price || ""} onChange={(event) => onChange({ price: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="Hair minutes override">
              <input type="number" min={0} step={5} value={member.hairMins || ""} placeholder="Default" onChange={(event) => onChange({ hairMins: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="Makeup minutes override">
              <input type="number" min={0} step={5} value={member.makeupMins || ""} placeholder="Default" onChange={(event) => onChange({ makeupMins: Number(event.target.value) || 0 })} />
            </Field>
          </>
        ) : null}
        {days.length > 1 ? (
          <div className="span-2">
            <span className="lbl">Days</span>
            <div className="checkline" style={{ marginTop: 8 }}>
              {days.map((day) => (
                <label key={day.id}>
                  <input type="checkbox" checked={member.dayIds.includes(day.id)} onChange={() => toggleDay(day.id)} />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {days.length > 1 && member.dayIds.length > 1 ? (
          <div className="span-2">
            <span className="lbl">Per-day services</span>
            <div className="stack" style={{ marginTop: 8 }}>
              {days.filter((day) => member.dayIds.includes(day.id)).map((day) => (
                <label key={day.id} className="field">
                  <span>{day.label}</span>
                  <select value={member.dayServices[day.id] ?? ""} onChange={(event) => setDayService(day.id, event.target.value)}>
                    <option value="">Same as default</option>
                    {SERVICES.map((service) => (
                      <option key={service.value} value={service.value}>{service.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="span-2">
          <span className="lbl">Inspiration links</span>
          <div className="pack-add">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" aria-label="Inspiration URL" />
            <Button type="button" size="small" variant="secondary" onClick={addUrl}>Add</Button>
          </div>
          {member.urls.length > 0 ? (
            <ul>
              {member.urls.map((item) => (
                <li key={item}>
                  <a href={item} target="_blank" rel="noreferrer">{item}</a>{" "}
                  <button type="button" className="btn ghost small" onClick={() => onChange({ urls: member.urls.filter((urlItem) => urlItem !== item) })}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="span-2">
          <Field label="Notes for the artist">
            <textarea value={member.notes} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Texture, allergies, the look they asked for" />
          </Field>
        </div>
      </div>
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <Button type="submit" disabled={!member.name.trim()}>Save person</Button>
      </div>
      <p className="meta">Paste image links for inspiration. File upload needs a storage bucket, which this MVP does not set up.</p>
    </form>
  );
}
