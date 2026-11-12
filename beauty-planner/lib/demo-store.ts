import { applyClientMembers, findEventByToken, toClientShare, toTimelineShare, type ClientMember, type ClientShare, type TimelineShare } from "./access";
import { createSeed } from "./demo-data";
import type { PlannerEvent, StudioData, Stylist } from "./types";

export const DEMO_STORAGE_KEY = "flowed-studio:v1";
export const DEMO_SESSION_KEY = "flowed-session:v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadDemo(): StudioData {
  if (!canUseStorage()) return createSeed();
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      const seed = createSeed();
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as StudioData;
    if (!parsed || !Array.isArray(parsed.events) || !Array.isArray(parsed.stylists)) {
      const seed = createSeed();
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createSeed();
  }
}

export function saveDemo(data: StudioData): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode or a full disk. The in-memory copy still works this session.
  }
}

export function resetDemo(): StudioData {
  const seed = createSeed();
  saveDemo(seed);
  return seed;
}

export function demoSessionOn(): boolean {
  if (!canUseStorage()) return false;
  try {
    return window.localStorage.getItem(DEMO_SESSION_KEY) === "demo";
  } catch {
    return false;
  }
}

export function setDemoSession(on: boolean): void {
  if (!canUseStorage()) return;
  try {
    if (on) window.localStorage.setItem(DEMO_SESSION_KEY, "demo");
    else window.localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore storage failures; the page can still show the login screen.
  }
}

export function readClientShare(token: string): ClientShare | null {
  const data = loadDemo();
  const event = findEventByToken(data.events, token, "client");
  if (!event) return null;
  return toClientShare(event, data.stylists);
}

export function writeClientShare(token: string, members: readonly ClientMember[]): string | null {
  const data = loadDemo();
  const event = findEventByToken(data.events, token, "client");
  if (!event) return "This link doesn't match an event.";
  const next = applyClientMembers(event, members, data.stylists);
  const events = data.events.map((item) => (item.id === event.id ? { ...item, members: next } : item));
  saveDemo({ ...data, events });
  return null;
}

export function readTimelineShare(token: string): TimelineShare | null {
  const data = loadDemo();
  const event = findEventByToken(data.events, token, "timeline");
  if (!event) return null;
  return toTimelineShare(event, data.stylists);
}

export function upsertDemoEvent(data: StudioData, event: PlannerEvent): StudioData {
  const exists = data.events.some((item) => item.id === event.id);
  const events = exists ? data.events.map((item) => (item.id === event.id ? event : item)) : [event, ...data.events];
  return { ...data, events };
}

export function upsertDemoStylist(data: StudioData, stylist: Stylist): StudioData {
  const exists = data.stylists.some((item) => item.id === stylist.id);
  const stylists = exists
    ? data.stylists.map((item) => (item.id === stylist.id ? stylist : item))
    : [...data.stylists, stylist];
  return { ...data, stylists };
}

export function removeDemoStylist(data: StudioData, stylistId: string): StudioData {
  return {
    ...data,
    stylists: data.stylists.filter((stylist) => stylist.id !== stylistId),
    events: data.events.map((event) => ({
      ...event,
      stylistIds: event.stylistIds.filter((id) => id !== stylistId),
      members: event.members.map((member) => (member.stylistId === stylistId ? { ...member, stylistId: "" } : member)),
    })),
  };
}
