import type { EventDay, Member, PlannerEvent, ServiceKind, Stylist } from "./types";
import { isRole, isService } from "./types";
import { safeHttpUrl } from "./urls";

const MIN_TOKEN_LENGTH = 32;

export interface ClientDay {
  id: string;
  label: string;
  date: string;
  readyBy: string;
  ceremonyTime: string;
}

/** What a client-share token is allowed to see. No prices, packing, or roster beyond the assigned team. */
export interface ClientShare {
  coupleName: string;
  venue: string;
  location: string;
  room: string;
  notes: string;
  days: ClientDay[];
  stylists: Stylist[];
  members: ClientMember[];
}

export interface ClientMember {
  id: string;
  name: string;
  role: Member["role"];
  services: ServiceKind;
  stylistId: string;
  notes: string;
  urls: string[];
  dayIds: string[];
  dayServices: Partial<Record<string, ServiceKind>>;
}

/** Read-only timeline payload. Prices and the packing list stay off this link. */
export interface TimelineShare {
  coupleName: string;
  venue: string;
  location: string;
  room: string;
  notes: string;
  photographer: string;
  videographer: string;
  brideHair: number;
  brideMakeup: number;
  defaultHair: number;
  defaultMakeup: number;
  bufferMins: number;
  brideTouchupMins: number;
  days: EventDay[];
  stylists: Stylist[];
  members: Member[];
}

export function findEventByToken(
  events: readonly PlannerEvent[],
  token: string,
  kind: "client" | "timeline",
): PlannerEvent | null {
  if (!token || token.length < MIN_TOKEN_LENGTH) return null;
  const field = kind === "client" ? "clientToken" : "timelineToken";
  const matches = events.filter((event) => event[field] === token);
  return matches.length === 1 ? matches[0] : null;
}

export function toClientShare(event: PlannerEvent, stylists: readonly Stylist[]): ClientShare {
  const assigned = assignedStylists(event, stylists);
  const dayIds = new Set(event.days.map((day) => day.id));
  return {
    coupleName: event.coupleName,
    venue: event.venue,
    location: event.location,
    room: event.room,
    notes: event.notes,
    days: event.days.map((day) => ({
      id: day.id,
      label: day.label,
      date: day.date,
      readyBy: day.readyBy,
      ceremonyTime: day.ceremonyTime,
    })),
    stylists: assigned,
    members: event.members.map((member) => toClientMember(member, dayIds, assigned)),
  };
}

export function toTimelineShare(event: PlannerEvent, stylists: readonly Stylist[]): TimelineShare {
  const assigned = assignedStylists(event, stylists);
  return {
    coupleName: event.coupleName,
    venue: event.venue,
    location: event.location,
    room: event.room,
    notes: event.notes,
    photographer: event.photographer,
    videographer: event.videographer,
    brideHair: event.brideHair,
    brideMakeup: event.brideMakeup,
    defaultHair: event.defaultHair,
    defaultMakeup: event.defaultMakeup,
    bufferMins: event.bufferMins,
    brideTouchupMins: event.brideTouchupMins,
    days: event.days.map((day) => ({ ...day })),
    stylists: assigned,
    members: event.members.map((member) => ({ ...member, price: 0, urls: member.urls.map((url) => safeHttpUrl(url)).filter((url): url is string => Boolean(url)) })),
  };
}

/**
 * Apply a client party edit. Prices, duration overrides, and stylists outside
 * this event's assigned team are ignored. Other events are not in scope.
 */
export function applyClientMembers(event: PlannerEvent, incoming: readonly ClientMember[], stylists: readonly Stylist[]): Member[] {
  const previous = new Map(event.members.map((member) => [member.id, member]));
  const allowedStylists = new Set(assignedStylists(event, stylists).map((stylist) => stylist.id));
  const dayIds = new Set(event.days.map((day) => day.id));
  return incoming.slice(0, 80).map((member, index) => {
    const existing = member.id ? previous.get(member.id) : undefined;
    const safe = toClientMember(
      {
        id: existing?.id ?? member.id,
        name: member.name,
        role: member.role,
        services: member.services,
        stylistId: member.stylistId,
        notes: member.notes,
        urls: member.urls,
        dayIds: member.dayIds,
        dayServices: member.dayServices,
      },
      dayIds,
      [...allowedStylists].map((id) => stylists.find((stylist) => stylist.id === id)).filter((stylist): stylist is Stylist => Boolean(stylist)),
    );
    return {
      ...safe,
      hairMins: existing?.hairMins ?? 0,
      makeupMins: existing?.makeupMins ?? 0,
      price: existing?.price ?? 0,
      stylistId: safe.stylistId && allowedStylists.has(safe.stylistId) ? safe.stylistId : "",
      id: safe.id || `member-${index + 1}`,
    };
  });
}

function assignedStylists(event: PlannerEvent, stylists: readonly Stylist[]): Stylist[] {
  const ids = new Set(event.stylistIds);
  return stylists.filter((stylist) => ids.has(stylist.id)).map((stylist) => ({
    id: stylist.id,
    name: stylist.name,
    specialty: stylist.specialty,
  }));
}

function toClientMember(
  member: Pick<Member, "id" | "name" | "role" | "services" | "stylistId" | "notes" | "urls" | "dayIds" | "dayServices">,
  dayIds: Set<string>,
  stylists: readonly Stylist[],
): ClientMember {
  const allowed = new Set(stylists.map((stylist) => stylist.id));
  const services = isService(member.services) ? member.services : "both";
  const dayServices: Partial<Record<string, ServiceKind>> = {};
  for (const [dayId, service] of Object.entries(member.dayServices ?? {})) {
    if (dayIds.has(dayId) && service && isService(service)) dayServices[dayId] = service;
  }
  return {
    id: member.id,
    name: (member.name ?? "").slice(0, 120),
    role: isRole(member.role) ? member.role : "other",
    services,
    stylistId: member.stylistId && allowed.has(member.stylistId) ? member.stylistId : "",
    notes: (member.notes ?? "").slice(0, 2000),
    urls: (member.urls ?? []).map((url) => safeHttpUrl(url)).filter((url): url is string => Boolean(url)).slice(0, 12),
    dayIds: (member.dayIds ?? []).filter((id) => dayIds.has(id)),
    dayServices,
  };
}
