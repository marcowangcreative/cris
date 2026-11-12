import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientMember, ClientShare, TimelineShare } from "./access";
import {
  emptyPackState,
  isRole,
  isService,
  isStatus,
  type EventDay,
  type Member,
  type PackState,
  type PlannerEvent,
  type ServiceKind,
  type StudioData,
  type Stylist,
} from "./types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asPack(value: unknown): PackState {
  if (!value || typeof value !== "object") return emptyPackState();
  const record = value as Partial<PackState>;
  return {
    checked: record.checked ?? {},
    smartChecked: record.smartChecked ?? {},
    customItems: record.customItems ?? {},
    collapsed: record.collapsed ?? {},
    hidden: record.hidden ?? {},
  };
}

function asServiceMap(value: unknown): Partial<Record<string, ServiceKind>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Partial<Record<string, ServiceKind>> = {};
  for (const [key, service] of Object.entries(value)) {
    if (typeof service === "string" && isService(service)) next[key] = service;
  }
  return next;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapDay(row: Row): EventDay {
  const date = text(row.date);
  return {
    id: text(row.id),
    label: text(row.label, "Day"),
    date: date.length >= 10 ? date.slice(0, 10) : date,
    ceremonyTime: text(row.ceremony_time),
    readyBy: text(row.ready_by),
    callTime: text(row.call_time),
    travelBufferMins: num(row.travel_buffer_mins),
  };
}

function mapMember(row: Row): Member {
  const role = text(row.role);
  const services = text(row.services);
  return {
    id: text(row.id),
    name: text(row.name),
    role: isRole(role) ? role : "other",
    services: isService(services) ? services : "both",
    stylistId: text(row.stylist_id),
    notes: text(row.notes),
    hairMins: num(row.hair_mins),
    makeupMins: num(row.makeup_mins),
    price: num(row.price),
    urls: asStringList(row.inspo_urls),
    dayIds: asStringList(row.day_ids),
    dayServices: asServiceMap(row.day_services),
  };
}

function mapStylist(row: Row): Stylist | null {
  const specialty = text(row.specialty);
  if (!isService(specialty)) return null;
  return { id: text(row.id), name: text(row.name), specialty };
}

function assemble(events: Row[], days: Row[], members: Row[], links: Row[]): PlannerEvent[] {
  const daysByEvent = new Map<string, EventDay[]>();
  for (const row of days) {
    const eventId = text(row.event_id);
    const list = daysByEvent.get(eventId) ?? [];
    list.push(mapDay(row));
    daysByEvent.set(eventId, list);
  }
  const membersByEvent = new Map<string, Member[]>();
  for (const row of members) {
    const eventId = text(row.event_id);
    const list = membersByEvent.get(eventId) ?? [];
    list.push(mapMember(row));
    membersByEvent.set(eventId, list);
  }
  const stylistsByEvent = new Map<string, string[]>();
  for (const row of links) {
    const eventId = text(row.event_id);
    const list = stylistsByEvent.get(eventId) ?? [];
    list.push(text(row.stylist_id));
    stylistsByEvent.set(eventId, list);
  }

  return events.map((row) => {
    const id = text(row.id);
    const status = text(row.status);
    return {
      id,
      status: isStatus(status) ? status : "pending",
      coupleName: text(row.couple_name),
      venue: text(row.venue),
      location: text(row.location),
      room: text(row.room),
      photographer: text(row.photographer),
      videographer: text(row.videographer),
      notes: text(row.notes),
      isOutdoor: Boolean(row.is_outdoor),
      hasExtensions: Boolean(row.has_extensions),
      brideHair: num(row.bride_hair, 90),
      brideMakeup: num(row.bride_makeup, 60),
      defaultHair: num(row.default_hair, 45),
      defaultMakeup: num(row.default_makeup, 30),
      bufferMins: num(row.buffer_mins, 10),
      brideTouchupMins: num(row.bride_touchup_mins, 15),
      days: daysByEvent.get(id) ?? [],
      members: membersByEvent.get(id) ?? [],
      stylistIds: stylistsByEvent.get(id) ?? [],
      packState: asPack(row.pack_state),
      lastStep: num(row.last_step, 1),
      clientToken: text(row.client_token),
      timelineToken: text(row.timeline_token),
      createdAt: text(row.created_at),
    };
  });
}

