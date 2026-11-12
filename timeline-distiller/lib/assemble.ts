import { detectConflicts, formalsWindowFromBeats } from "./conflicts";
import { defaultChecklist } from "./checklist";
import { slotFormals } from "./slotting";
import type {
  Beat,
  ChecklistItem,
  Contact,
  Constraint,
  DaySheet,
  FormalGroup,
  Gap,
  Location,
  ModelExtraction,
  RejectedItem,
} from "./types";

let counter = 0;

export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}`;
}

export function assembleSheet(input: {
  extraction: ModelExtraction;
  rejected: RejectedItem[];
  groups: FormalGroup[];
  checklist?: ChecklistItem[];
  baseMinutes: number;
  travelBufferMinutes: number;
  sourceName: string;
  demo: boolean;
  notes?: string;
}): DaySheet {
  const extraction = input.extraction;
  const draft: DaySheet = {
    couple: extraction.couple,
    coupleInferred: extraction.coupleInferred,
    coupleSourceLine: extraction.coupleSourceLine,
    coupleSourceExcerpt: extraction.coupleSourceExcerpt,
    date: extraction.date,
    dateInferred: extraction.dateInferred,
    dateSourceLine: extraction.dateSourceLine,
    dateSourceExcerpt: extraction.dateSourceExcerpt,
    sunsetNote: extraction.sunsetNote || "Check sunset.",
    sunsetInferred: extraction.sunsetInferred,
    sunsetSourceLine: extraction.sunsetSourceLine,
    sunsetSourceExcerpt: extraction.sunsetSourceExcerpt,
    locations: extraction.locations.map((location, index) => ({ ...location, id: `loc-${index + 1}` })),
    contacts: extraction.contacts.map((contact, index) => ({ ...contact, id: `contact-${index + 1}` })),
    constraints: extraction.constraints.map((constraint, index) => ({
      ...constraint,
      id: `rule-${index + 1}`,
    })),
    beats: extraction.beats.map((beat, index) => ({ ...beat, id: `beat-${index + 1}` })),
    modelGaps: extraction.gaps.map((item, index) => ({
      id: `model-gap-${index + 1}`,
      text: item.text,
      severity: item.severity,
      source: "model",
      sourceLine: item.sourceLine,
      sourceExcerpt: item.sourceExcerpt,
      inferred: item.inferred,
    })),
    detectorGaps: [],
    formalGroups: input.groups,
    formalSlots: emptySlots(),
    checklist: input.checklist ?? defaultChecklist(),
    notes: input.notes ?? "",
    baseMinutes: input.baseMinutes,
    travelBufferMinutes: input.travelBufferMinutes,
    rejected: input.rejected,
    sourceName: input.sourceName,
    demo: input.demo,
  };
  fillCoupleFromFormals(draft);
  return applyDetector(draft);
}

function fillCoupleFromFormals(sheet: DaySheet): void {
  if (sheet.couple.trim()) return;
  const named = sheet.formalGroups.find((group) => group.label.toLowerCase().includes("couple"));
  if (named && named.people !== named.label) sheet.couple = named.people;
}

export function applyDetector(sheet: DaySheet): DaySheet {
  const window = formalsWindowFromBeats(sheet.beats);
  const formalSlots = slotFormals(sheet.formalGroups, window, {
    baseMinutes: sheet.baseMinutes,
    largeGroupThreshold: 6,
    extraMinutesPerPerson: 0.5,
  });
  const detectorGaps = detectConflicts({
    beats: sheet.beats,
    slotted: formalSlots,
    travelBufferMinutes: sheet.travelBufferMinutes,
  });
  return { ...sheet, formalSlots, detectorGaps };
}

export function emptySlots(): DaySheet["formalSlots"] {
  return {
    slots: [],
    totalMinutes: 0,
    windowMinutes: null,
    windowStart: null,
    windowEnd: null,
    warning: null,
  };
}

export function blankBeat(): Beat {
  return {
    id: uid("beat"),
    kind: "other",
    time: "",
    endTime: "",
    title: "New item",
    location: "",
    address: "",
    whatToShoot: "",
    people: "",
    assignee: "both",
    assigneeInferred: true,
    sourceLine: null,
    sourceExcerpt: "",
    inferred: true,
  };
}

export function blankContact(): Contact {
  return {
    id: uid("contact"),
    role: "Contact",
    name: "",
    phone: "",
    sourceLine: null,
    sourceExcerpt: "",
    inferred: true,
  };
}

export function blankConstraint(): Constraint {
  return {
    id: uid("rule"),
    kind: "other",
    text: "",
    sourceLine: null,
    sourceExcerpt: "",
    inferred: true,
  };
}

export function blankLocation(): Location {
  return {
    id: uid("loc"),
    name: "",
    address: "",
    role: "",
    sourceLine: null,
    sourceExcerpt: "",
    inferred: true,
  };
}

export function blankGroup(): FormalGroup {
  return { id: uid("group"), label: "New group", people: "", count: 2, side: "manual" };
}

export function blankChecklistItem(segment: ChecklistItem["segment"]): ChecklistItem {
  return { id: uid("shot"), segment, text: "", assignee: "both", done: false };
}

export function visibleTo(assignee: Beat["assignee"], view: "lead" | "second" | "all"): boolean {
  if (view === "all") return true;
  return assignee === view || assignee === "both";
}

export function allGaps(sheet: DaySheet): Gap[] {
  return [...sheet.detectorGaps, ...sheet.modelGaps];
}
