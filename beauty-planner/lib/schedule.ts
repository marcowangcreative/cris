import { PRIORITY, type Durations, type Member, type Role, type ServiceKind, type Stylist } from "./types";
import { fmtTime, parseTime } from "./time";

export interface ScheduleDurations {
  brideHair?: number;
  brideMakeup?: number;
  defaultHair?: number;
  defaultMakeup?: number;
  /** Minutes kept clear between two different people on the same artist. */
  bufferMins?: number;
  /** Makeup touch-up reserved for the bride, ending at ready-by. 0 disables it. */
  brideTouchupMins?: number;
}

export interface ScheduleOptions {
  /** Earliest the artist is on site (HH:MM). Omit to skip the call-time check. */
  callTime?: string | null;
  /** Extra minutes after call time before services can start. */
  travelBufferMins?: number;
}

export type SlotType = "hair" | "makeup" | "touchup";

export interface Slot {
  memberId: string;
  name: string;
  role: Role;
  type: SlotType;
  start: number;
  end: number;
  dur: number;
}

export interface Track {
  stylist: Stylist;
  slots: Slot[];
}

export interface Conflict {
  code: "before_call" | "overlap";
  stylistId: string;
  stylistName: string;
  message: string;
}

export interface Schedule {
  tracks: Track[];
  start: number | null;
  end: number | null;
  conflicts: Conflict[];
}

const FALLBACK_STYLIST: Stylist = { id: "styling-team", name: "Styling Team", specialty: "both" };

interface TrackState {
  stylist: Stylist;
  slots: Slot[];
  /** Latest minute a different person may end on this track. */
  nextEnd: number;
}

export function serviceOnDay(member: Pick<Member, "services" | "dayServices">, dayId?: string | null): ServiceKind {
  if (dayId && member.dayServices?.[dayId]) return member.dayServices[dayId];
  return member.services || "both";
}

export function membersForDay<T extends Pick<Member, "dayIds">>(members: T[], dayId: string, dayCount: number): T[] {
  if (dayCount <= 1) return members;
  return members.filter((member) => (member.dayIds ?? []).includes(dayId));
}

export function toDurations(source: Durations): Required<ScheduleDurations> {
  return {
    brideHair: source.brideHair,
    brideMakeup: source.brideMakeup,
    defaultHair: source.defaultHair,
    defaultMakeup: source.defaultMakeup,
    bufferMins: source.bufferMins,
    brideTouchupMins: source.brideTouchupMins,
  };
}

function hairDuration(member: Member, durations: Required<ScheduleDurations>): number {
  if (member.hairMins > 0) return member.hairMins;
  return member.role === "bride" ? durations.brideHair : durations.defaultHair;
}

function makeupDuration(member: Member, durations: Required<ScheduleDurations>): number {
  if (member.makeupMins > 0) return member.makeupMins;
  return member.role === "bride" ? durations.brideMakeup : durations.defaultMakeup;
}

function wantsHair(service: ServiceKind): boolean {
  return service === "hair" || service === "both";
}

function wantsMakeup(service: ServiceKind): boolean {
  return service === "makeup" || service === "both";
}

function recomputeNextEnd(track: TrackState, buffer: number) {
  if (!track.slots.length) return;
  const earliest = Math.min(...track.slots.map((slot) => slot.start));
  track.nextEnd = earliest - buffer;
}

function addExact(track: TrackState, slot: Slot, buffer: number) {
  track.slots.push(slot);
  recomputeNextEnd(track, buffer);
}

/**
 * Place a slot ending at or before `proposedEnd`, skipping anything already
 * on the track. The same person's own next service can sit flush against it;
 * a different person keeps `buffer` minutes clear.
 */
function addBackward(
  track: TrackState,
  member: Member,
  type: SlotType,
  dur: number,
  proposedEnd: number,
  buffer: number,
): Slot | null {
  if (dur <= 0) return null;
  let end = proposedEnd;
  for (let guard = 0; guard < track.slots.length + 3; guard += 1) {
    const ownLater = track.slots
      .filter((slot) => slot.memberId === member.id && slot.start >= end)
      .sort((a, b) => a.start - b.start)[0];
    if (ownLater && ownLater.start - end <= buffer) {
      const someoneBetween = track.slots.some(
        (slot) => slot.memberId !== member.id && slot.start >= end && slot.start < ownLater.start,
      );
      if (!someoneBetween) end = ownLater.start;
    }

    const start = end - dur;
    const hit = track.slots.find((slot) => start < slot.end && end > slot.start);
    if (!hit) {
      const slot: Slot = {
        memberId: member.id,
        name: member.name || "Guest",
        role: member.role,
        type,
        start,
        end,
        dur,
      };
      addExact(track, slot, buffer);
      return slot;
    }
    end = hit.start - (hit.memberId === member.id ? 0 : buffer);
  }
  return null;
}

