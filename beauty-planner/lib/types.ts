export const ROLES = [
  { value: "bride", label: "Bride" },
  { value: "moh", label: "Maid of Honor" },
  { value: "bridesmaid", label: "Bridesmaid" },
  { value: "mother_bride", label: "Mother of Bride" },
  { value: "mother_groom", label: "Mother of Groom" },
  { value: "flower_girl", label: "Flower Girl" },
  { value: "other", label: "Other" },
] as const;

export const SERVICES = [
  { value: "hair", label: "Hair only" },
  { value: "makeup", label: "Makeup only" },
  { value: "both", label: "Hair & makeup" },
] as const;

export const SPECIALTIES = [
  { value: "hair", label: "Hair stylist" },
  { value: "makeup", label: "Makeup artist" },
  { value: "both", label: "Hair & makeup" },
] as const;

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "complete", label: "Complete" },
] as const;

export type Role = (typeof ROLES)[number]["value"];
export type ServiceKind = (typeof SERVICES)[number]["value"];
export type EventStatus = (typeof STATUSES)[number]["value"];

/** Lower runs closer to ready-by. The bride is scheduled last. */
export const PRIORITY: Record<Role, number> = {
  bride: 0,
  moh: 1,
  bridesmaid: 2,
  mother_bride: 3,
  mother_groom: 4,
  flower_girl: 5,
  other: 6,
};

export interface EventDay {
  id: string;
  label: string;
  date: string;
  ceremonyTime: string;
  readyBy: string;
  callTime: string;
  travelBufferMins: number;
}

export interface Stylist {
  id: string;
  name: string;
  specialty: ServiceKind;
}

export interface Member {
  id: string;
  name: string;
  role: Role;
  services: ServiceKind;
  stylistId: string;
  notes: string;
  hairMins: number;
  makeupMins: number;
  price: number;
  urls: string[];
  dayIds: string[];
  dayServices: Partial<Record<string, ServiceKind>>;
}

export interface PackState {
  checked: Record<string, boolean>;
  smartChecked: Record<string, boolean>;
  customItems: Record<string, string[]>;
  collapsed: Record<string, boolean>;
  hidden: Record<string, boolean>;
}

export interface PlannerEvent {
  id: string;
  status: EventStatus;
  coupleName: string;
  venue: string;
  location: string;
  room: string;
  photographer: string;
  videographer: string;
  notes: string;
  isOutdoor: boolean;
  hasExtensions: boolean;
  brideHair: number;
  brideMakeup: number;
  defaultHair: number;
  defaultMakeup: number;
  bufferMins: number;
  brideTouchupMins: number;
  days: EventDay[];
  members: Member[];
  stylistIds: string[];
  packState: PackState;
  lastStep: number;
  clientToken: string;
  timelineToken: string;
  createdAt: string;
}

export interface StudioData {
  studioName: string;
  stylists: Stylist[];
  events: PlannerEvent[];
}

export interface Durations {
  brideHair: number;
  brideMakeup: number;
  defaultHair: number;
  defaultMakeup: number;
  bufferMins: number;
  brideTouchupMins: number;
}

export function emptyPackState(): PackState {
  return { checked: {}, smartChecked: {}, customItems: {}, collapsed: {}, hidden: {} };
}

export function roleLabel(role: string): string {
  return ROLES.find((item) => item.value === role)?.label ?? "Other";
}

export function serviceLabel(service: string): string {
  return SERVICES.find((item) => item.value === service)?.label ?? "Hair & makeup";
}

export function specialtyLabel(service: string): string {
  return SPECIALTIES.find((item) => item.value === service)?.label ?? "Hair & makeup";
}

export function isRole(value: string): value is Role {
  return ROLES.some((item) => item.value === value);
}

export function isService(value: string): value is ServiceKind {
  return SERVICES.some((item) => item.value === value);
}

export function isStatus(value: string): value is EventStatus {
  return STATUSES.some((item) => item.value === value);
}
