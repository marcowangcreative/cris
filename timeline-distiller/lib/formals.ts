import type { FormalGroup, FormalSide } from "./types";

export type FormalsState = {
  bride?: string;
  groom?: string;
  brideMom?: string;
  brideDad?: string;
  groomMom?: string;
  groomDad?: string;
  officiant?: string;
  brideSiblings?: string[];
  groomSiblings?: string[];
  brideGrandparents?: string[];
  groomGrandparents?: string[];
  brideExtended?: string[];
  groomExtended?: string[];
  bridesmaids?: string[];
  groomsmen?: string[];
  disabled?: Record<string, boolean>;
  custom?: string[];
  sortMode?: string;
  customOrder?: string[];
  eventDate?: string;
  couple_names?: string;
};

export type ParsedFormals = {
  coupleNames: string;
  eventDate: string;
  groups: FormalGroup[];
};

type Shot = {
  id: string;
  side: Exclude<FormalSide, "manual">;
  label: string;
  people: string;
  count: number;
};

const STOP_WORDS = new Set(["the", "at", "in", "room", "suite"]);

export function countNames(text: string): number {
  const plain = text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const parts = plain
    .split(/\s*(?:,|&|\+|\/)\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(parts.length, 1);
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function listOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => textOf(item)).filter(Boolean);
}

function person(value: unknown, fallback: string): string {
  return textOf(value) || fallback;
}

function peopleList(value: unknown, fallback: string): string {
  const names = listOf(value);
  return names.length ? names.join(" & ") : fallback;
}

/** Same call-out list the Formals tool builds in wedding-shot-list.html. */
export function shotsFromFormalsState(raw: FormalsState): Shot[] {
  const bride = person(raw.bride, "Bride");
  const groom = person(raw.groom, "Groom");
  const couple = `${bride} + ${groom}`;
  const brideParents = `${person(raw.brideMom, "Bride's Mom")} + ${person(raw.brideDad, "Bride's Dad")}`;
  const groomParents = `${person(raw.groomMom, "Groom's Mom")} + ${person(raw.groomDad, "Groom's Dad")}`;
  const shots: Omit<Shot, "count">[] = [
    { id: "a1", side: "both", label: "The Couple", people: couple },
    { id: "a2", side: "both", label: "Both Families", people: `${couple} + ${brideParents} + ${groomParents}` },
    { id: "b1", side: "bride", label: "Bride's Parents", people: `${couple} + ${brideParents}` },
    { id: "b2", side: "bride", label: "Bride with Mom", people: `${bride} + ${person(raw.brideMom, "Bride's Mom")}` },
    { id: "b3", side: "bride", label: "Bride with Dad", people: `${bride} + ${person(raw.brideDad, "Bride's Dad")}` },
    { id: "b4", side: "bride", label: "Bride with Both Parents", people: `${bride} + ${brideParents}` },
    { id: "c1", side: "groom", label: "Groom's Parents", people: `${couple} + ${groomParents}` },
    { id: "c2", side: "groom", label: "Groom with Mom", people: `${groom} + ${person(raw.groomMom, "Groom's Mom")}` },
    { id: "c3", side: "groom", label: "Groom with Dad", people: `${groom} + ${person(raw.groomDad, "Groom's Dad")}` },
    { id: "c4", side: "groom", label: "Groom with Both Parents", people: `${groom} + ${groomParents}` },
    {
      id: "d1",
      side: "bride",
      label: "Bride's Immediate Family",
      people: `${couple} + ${brideParents} + ${peopleList(raw.brideSiblings, "Bride's siblings")}`,
    },
    {
      id: "d2",
      side: "bride",
      label: "Bride with Siblings",
      people: `${bride} + ${peopleList(raw.brideSiblings, "Bride's siblings")}`,
    },
    {
      id: "e1",
      side: "groom",
      label: "Groom's Immediate Family",
      people: `${couple} + ${groomParents} + ${peopleList(raw.groomSiblings, "Groom's siblings")}`,
    },
    {
      id: "e2",
      side: "groom",
      label: "Groom with Siblings",
      people: `${groom} + ${peopleList(raw.groomSiblings, "Groom's siblings")}`,
    },
    {
      id: "f1",
      side: "both",
      label: "All Siblings Together",
      people: `${couple} + ${peopleList([...(raw.brideSiblings ?? []), ...(raw.groomSiblings ?? [])], "all siblings")}`,
    },
    {
      id: "g1",
      side: "bride",
      label: "Bride's Grandparents",
      people: `${couple} + ${peopleList(raw.brideGrandparents, "Bride's grandparents")}`,
    },
    {
      id: "g2",
      side: "groom",
      label: "Groom's Grandparents",
      people: `${couple} + ${peopleList(raw.groomGrandparents, "Groom's grandparents")}`,
    },
    {
      id: "g3",
      side: "bride",
      label: "Bride's Extended Family",
      people: `${couple} + ${brideParents} + ${peopleList(raw.brideSiblings, "Bride's siblings")} + ${peopleList(raw.brideExtended, "Bride's extended family")}`,
    },
    {
      id: "g4",
      side: "groom",
      label: "Groom's Extended Family",
      people: `${couple} + ${groomParents} + ${peopleList(raw.groomSiblings, "Groom's siblings")} + ${peopleList(raw.groomExtended, "Groom's extended family")}`,
    },
    {
      id: "h1",
      side: "both",
      label: "Full Wedding Party",
      people: `${couple} + ${peopleList(raw.bridesmaids, "bridesmaids")} + ${peopleList(raw.groomsmen, "groomsmen")}`,
    },
    { id: "h2", side: "bride", label: "Bride + Bridesmaids", people: `${bride} + ${peopleList(raw.bridesmaids, "bridesmaids")}` },
    { id: "h3", side: "groom", label: "Groom + Groomsmen", people: `${groom} + ${peopleList(raw.groomsmen, "groomsmen")}` },
    { id: "i1", side: "both", label: "With the Officiant", people: `${couple} + ${person(raw.officiant, "Officiant")}` },
  ];

  listOf(raw.custom).forEach((custom, index) => {
    shots.push({ id: `custom_${index}`, side: "both", label: "Custom", people: custom });
  });

  const withCount = shots.map((shot) => ({ ...shot, count: countNames(shot.people) }));
  const disabled = raw.disabled ?? {};
  const enabled = orderShots(withCount, raw).filter((shot) => !disabled[shot.id]);
  return enabled;
}