function pickStylist(tracks: Map<string, TrackState>, list: Stylist[], member: Member): Stylist {
  const preferred = member.stylistId ? list.find((stylist) => stylist.id === member.stylistId) : undefined;
  if (preferred && tracks.has(preferred.id)) return preferred;
  return list.reduce((best, stylist) => {
    const bestEnd = tracks.get(best.id)?.nextEnd ?? -Infinity;
    const nextEnd = tracks.get(stylist.id)?.nextEnd ?? -Infinity;
    return nextEnd > bestEnd ? stylist : best;
  }, list[0]);
}

function capable(roster: Stylist[], kind: "hair" | "makeup"): Stylist[] {
  const matched = roster.filter((stylist) => stylist.specialty === kind || stylist.specialty === "both");
  return matched.length ? matched : roster;
}

/**
 * Build one day's schedule backward from `readyBy`.
 *
 * Makeup sits closer to ready-by than hair. The bride's chain (optional
 * touch-up, then makeup, then hair) ends at ready-by, so she finishes last.
 * Other people are load-balanced across artists who can do the service, with
 * `bufferMins` between different people on the same track.
 */
export function buildSchedule(
  members: Member[],
  stylists: Stylist[],
  readyBy: string,
  durations?: ScheduleDurations | null,
  dayId?: string | null,
  options?: ScheduleOptions | null,
): Schedule {
  const ready = parseTime(readyBy);
  if (ready === null || members.length === 0) {
    return { tracks: [], start: null, end: null, conflicts: [] };
  }

  const timing: Required<ScheduleDurations> = {
    brideHair: durations?.brideHair ?? 90,
    brideMakeup: durations?.brideMakeup ?? 60,
    defaultHair: durations?.defaultHair ?? 45,
    defaultMakeup: durations?.defaultMakeup ?? 30,
    bufferMins: durations?.bufferMins ?? 0,
    brideTouchupMins: durations?.brideTouchupMins ?? 0,
  };
  const buffer = Math.max(0, timing.bufferMins);

  const roster = stylists.length ? stylists : [FALLBACK_STYLIST];
  const hairArtists = capable(roster, "hair");
  const makeupArtists = capable(roster, "makeup");
  const tracks = new Map<string, TrackState>();
  for (const stylist of [...makeupArtists, ...hairArtists]) {
    if (!tracks.has(stylist.id)) tracks.set(stylist.id, { stylist, slots: [], nextEnd: ready });
  }

  const ordered = [...members].sort((a, b) => (PRIORITY[a.role] ?? 6) - (PRIORITY[b.role] ?? 6));
  const bride = ordered.find((member) => member.role === "bride") ?? null;
  const makeupByMember = new Map<string, Slot>();
  const placed = new Set<string>();

  let othersCeiling = ready;

  if (bride) {
    const service = serviceOnDay(bride, dayId);
    const brideMakeup = wantsMakeup(service);
    const brideHair = wantsHair(service);
    let cursor = ready;
    let makeupArtist: Stylist | undefined;

    if (brideMakeup && timing.brideTouchupMins > 0) {
      makeupArtist = pickStylist(tracks, makeupArtists, bride);
      const slot = addBackward(tracks.get(makeupArtist.id)!, bride, "touchup", timing.brideTouchupMins, cursor, buffer);
      if (slot) {
        othersCeiling = slot.start;
        cursor = slot.start;
        placed.add(`${bride.id}:touchup`);
      }
    }

    if (brideMakeup) {
      makeupArtist = makeupArtist && makeupArtists.some((artist) => artist.id === makeupArtist!.id)
        ? makeupArtist
        : pickStylist(tracks, makeupArtists, bride);
      const dur = makeupDuration(bride, timing);
      const slot = addBackward(tracks.get(makeupArtist.id)!, bride, "makeup", dur, cursor, buffer);
      if (slot) {
        if (!placed.has(`${bride.id}:touchup`)) othersCeiling = slot.start;
        cursor = slot.start;
        makeupByMember.set(bride.id, slot);
        placed.add(`${bride.id}:makeup`);
      }
    }

    if (brideHair) {
      const hairArtist = bride.stylistId && hairArtists.some((artist) => artist.id === bride.stylistId)
        ? hairArtists.find((artist) => artist.id === bride.stylistId)!
        : makeupArtist && hairArtists.some((artist) => artist.id === makeupArtist.id)
          ? makeupArtist
          : pickStylist(tracks, hairArtists, bride);
      const dur = hairDuration(bride, timing);
      const slot = addBackward(tracks.get(hairArtist.id)!, bride, "hair", dur, cursor, buffer);
      if (slot) {
        if (!brideMakeup) othersCeiling = slot.start;
        placed.add(`${bride.id}:hair`);
      }
    }
  }

  for (const member of ordered) {
    const service = serviceOnDay(member, dayId);
    if (!wantsMakeup(service) || placed.has(`${member.id}:makeup`)) continue;
    const stylist = pickStylist(tracks, makeupArtists, member);
    const slot = addBackward(
      tracks.get(stylist.id)!,
      member,
      "makeup",
      makeupDuration(member, timing),
      othersCeiling,
      buffer,
    );
    if (slot) makeupByMember.set(member.id, slot);
  }

  for (const member of ordered) {
    const service = serviceOnDay(member, dayId);
    if (!wantsHair(service) || placed.has(`${member.id}:hair`)) continue;
    const stylist = pickStylist(tracks, hairArtists, member);
    const makeup = makeupByMember.get(member.id);
    const ceiling = makeup ? Math.min(othersCeiling, makeup.start) : othersCeiling;
    addBackward(tracks.get(stylist.id)!, member, "hair", hairDuration(member, timing), ceiling, buffer);
  }

  const live: Track[] = [];
  for (const stylist of roster) {
    const track = tracks.get(stylist.id);
    if (!track || track.slots.length === 0) continue;
    live.push({
      stylist: track.stylist,
      slots: [...track.slots].sort((a, b) => a.start - b.start || a.end - b.end),
    });
  }

  const all = live.flatMap((track) => track.slots);
  return {
    tracks: live,
    start: all.length ? Math.min(...all.map((slot) => slot.start)) : null,
    end: ready,
    conflicts: detectConflicts(live, options),
  };
}

