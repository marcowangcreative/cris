"use client";

import { useState } from "react";
import { newId } from "@/lib/ids";
import { SPECIALTIES, serviceLabel, type ServiceKind, type Stylist } from "@/lib/types";
import { Button, Field, Pill } from "./ui";

export function TeamEditor({
  roster,
  assignedIds,
  onAssign,
  onSave,
  onDelete,
}: {
  roster: Stylist[];
  assignedIds: string[];
  onAssign: (ids: string[]) => void;
  onSave: (stylist: Stylist) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", specialty: "both" as ServiceKind });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", specialty: "both" as ServiceKind });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set(assignedIds);

  async function addAndAssign() {
    if (!draft.name.trim()) return;
    const stylist = { id: newId(), name: draft.name.trim(), specialty: draft.specialty };
    try {
      await onSave(stylist);
      if (!assigned.has(stylist.id)) onAssign([...assignedIds, stylist.id]);
      setDraft({ name: "", specialty: "both" });
      setAdding(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the artist");
    }
  }

  function toggle(id: string) {
    onAssign(assigned.has(id) ? assignedIds.filter((item) => item !== id) : [...assignedIds, id]);
  }

  return (
    <section>
      <div className="section-title">
        <h2>The team</h2>
        <p className="lede">Your roster is shared across events. Check who is working this one.</p>
      </div>
      {error ? <p className="error-box">{error}</p> : null}
      <div className="stack">
        {roster.map((stylist) => (
          <article key={stylist.id} className="member-card">
            {editId === stylist.id ? (
              <div className="grid-2">
                <Field label="Name">
                  <input value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} />
                </Field>
                <Field label="Specialty">
                  <select value={edit.specialty} onChange={(event) => setEdit({ ...edit, specialty: event.target.value as ServiceKind })}>
                    {SPECIALTIES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="btn-row span-2">
                  <Button
                    size="small"
                    onClick={() => {
                      void onSave({ ...stylist, name: edit.name.trim() || stylist.name, specialty: edit.specialty }).then(() => setEditId(null));
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="row-between">
                <label className="member-main" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={assigned.has(stylist.id)} onChange={() => toggle(stylist.id)} />
                  <span className="avatar">{stylist.name.slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{stylist.name}</strong>
                    <span className="pills">
                      <Pill tone={stylist.specialty}>{serviceLabel(stylist.specialty)}</Pill>
                    </span>
                  </span>
                </label>
                <div className="btn-row">
                  <Button size="small" variant="ghost" onClick={() => { setEditId(stylist.id); setEdit({ name: stylist.name, specialty: stylist.specialty }); }}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => {
                      if (confirmId !== stylist.id) {
                        setConfirmId(stylist.id);
                        return;
                      }
                      void onDelete(stylist.id);
                      setConfirmId(null);
                    }}
                  >
                    {confirmId === stylist.id ? "Confirm" : "Remove"}
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {adding ? (
        <form
          className="card"
          style={{ marginTop: 12 }}
          onSubmit={(event) => {
            event.preventDefault();
            void addAndAssign();
          }}
        >
          <div className="grid-2">
            <Field label="Name">
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Artist name" autoFocus />
            </Field>
            <Field label="Specialty">
              <select value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value as ServiceKind })}>
                {SPECIALTIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Button type="submit" size="small">Add to team</Button>
            <Button type="button" size="small" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)} style={{ width: "100%", marginTop: 12 }}>
          Add artist
        </Button>
      )}
      {roster.length === 0 && !adding ? <p className="center-note">Add your artists once. Assign them per event.</p> : null}
    </section>
  );
}
