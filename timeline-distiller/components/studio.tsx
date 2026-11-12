"use client";

import { useEffect, useState } from "react";
import { DaySheetView } from "@/components/day-sheet";
import { applyDetector, assembleSheet } from "@/lib/assemble";
import { parseFormalsReference, parseManualList } from "@/lib/formals";
import { sheetToIcs } from "@/lib/ics";
import { buildDemoSheet, SAMPLE_FORMALS_TEXT, SAMPLE_SOURCE } from "@/lib/sample";
import { sheetToText, viewLabel } from "@/lib/sheet-text";
import { clearPersisted, emptyPersisted, loadPersisted, savePersisted } from "@/lib/storage";
import type { DaySheet, FormalGroup, ModelExtraction, RejectedItem, View } from "@/lib/types";

export function Studio() {
  const [ready, setReady] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [formalsRef, setFormalsRef] = useState("");
  const [manualGroups, setManualGroups] = useState("");
  const [baseMinutes, setBaseMinutes] = useState(2);
  const [travelBufferMinutes, setTravelBufferMinutes] = useState(15);
  const [view, setView] = useState<View>("all");
  const [sheet, setSheet] = useState<DaySheet | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadPersisted();
    setSourceText(saved.sourceText);
    setFormalsRef(saved.formalsRef);
    setManualGroups(saved.manualGroups);
    setBaseMinutes(saved.baseMinutes);
    setTravelBufferMinutes(saved.travelBufferMinutes);
    setView(saved.view);
    setSheet(saved.sheet ? applyDetector(saved.sheet) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePersisted({
      version: 1,
      sourceText,
      formalsRef,
      manualGroups,
      baseMinutes,
      travelBufferMinutes,
      view,
      sheet,
    });
  }, [ready, sourceText, formalsRef, manualGroups, baseMinutes, travelBufferMinutes, view, sheet]);

  function commit(next: DaySheet) {
    setSheet(applyDetector(next));
  }

  function updateMinutes(value: number) {
    const next = clamp(value, 0.5, 30);
    setBaseMinutes(next);
    setSheet((current) => (current ? applyDetector({ ...current, baseMinutes: next }) : current));
  }

  function updateBuffer(value: number) {
    const next = clamp(value, 0, 120);
    setTravelBufferMinutes(next);
    setSheet((current) => (current ? applyDetector({ ...current, travelBufferMinutes: next }) : current));
  }

  function loadDemo() {
    setSourceText(SAMPLE_SOURCE);
    setManualGroups(SAMPLE_FORMALS_TEXT);
    setFormalsRef("");
    setFile(null);
    setBaseMinutes(2);
    setTravelBufferMinutes(15);
    setView("all");
    setEditing(false);
    setError(null);
    setSheet(buildDemoSheet());
    setStatus("Demo loaded. Names are fictional and no model was called.");
    scrollToSheet();
  }

  function reset() {
    const empty = emptyPersisted();
    setSourceText(empty.sourceText);
    setFormalsRef(empty.formalsRef);
    setManualGroups(empty.manualGroups);
    setBaseMinutes(empty.baseMinutes);
    setTravelBufferMinutes(empty.travelBufferMinutes);
    setView(empty.view);
    setSheet(null);
    setFile(null);
    setEditing(false);
    setError(null);
    setStatus(null);
    clearPersisted();
  }

  async function onExtract(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const body = new FormData();
      if (file) body.set("file", file);
      else body.set("sourceText", sourceText);
      const response = await fetch("/api/extract", { method: "POST", body });
      const payload = (await response.json()) as {
        error?: string;
        extraction?: ModelExtraction;
        rejected?: RejectedItem[];
        sourceText?: string;
        sourceKind?: string;
      };
      if (!response.ok || !payload.extraction || !payload.rejected) {
        throw new Error(payload.error || "Could not distill that timeline.");
      }

      let groups: FormalGroup[] = [];
      let formalsError: string | null = null;
      try {
        groups = await resolveGroups(manualGroups, formalsRef);
      } catch (caught) {
        formalsError = caught instanceof Error ? caught.message : "Could not load the shot list.";
      }

      const next = assembleSheet({
        extraction: payload.extraction,
        rejected: payload.rejected,
        groups,
        baseMinutes,
        travelBufferMinutes,
        sourceName: file?.name || "Pasted text",
        demo: false,
      });
      if (payload.sourceKind === "transcription" && payload.sourceText) setSourceText(payload.sourceText);
      setSheet(next);
      setEditing(false);
      setError(formalsError);
      setStatus(formalsError ? "Sheet is ready. The shot list did not load." : "Sheet is ready.");
      scrollToSheet();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not distill that timeline.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    if (!sheet) return;
    try {
      await navigator.clipboard.writeText(sheetToText(sheet, view));
      setStatus(`Copied the ${viewLabel(view).toLowerCase()} as text.`);
      setError(null);
    } catch {
      setError("Clipboard is blocked in this browser. Select the sheet and copy it yourself.");
    }
  }

  function downloadIcs() {
    if (!sheet) return;
    const ics = sheetToIcs(sheet, view);
    if (!ics) {
      setError("Add a date the sheet can read, and at least one timed item, before exporting a calendar.");
      return;
    }
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "photo-timeline.ics";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Calendar file downloaded. Times are floating local times.");
    setError(null);
  }

  if (!ready) {
    return <p className="loading">Opening the sheet saved on this device…</p>;
  }

  return (
    <>
      <a className="skip" href="#day-sheet">
        Skip to the day-of sheet
      </a>
      <header className="top no-print">
        <h1 className="brand">
          Timeline Distiller
          <span>Photographer day-of sheet for Marco Wang Photography</span>
        </h1>
        <button type="button" className="texty" onClick={reset}>
          Clear this browser
        </button>
      </header>
      <main className="layout">
        <form className="panel no-print" onSubmit={onExtract}>
          <p className="hint">
            Paste the planner timeline or upload a PDF, Word doc, text file, or photo. Vendor noise stays off
            the sheet. A photo needs an AI Gateway key. The demo does not.
          </p>
          <div className="grid">
            <label>
              <span>Planner timeline</span>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Paste the run of show, vendor notes and all."
              />
            </label>
            <label>
              <span>Or upload a file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="split">
              <label className="short">
                <span>Formals link, slug, or JSON</span>
                <textarea
                  value={formalsRef}
                  onChange={(event) => setFormalsRef(event.target.value)}
                  placeholder="https://…/wedding-shot-list.html?e=couple-slug"
                />
              </label>
              <label className="short">
                <span>Or type groups, one per line</span>
                <textarea
                  value={manualGroups}
                  onChange={(event) => setManualGroups(event.target.value)}
                  placeholder={"The Couple — Priya & Elias\nBoth families — Priya, Elias, Anjali, Dev"}
                />
              </label>
            </div>
          </div>
          <p className="hint">
            A manual list is used when it has any lines. Otherwise the link or JSON is fetched read-only from
            the Formals tool. Nothing is stored on the server.
          </p>
          <div className="row">
            <button type="submit" className="solid" disabled={busy || (!file && !sourceText.trim())}>
              {busy ? "Distilling…" : "Distill timeline"}
            </button>
            <button type="button" className="ghost" onClick={loadDemo}>
              Load demo
            </button>
            {file ? <span className="hint">{file.name} replaces the paste for this run.</span> : null}
          </div>
          {error ? <p className="alert" role="alert">{error}</p> : null}
          {status ? <p className="note" role="status">{status}</p> : null}
        </form>

        {sheet ? (
          <>
            <div className="toolbar no-print">
              <div className="views" role="radiogroup" aria-label="Shooter view">
                {(["all", "lead", "second"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={view === option}
                    onClick={() => setView(option)}
                  >
                    {viewLabel(option)}
                  </button>
                ))}
              </div>
              <button type="button" className={editing ? "solid" : "ghost"} aria-pressed={editing} onClick={() => setEditing((on) => !on)}>
                {editing ? "Done editing" : "Edit"}
              </button>
              <button type="button" className="ghost" onClick={copyText}>
                Copy text
              </button>
              <button type="button" className="ghost" onClick={downloadIcs}>
                Download .ics
              </button>
              <button type="button" className="ghost" onClick={() => window.print()}>
                Print / PDF
              </button>
              <div className="timing">
                <label>
                  Min / small group
                  <input
                    type="number"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={baseMinutes}
                    aria-label="Minutes for a small formal group"
                    onChange={(event) => updateMinutes(Number(event.target.value))}
                  />
                </label>
                <label>
                  Travel buffer
                  <input
                    type="number"
                    min={0}
                    max={120}
                    step={5}
                    value={travelBufferMinutes}
                    aria-label="Travel buffer in minutes"
                    onChange={(event) => updateBuffer(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>
            <DaySheetView sheet={sheet} view={view} editing={editing} onChange={commit} />
          </>
        ) : null}
      </main>
    </>
  );
}

async function resolveGroups(manualGroups: string, formalsRef: string): Promise<FormalGroup[]> {
  if (manualGroups.trim()) return parseManualList(manualGroups);
  if (!formalsRef.trim()) return [];
  const reference = parseFormalsReference(formalsRef);
  if (reference.type === "invalid") throw new Error(reference.error);
  if (reference.type === "json") return reference.parsed.groups;
  const response = await fetch(`/api/formals?slug=${encodeURIComponent(reference.slug)}`);
  const payload = (await response.json()) as { error?: string; groups?: FormalGroup[] };
  if (!response.ok || !payload.groups) throw new Error(payload.error || "Could not load that shot list.");
  return payload.groups;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function scrollToSheet() {
  window.setTimeout(() => {
    document.getElementById("day-sheet")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}