export function detectConflicts(tracks: Track[], options?: ScheduleOptions | null): Conflict[] {
  const conflicts: Conflict[] = [];
  const call = parseTime(options?.callTime);
  const earliest = call === null ? null : call + Math.max(0, options?.travelBufferMins ?? 0);

  for (const track of tracks) {
    const slots = [...track.slots].sort((a, b) => a.start - b.start || a.end - b.end);
    if (earliest !== null) {
      const offender = slots.find((slot) => slot.start < earliest);
      if (offender) {
        const travel = options?.travelBufferMins ?? 0;
        const travelNote = travel > 0 ? ` plus ${travel} min travel (${fmtTime(earliest)})` : "";
        conflicts.push({
          code: "before_call",
          stylistId: track.stylist.id,
          stylistName: track.stylist.name,
          message: `${track.stylist.name} starts at ${fmtTime(offender.start)}, before the ${fmtTime(call ?? earliest)} call time${travelNote}.`,
        });
      }
    }

    let previous: Slot | undefined;
    for (const slot of slots) {
      if (previous && slot.start < previous.end) {
        conflicts.push({
          code: "overlap",
          stylistId: track.stylist.id,
          stylistName: track.stylist.name,
          message: `${track.stylist.name} has overlapping appointments (${previous.name} ${fmtTime(previous.start)}–${fmtTime(previous.end)} and ${slot.name} ${fmtTime(slot.start)}–${fmtTime(slot.end)}).`,
        });
      }
      if (!previous || slot.end > previous.end) previous = slot;
    }
  }

  const byMember = new Map<string, Slot[]>();
  for (const track of tracks) {
    for (const slot of track.slots) {
      const list = byMember.get(slot.memberId) ?? [];
      list.push(slot);
      byMember.set(slot.memberId, list);
    }
  }
  for (const slots of byMember.values()) {
    const hair = slots.find((slot) => slot.type === "hair");
    const makeup = slots.find((slot) => slot.type === "makeup");
    const touchup = slots.find((slot) => slot.type === "touchup");
    const name = slots[0]?.name ?? "Guest";
    if (hair && makeup && hair.end > makeup.start) {
      conflicts.push({
        code: "overlap",
        stylistId: "",
        stylistName: name,
        message: `${name} has hair overlapping makeup.`,
      });
    }
    if (makeup && touchup && makeup.end > touchup.start) {
      conflicts.push({
        code: "overlap",
        stylistId: "",
        stylistName: name,
        message: `${name} has makeup overlapping the touch-up.`,
      });
    }
    if (hair && touchup && !makeup && hair.end > touchup.start) {
      conflicts.push({
        code: "overlap",
        stylistId: "",
        stylistName: name,
        message: `${name} has hair overlapping the touch-up.`,
      });
    }
  }

  return conflicts;
}