function unwrap<T>(result: { data: T; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

export async function fetchStudio(supabase: SupabaseClient): Promise<StudioData> {
  const [profile, stylists, events, days, members, links] = await Promise.all([
    supabase.from("profiles").select("studio_name").maybeSingle(),
    supabase.from("stylists").select("id, name, specialty").order("created_at"),
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("event_days").select("*").order("sort_order"),
    supabase.from("event_members").select("*").order("sort_order"),
    supabase.from("event_stylists").select("event_id, stylist_id"),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  return {
    studioName: text(profile.data?.studio_name, "My studio"),
    stylists: (unwrap(stylists, "Team") as Row[]).map(mapStylist).filter((item): item is Stylist => Boolean(item)),
    events: assemble(
      unwrap(events, "Events") as Row[],
      unwrap(days, "Days") as Row[],
      unwrap(members, "Party") as Row[],
      unwrap(links, "Assignments") as Row[],
    ),
  };
}

export async function persistEvent(supabase: SupabaseClient, event: PlannerEvent): Promise<void> {
  const { error } = await supabase.rpc("upsert_event", { payload: event });
  if (error) throw new Error(error.message);
}

export async function removeEvent(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function persistStylist(supabase: SupabaseClient, stylist: Stylist): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) throw new Error(userError?.message ?? "Not signed in");
  const { error } = await supabase.from("stylists").upsert({
    id: stylist.id,
    owner_id: data.user.id,
    name: stylist.name,
    specialty: stylist.specialty,
  });
  if (error) throw new Error(error.message);
}

export async function removeStylist(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("stylists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchClientShare(supabase: SupabaseClient, token: string): Promise<ClientShare | null> {
  const { data, error } = await supabase.rpc("client_get_event", { p_token: token });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  const row = data as ClientShare;
  return {
    coupleName: row.coupleName ?? "",
    venue: row.venue ?? "",
    location: row.location ?? "",
    room: row.room ?? "",
    notes: row.notes ?? "",
    days: (row.days ?? []).map((day) => ({
      id: day.id,
      label: day.label ?? "Day",
      date: day.date ? String(day.date).slice(0, 10) : "",
      readyBy: day.readyBy ?? "",
      ceremonyTime: day.ceremonyTime ?? "",
    })),
    stylists: (row.stylists ?? []).filter((stylist) => isService(stylist.specialty)),
    members: (row.members ?? []).map((member) => normalizeClientMember(member)),
  };
}

export async function persistClientShare(supabase: SupabaseClient, token: string, members: readonly ClientMember[]): Promise<void> {
  const { error } = await supabase.rpc("client_save_party", { p_token: token, p_members: members });
  if (error) throw new Error(error.message);
}

export async function fetchTimelineShare(supabase: SupabaseClient, token: string): Promise<TimelineShare | null> {
  const { data, error } = await supabase.rpc("timeline_get_event", { p_token: token });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  const row = data as TimelineShare;
  return {
    coupleName: row.coupleName ?? "",
    venue: row.venue ?? "",
    location: row.location ?? "",
    room: row.room ?? "",
    notes: row.notes ?? "",
    photographer: row.photographer ?? "",
    videographer: row.videographer ?? "",
    brideHair: num(row.brideHair, 90),
    brideMakeup: num(row.brideMakeup, 60),
    defaultHair: num(row.defaultHair, 45),
    defaultMakeup: num(row.defaultMakeup, 30),
    bufferMins: num(row.bufferMins, 10),
    brideTouchupMins: num(row.brideTouchupMins, 15),
    days: (row.days ?? []).map((day) => ({
      id: day.id,
      label: day.label ?? "Day",
      date: day.date ? String(day.date).slice(0, 10) : "",
      ceremonyTime: day.ceremonyTime ?? "",
      readyBy: day.readyBy ?? "",
      callTime: day.callTime ?? "",
      travelBufferMins: num(day.travelBufferMins),
    })),
    stylists: (row.stylists ?? []).filter((stylist) => isService(stylist.specialty)),
    members: (row.members ?? []).map((member) => ({
      id: member.id,
      name: member.name ?? "",
      role: isRole(member.role) ? member.role : "other",
      services: isService(member.services) ? member.services : "both",
      stylistId: member.stylistId ?? "",
      notes: member.notes ?? "",
      hairMins: num(member.hairMins),
      makeupMins: num(member.makeupMins),
      price: 0,
      urls: member.urls ?? [],
      dayIds: (member.dayIds ?? []).map(String),
      dayServices: asServiceMap(member.dayServices),
    })),
  };
}

function normalizeClientMember(member: ClientMember): ClientMember {
  return {
    id: member.id,
    name: member.name ?? "",
    role: isRole(member.role) ? member.role : "other",
    services: isService(member.services) ? member.services : "both",
    stylistId: member.stylistId ?? "",
    notes: member.notes ?? "",
    urls: member.urls ?? [],
    dayIds: (member.dayIds ?? []).map(String),
    dayServices: asServiceMap(member.dayServices),
  };
}