function orderShots(shots: Shot[], raw: FormalsState): Shot[] {
  const mode = raw.sortMode || "default";
  if (mode === "largest") return shots.toSorted((a, b) => b.count - a.count);
  if (mode === "smallest") return shots.toSorted((a, b) => a.count - b.count);
  if (mode === "efficient" || mode === "efficient-bride") {
    const first: Shot["side"] = mode === "efficient-bride" ? "bride" : "groom";
    const second: Shot["side"] = first === "groom" ? "bride" : "groom";
    const bySide = (side: Shot["side"]) =>
      shots.filter((shot) => shot.side === side).toSorted((a, b) => b.count - a.count);
    return [...bySide("both"), ...bySide(first), ...bySide(second)];
  }
  if (mode === "custom") {
    const order = [...(raw.customOrder ?? [])];
    for (const shot of shots) {
      if (!order.includes(shot.id)) order.push(shot.id);
    }
    const rank = new Map(order.map((id, index) => [id, index]));
    return shots.toSorted((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }
  return shots;
}

export function groupsFromFormalsState(raw: FormalsState): FormalGroup[] {
  return shotsFromFormalsState(raw).map((shot) => ({
    id: shot.id,
    label: shot.label,
    people: shot.people,
    count: shot.count,
    side: shot.side,
  }));
}

function coupleFromState(state: FormalsState, coupleNames: string): string {
  if (coupleNames.trim()) return coupleNames.trim();
  const bride = textOf(state.bride);
  const groom = textOf(state.groom);
  if (bride && groom) return `${bride} & ${groom}`;
  return bride || groom || "";
}

function isState(value: unknown): value is FormalsState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    "bride" in record ||
    "groom" in record ||
    "bridesmaids" in record ||
    "disabled" in record ||
    "custom" in record
  );
}

