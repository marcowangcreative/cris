import { numberSource } from "./prompt";
import { parseClock } from "./time";
import type { Cited, ModelBeat, ModelExtraction, RejectedItem } from "./types";

const VENDOR_NOISE =
  /\b(catering|linen|florist|bartender|bartenders|shuttle|chiavari|sound check|rentals)\b/i;

export function isVendorNoise(title: string): boolean {
  return VENDOR_NOISE.test(title);
}

type Line = { line: number; text: string };

export type GroundedExtraction = {
  extraction: ModelExtraction;
  rejected: RejectedItem[];
};

export function enforceCitations(model: ModelExtraction, source: string): GroundedExtraction {
  const lines = numberSource(source);
  const rejected: RejectedItem[] = [];

  const couple = groundField(
    "Couple",
    model.couple,
    { sourceLine: model.coupleSourceLine, sourceExcerpt: "", inferred: model.coupleInferred },
    lines,
    rejected,
  );
  const date = groundField(
    "Date",
    model.date,
    { sourceLine: model.dateSourceLine, sourceExcerpt: "", inferred: model.dateInferred },
    lines,
    rejected,
  );
  const sunset = groundField(
    "Sunset",
    model.sunsetNote,
    { sourceLine: model.sunsetSourceLine, sourceExcerpt: "", inferred: model.sunsetInferred },
    lines,
    rejected,
  );

  const locations = model.locations.flatMap((location) => {
    const grounded = groundItem(`Location “${location.name || "Untitled"}”`, location, lines, rejected);
    if (!grounded) return [];
    const next = { ...location, ...grounded };
    if (streetNumberMissing(next.address, next.sourceExcerpt) && !next.inferred) {
      next.inferred = true;
    }
    return [next];
  });

  const contacts = model.contacts.flatMap((contact) => {
    const grounded = groundItem(`Contact “${contact.name || contact.role || "Untitled"}”`, contact, lines, rejected);
    if (!grounded) return [];
    const next = { ...contact, ...grounded };
    if (next.phone && !phoneIsOnLine(next.phone, next.sourceExcerpt)) {
      next.phone = "";
      next.inferred = true;
    }
    return [next];
  });

  const constraints = model.constraints.flatMap((constraint) => {
    const grounded = groundItem("Constraint", constraint, lines, rejected);
    if (!grounded) return [];
    return [{ ...constraint, ...grounded }];
  });

  const beats = model.beats.flatMap((beat) => {
    if (!beat.title.trim()) return [];
    if (beat.kind === "other" && isVendorNoise(beat.title)) {
      rejected.push({
        label: beat.title.trim(),
        reason: "Vendor logistics, left off the photo sheet.",
      });
      return [];
    }
    const grounded = groundItem(`“${beat.title.trim()}”`, beat, lines, rejected);
    if (!grounded) return [];
    const next: ModelBeat = { ...beat, ...grounded };
    if (!next.inferred && !timesAreOnLine(next, next.sourceExcerpt)) next.inferred = true;
    return [next];
  });

  const gaps = model.gaps.flatMap((gap) => {
    if (!gap.text.trim()) return [];
    const grounded = groundItem("Planner question", gap, lines, rejected);
    if (!grounded) return [];
    return [{ ...gap, ...grounded }];
  });

  return {
    rejected,
    extraction: {
      ...model,
      couple: couple.value,
      coupleSourceLine: couple.cited.sourceLine,
      coupleSourceExcerpt: couple.cited.sourceExcerpt,
      coupleInferred: couple.cited.inferred,
      date: date.value,
      dateSourceLine: date.cited.sourceLine,
      dateSourceExcerpt: date.cited.sourceExcerpt,
      dateInferred: date.cited.inferred,
      sunsetNote: sunset.value || "Check sunset.",
      sunsetSourceLine: sunset.cited.sourceLine,
      sunsetSourceExcerpt: sunset.cited.sourceExcerpt,
      sunsetInferred: sunset.cited.inferred,
      locations,
      contacts,
      constraints,
      beats,
      gaps,
    },
  };
}

function groundField(
  label: string,
  value: string,
  cited: Cited,
  lines: Line[],
  rejected: RejectedItem[],
): { value: string; cited: Cited } {
  if (cited.sourceLine == null) {
    return { value: value.trim(), cited: { sourceLine: null, sourceExcerpt: "", inferred: true } };
  }
  const line = lines[cited.sourceLine - 1];
  if (!line) {
    rejected.push({
      label,
      reason: `Cited line ${cited.sourceLine}, which is not in the source, so it is marked inferred.`,
    });
    return { value: value.trim(), cited: { sourceLine: null, sourceExcerpt: "", inferred: true } };
  }
  return {
    value: value.trim(),
    cited: {
      sourceLine: cited.sourceLine,
      sourceExcerpt: line.text.trim() || "(blank line)",
      inferred: cited.inferred,
    },
  };
}

function groundItem<T extends Cited>(
  label: string,
  item: T,
  lines: Line[],
  rejected: RejectedItem[],
): Cited | null {
  if (item.sourceLine == null) {
    return { sourceLine: null, sourceExcerpt: "", inferred: true };
  }
  const line = lines[item.sourceLine - 1];
  if (!line) {
    if (item.inferred) return { sourceLine: null, sourceExcerpt: "", inferred: true };
    rejected.push({
      label,
      reason: `Cited line ${item.sourceLine}, which is not in the source, so it was dropped.`,
    });
    return null;
  }
  return {
    sourceLine: item.sourceLine,
    sourceExcerpt: line.text.trim() || "(blank line)",
    inferred: item.inferred,
  };
}

function timesAreOnLine(beat: Pick<ModelBeat, "time" | "endTime">, line: string): boolean {
  return clockOnLine(beat.time, line) && clockOnLine(beat.endTime, line);
}

function clockOnLine(clock: string, line: string): boolean {
  const trimmed = clock.trim();
  if (!trimmed) return true;
  const minutes = parseClock(trimmed);
  if (minutes == null) return line.toLowerCase().includes(trimmed.toLowerCase());
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  const mm = String(minute).padStart(2, "0");
  const variants = [`${hour12}:${mm}`, `${hour24}:${mm}`, `${String(hour24).padStart(2, "0")}:${mm}`];
  const haystack = line.toLowerCase();
  return variants.some((variant) => haystack.includes(variant.toLowerCase()));
}

function phoneIsOnLine(phone: string, line: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return true;
  return line.replace(/\D/g, "").includes(digits);
}

function streetNumberMissing(address: string, line: string): boolean {
  const number = address.match(/\d{2,}/);
  if (!number) return false;
  return !line.includes(number[0]);
}
