import { newId, newToken } from "./ids";
import { emptyPackState, type EventDay, type Member, type PlannerEvent, type Role, type ServiceKind } from "./types";

export function blankDay(label = "Wedding day"): EventDay {
  return {
    id: newId(),
    label,
    date: "",
    ceremonyTime: "",
    readyBy: "",
    callTime: "",
    travelBufferMins: 0,
  };
}

export function blankMember(dayIds: string[] = []): Member {
  return {
    id: newId(),
    name: "",
    role: "bridesmaid",
    services: "both",
    stylistId: "",
    notes: "",
    hairMins: 0,
    makeupMins: 0,
    price: 0,
    urls: [],
    dayIds,
    dayServices: {},
  };
}

export function blankEvent(): PlannerEvent {
  const day = blankDay();
  return {
    id: newId(),
    status: "pending",
    coupleName: "",
    venue: "",
    location: "",
    room: "",
    photographer: "",
    videographer: "",
    notes: "",
    isOutdoor: false,
    hasExtensions: false,
    brideHair: 90,
    brideMakeup: 60,
    defaultHair: 45,
    defaultMakeup: 30,
    bufferMins: 10,
    brideTouchupMins: 15,
    days: [day],
    members: [],
    stylistIds: [],
    packState: emptyPackState(),
    lastStep: 1,
    clientToken: newToken(),
    timelineToken: newToken(),
    createdAt: new Date().toISOString(),
  };
}

export function memberServices(role: Role): ServiceKind {
  if (role === "flower_girl") return "hair";
  return "both";
}