function groupsFromExport(value: unknown): FormalGroup[] | null {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { groups?: unknown }).groups)
      ? (value as { groups: unknown[] }).groups
      : null;
  if (!rows) return null;
  const groups: FormalGroup[] = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const record = row as Record<string, unknown>;
    const label = textOf(record.label) || textOf(record.name) || `Group ${index + 1}`;
    const people = textOf(record.people) || textOf(record.text) || textOf(record.names) || label;
    const side = record.side === "bride" || record.side === "groom" || record.side === "both"
      ? record.side
      : "manual";
    groups.push({
      id: textOf(record.id) || `import-${index + 1}`,
      label,
      people,
      count: typeof record.count === "number" && record.count > 0 ? record.count : countNames(people),
      side,
    });
  });
  return groups;
}

export function parseFormalsPayload(value: unknown): ParsedFormals | null {
  if (Array.isArray(value)) {
    if (value.length === 1) return parseFormalsPayload(value[0]);
    const groups = groupsFromExport(value);
    return groups ? { coupleNames: "", eventDate: "", groups } : null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (record.data && typeof record.data === "object") {
    const state = record.data as FormalsState;
    return {
      coupleNames: coupleFromState(state, textOf(record.couple_names) || textOf(record.coupleNames)),
      eventDate: textOf(state.eventDate),
      groups: groupsFromFormalsState(state),
    };
  }

  if (isState(record)) {
    return {
      coupleNames: coupleFromState(record, textOf(record.couple_names)),
      eventDate: textOf(record.eventDate),
      groups: groupsFromFormalsState(record),
    };
  }

  const groups = groupsFromExport(record);
  if (!groups) return null;
  return {
    coupleNames: textOf(record.couple_names) || textOf(record.coupleNames) || textOf(record.couple),
    eventDate: textOf(record.eventDate),
    groups,
  };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type FormalsReference =
  | { type: "slug"; slug: string }
  | { type: "json"; parsed: ParsedFormals }
  | { type: "invalid"; error: string };

export function parseFormalsReference(input: string): FormalsReference {
  const trimmed = input.trim();
  if (!trimmed) return { type: "invalid", error: "Paste a formals link, slug, or JSON." };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = parseFormalsPayload(JSON.parse(trimmed));
      if (!parsed) return { type: "invalid", error: "That JSON isn't a formals shot list." };
      return { type: "json", parsed };
    } catch {
      return { type: "invalid", error: "That JSON could not be read." };
    }
  }

  const fromQuery = trimmed.match(/[?&](?:e|event)=([a-z0-9-]+)/i);
  if (fromQuery) return { type: "slug", slug: fromQuery[1].toLowerCase() };

  try {
    const url = new URL(trimmed);
    const slug = url.searchParams.get("e") || url.searchParams.get("event");
    if (slug && SLUG.test(slug.toLowerCase())) return { type: "slug", slug: slug.toLowerCase() };
  } catch {
    // Not a URL. Fall through to a bare slug.
  }

  const slug = trimmed.toLowerCase();
  if (SLUG.test(slug) && slug.includes("-")) return { type: "slug", slug };
  return {
    type: "invalid",
    error: "Use a formals share link, its slug, or a JSON export. Or type groups in the manual list.",
  };
}

export function parseManualList(text: string): FormalGroup[] {
  const groups: FormalGroup[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const split = line.split(/\s*(?:—|–|:)\s+|\s+-\s+/, 2);
    const label = (split[0] || line).trim();
    const people = (split[1] || label).trim();
    groups.push({
      id: `manual-${groups.length + 1}`,
      label,
      people,
      count: countNames(people),
      side: "manual",
    });
  }
  return groups;
}

export function samePlace(a: string, b: string): boolean {
  const left = placeTokens(a);
  const right = placeTokens(b);
  if (!left.length || !right.length) return false;
  if (left.join(" ") === right.join(" ")) return true;
  const phraseA = left.slice(0, 2).join(" ");
  const phraseB = right.slice(0, 2).join(" ");
  if (phraseA.length >= 6 && right.join(" ").includes(phraseA)) return true;
  if (phraseB.length >= 6 && left.join(" ").includes(phraseB)) return true;
  return false;
}

function placeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}
