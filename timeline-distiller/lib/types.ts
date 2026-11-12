export type Assignee = "lead" | "second" | "both";

export type View = "lead" | "second" | "all";

export type BeatKind =
  | "details"
  | "getting-ready"
  | "first-look"
  | "ceremony"
  | "family-formals"
  | "portraits"
  | "sunset"
  | "grand-entrance"
  | "toasts"
  | "first-dance"
  | "cake"
  | "send-off"
  | "other";

export type ConstraintKind = "no-flash" | "unplugged" | "officiant" | "other";

export type Segment =
  | "details"
  | "getting-ready"
  | "first-look"
  | "ceremony"
  | "portraits"
  | "reception";

export type Cited = {
  sourceLine: number | null;
  sourceExcerpt: string;
  inferred: boolean;
};

export type ModelBeat = Cited & {
  kind: BeatKind;
  time: string;
  endTime: string;
  title: string;
  location: string;
  address: string;
  whatToShoot: string;
  people: string;
  assignee: Assignee;
  assigneeInferred: boolean;
};

export type ModelExtraction = {
  couple: string;
  coupleSourceLine: number | null;
  coupleSourceExcerpt: string;
  coupleInferred: boolean;
  date: string;
  dateSourceLine: number | null;
  dateSourceExcerpt: string;
  dateInferred: boolean;
  sunsetNote: string;
  sunsetSourceLine: number | null;
  sunsetSourceExcerpt: string;
  sunsetInferred: boolean;
  transcription: string;
  locations: Array<Cited & { name: string; address: string; role: string }>;
  contacts: Array<Cited & { role: string; name: string; phone: string }>;
  constraints: Array<Cited & { kind: ConstraintKind; text: string }>;
  beats: ModelBeat[];
  gaps: Array<Cited & { text: string; severity: "ask" | "warning" }>;
};

export type Beat = ModelBeat & { id: string };

export type Location = ModelExtraction["locations"][number] & { id: string };
export type Contact = ModelExtraction["contacts"][number] & { id: string };
export type Constraint = ModelExtraction["constraints"][number] & { id: string };

export type Gap = {
  id: string;
  text: string;
  severity: "ask" | "warning";
  source: "detector" | "model";
  sourceLine: number | null;
  sourceExcerpt: string;
  inferred: boolean;
};

export type FormalSide = "bride" | "groom" | "both" | "manual";

export type FormalGroup = {
  id: string;
  label: string;
  people: string;
  count: number;
  side: FormalSide;
};

export type FormalSlot = FormalGroup & {
  minutes: number;
  start: number | null;
  end: number | null;
  overflows: boolean;
};

export type SlotResult = {
  slots: FormalSlot[];
  totalMinutes: number;
  windowMinutes: number | null;
  windowStart: number | null;
  windowEnd: number | null;
  warning: string | null;
};

export type ChecklistItem = {
  id: string;
  segment: Segment;
  text: string;
  assignee: Assignee;
  done: boolean;
};

export type RejectedItem = {
  label: string;
  reason: string;
};

export type DaySheet = {
  couple: string;
  coupleInferred: boolean;
  coupleSourceLine: number | null;
  coupleSourceExcerpt: string;
  date: string;
  dateInferred: boolean;
  dateSourceLine: number | null;
  dateSourceExcerpt: string;
  sunsetNote: string;
  sunsetInferred: boolean;
  sunsetSourceLine: number | null;
  sunsetSourceExcerpt: string;
  locations: Location[];
  contacts: Contact[];
  constraints: Constraint[];
  beats: Beat[];
  modelGaps: Gap[];
  detectorGaps: Gap[];
  formalGroups: FormalGroup[];
  formalSlots: SlotResult;
  checklist: ChecklistItem[];
  notes: string;
  baseMinutes: number;
  travelBufferMinutes: number;
  rejected: RejectedItem[];
  sourceName: string;
  demo: boolean;
};

export const BEAT_KINDS: BeatKind[] = [
  "details",
  "getting-ready",
  "first-look",
  "ceremony",
  "family-formals",
  "portraits",
  "sunset",
  "grand-entrance",
  "toasts",
  "first-dance",
  "cake",
  "send-off",
  "other",
];

export const SEGMENTS: Segment[] = [
  "details",
  "getting-ready",
  "first-look",
  "ceremony",
  "portraits",
  "reception",
];

export const SEGMENT_LABEL: Record<Segment, string> = {
  details: "Details",
  "getting-ready": "Getting ready",
  "first-look": "First look",
  ceremony: "Ceremony",
  portraits: "Portraits",
  reception: "Reception",
};

export const KIND_LABEL: Record<BeatKind, string> = {
  details: "Details",
  "getting-ready": "Getting ready",
  "first-look": "First look",
  ceremony: "Ceremony",
  "family-formals": "Family formals",
  portraits: "Portraits",
  sunset: "Sunset",
  "grand-entrance": "Grand entrance",
  toasts: "Toasts",
  "first-dance": "First dance",
  cake: "Cake",
  "send-off": "Send-off",
  other: "Other",
};
