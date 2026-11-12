"use client";

import { useMemo, useState } from "react";
import { copyText } from "@/lib/download";
import { PACKING_CATEGORIES, packingSuggestions } from "@/lib/packing";
import type { PackState, PlannerEvent } from "@/lib/types";
import { Button } from "./ui";

export function PackingList({
  event,
  onChange,
}: {
  event: PlannerEvent;
  onChange: (pack: PackState) => void;
}) {
  const pack = event.packState;
  const suggestions = useMemo(() => packingSuggestions(event.members, event), [event]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  function patch(partial: Partial<PackState>) {
    onChange({ ...pack, ...partial });
  }

  const hiddenCount = Object.values(pack.hidden).filter(Boolean).length;
  let total = suggestions.length;
  let checked = Object.values(pack.smartChecked).filter(Boolean).length;
  for (const category of PACKING_CATEGORIES) {
    const visible = category.items.filter((item) => !pack.hidden[`${category.id}::${item}`]);
    const custom = pack.customItems[category.id] ?? [];
    total += visible.length + custom.length;
    checked += [...visible, ...custom].filter((item) => pack.checked[`${category.id}::${item}`]).length;
  }
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

  async function copyList() {
    const lines = [`${event.coupleName || "Event"} — packing list`, ""];
    if (suggestions.length) {
      lines.push("Event-specific");
      suggestions.forEach((item, index) => lines.push(`${pack.smartChecked[String(index)] ? "[x]" : "[ ]"} ${item.text}`));
      lines.push("");
    }
    for (const category of PACKING_CATEGORIES) {
      lines.push(category.label);
      const items = [
        ...category.items.filter((item) => !pack.hidden[`${category.id}::${item}`]),
        ...(pack.customItems[category.id] ?? []),
      ];
      for (const item of items) lines.push(`${pack.checked[`${category.id}::${item}`] ? "[x]" : "[ ]"} ${item}`);
      lines.push("");
    }
    await copyText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <div className="section-title">
        <h2>Packing list</h2>
        <p className="lede">Studio only. Suggestions follow the party size, outdoor ceremonies, and flower girls.</p>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="pack-head">
          <div className="progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <strong>{checked}/{total}</strong>
          <span className="meta">{progress}%</span>
        </div>
      </div>
      {suggestions.length > 0 ? (
        <div className="card" style={{ marginBottom: 12, background: "var(--gold-soft)" }}>
          <strong>For this event</strong>
          <div className="pack-items">
            {suggestions.map((item, index) => {
              const key = String(index);
              return (
                <label key={item.text} className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(pack.smartChecked[key])}
                    onChange={() => patch({ smartChecked: { ...pack.smartChecked, [key]: !pack.smartChecked[key] } })}
                  />
                  <span className={pack.smartChecked[key] ? "struck" : ""}>{item.text}</span>
                  <span className="meta">{item.category}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      {hiddenCount > 0 ? (
        <div style={{ textAlign: "right", marginBottom: 8 }}>
          <Button size="small" variant="ghost" onClick={() => setShowHidden((value) => !value)}>
            {showHidden ? "Hide" : "Show"} {hiddenCount} removed
          </Button>
        </div>
      ) : null}
      {PACKING_CATEGORIES.map((category) => {
        const visible = category.items.filter((item) => !pack.hidden[`${category.id}::${item}`]);
        const hidden = category.items.filter((item) => pack.hidden[`${category.id}::${item}`]);
        const custom = pack.customItems[category.id] ?? [];
        const collapsed = Boolean(pack.collapsed[category.id]);
        return (
          <section key={category.id} className="card" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="pack-head"
              style={{ width: "100%", background: "transparent", border: 0, padding: 0, textAlign: "left" }}
              onClick={() => patch({ collapsed: { ...pack.collapsed, [category.id]: !collapsed } })}
              aria-expanded={!collapsed}
            >
              <strong className="display" style={{ fontSize: 22 }}>{category.label}</strong>
              <span className="meta">{collapsed ? "Show" : "Hide"}</span>
            </button>
            {!collapsed ? (
              <>
                <div className="pack-items">
                  {visible.map((item) => {
                    const key = `${category.id}::${item}`;
                    return (
                      <div key={item} className="row-between">
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={Boolean(pack.checked[key])}
                            onChange={() => patch({ checked: { ...pack.checked, [key]: !pack.checked[key] } })}
                          />
                          <span className={pack.checked[key] ? "struck" : ""}>{item}</span>
                        </label>
                        <Button size="small" variant="ghost" onClick={() => patch({ hidden: { ...pack.hidden, [key]: true } })}>
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                  {showHidden
                    ? hidden.map((item) => (
                        <div key={item} className="row-between">
                          <span className="struck">{item}</span>
                          <Button
                            size="small"
                            variant="ghost"
                            onClick={() => {
                              const next = { ...pack.hidden };
                              delete next[`${category.id}::${item}`];
                              patch({ hidden: next });
                            }}
                          >
                            Restore
                          </Button>
                        </div>
                      ))
                    : null}
                  {custom.map((item, index) => {
                    const key = `${category.id}::${item}`;
                    return (
                      <label key={`${item}-${index}`} className="check">
                        <input
                          type="checkbox"
                          checked={Boolean(pack.checked[key])}
                          onChange={() => patch({ checked: { ...pack.checked, [key]: !pack.checked[key] } })}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="pack-add">
                  <input
                    value={drafts[category.id] ?? ""}
                    aria-label={`Add to ${category.label}`}
                    placeholder="Add an item"
                    onChange={(event) => setDrafts({ ...drafts, [category.id]: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const text = (drafts[category.id] ?? "").trim();
                      if (!text) return;
                      patch({ customItems: { ...pack.customItems, [category.id]: [...custom, text] } });
                      setDrafts({ ...drafts, [category.id]: "" });
                    }}
                  />
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      const text = (drafts[category.id] ?? "").trim();
                      if (!text) return;
                      patch({ customItems: { ...pack.customItems, [category.id]: [...custom, text] } });
                      setDrafts({ ...drafts, [category.id]: "" });
                    }}
                  >
                    Add
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        );
      })}
      <div className="btn-row" style={{ justifyContent: "space-between", marginTop: 12 }}>
        <Button variant="ghost" onClick={() => patch({ checked: {}, smartChecked: {} })}>Reset checks</Button>
        <Button variant="secondary" onClick={() => void copyList()}>{copied ? "Copied" : "Copy list"}</Button>
      </div>
    </section>
  );
}
