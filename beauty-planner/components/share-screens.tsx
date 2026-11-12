"use client";

import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadClientShare, loadTimelineShare, saveClientShare } from "@/lib/shares";
import { fmtDateShort, fmtTime, parseTime } from "@/lib/time";
import type { ClientMember, ClientShare, TimelineShare } from "@/lib/access";
import { emptyPackState, type Member, type PlannerEvent } from "@/lib/types";
import { PartyEditor } from "./party-editor";
import { PublicBar } from "./shell";
import { Button, LoadingMark } from "./ui";
import { TimelineView } from "./timeline-view";

export function ClientShareScreen({ token }: { token: string }) {
  const [data, setData] = useState<ClientShare | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    let ignore = false;
    loadClientShare(token)
      .then((share) => {
        if (ignore) return;
        setData(share);
        setMembers((share?.members ?? []).map(toDraft));
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Could not open this link");
        setData(null);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!data || !dirty.current) return;
    const handle = window.setTimeout(() => {
      const payload: ClientMember[] = members.map(toClient);
      void saveClientShare(token, payload)
        .then(() => setError(null))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not save"));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [members, data, token]);

  if (data === undefined) return <LoadingMark />;
  if (!data) {
    return (
      <>
        <PublicBar subtitle="Client link" />
        <main className="page"><div className="empty card"><h2>Link not found</h2><p className="lede">Ask your artist for a new party link.</p></div></main>
      </>
    );
  }

  return (
    <>
      <PublicBar subtitle="Party details" />
      <main className="page">
        {!isSupabaseConfigured() ? <p className="note">Sample client link. Edits stay in this browser.</p> : null}
        <div className="page-head">
          <div>
            <p className="kicker">For the couple</p>
            <h1>{data.coupleName || "Your event"}</h1>
            <p className="lede">{[data.venue, data.location, data.room].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          {data.days.map((day) => (
            <p key={day.id} className="meta">
              <strong>{day.label}</strong>
              {day.date ? ` · ${fmtDateShort(day.date)}` : ""}
              {day.readyBy && parseTime(day.readyBy) !== null ? ` · ready by ${fmtTime(parseTime(day.readyBy)!)}` : ""}
            </p>
          ))}
          {data.notes ? <p>{data.notes}</p> : null}
          <p className="meta">You can edit the party. Pricing, the artist roster, and other events stay with the studio.</p>
        </div>
        {error ? <p className="error-box" role="alert">{error}</p> : null}
        <PartyEditor
          members={members}
          days={data.days.map((day) => ({ ...day, callTime: "", travelBufferMins: 0 }))}
          stylists={data.stylists}
          studio={false}
          onChange={(next) => {
            dirty.current = true;
            setSaved(false);
            setMembers(next);
          }}
        />
        <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <Button
            onClick={() => {
              void saveClientShare(token, members.map(toClient))
                .then(() => {
                  setSaved(true);
                  setError(null);
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not save"));
            }}
          >
            {saved ? "Saved" : "Submit party"}
          </Button>
        </div>
        {saved ? <p className="ok-box">Thank you. Your artist can see the party now.</p> : null}
      </main>
    </>
  );
}

export function TimelineShareScreen({ token }: { token: string }) {
  const [data, setData] = useState<TimelineShare | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    loadTimelineShare(token)
      .then((share) => {
        if (!ignore) setData(share);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Could not open this timeline");
        setData(null);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  if (data === undefined) return <LoadingMark />;
  if (!data) {
    return (
      <>
        <PublicBar subtitle="Timeline" />
        <main className="page"><div className="empty card"><h2>Timeline not found</h2>{error ? <p>{error}</p> : null}</div></main>
      </>
    );
  }

  const event = shareToEvent(data);
  return (
    <>
      <PublicBar subtitle="Shared timeline" />
      <main className="page">
        {!isSupabaseConfigured() ? <p className="note no-print">Sample timeline link from the demo studio.</p> : null}
        <div className="page-head">
          <div>
            <p className="kicker">{[data.venue, data.location].filter(Boolean).join(" · ")}</p>
            <h1>{data.coupleName || "Timeline"}</h1>
          </div>
        </div>
        <TimelineView event={event} stylists={data.stylists} showQuote={false} />
      </main>
    </>
  );
}

function toDraft(member: ClientMember): Member {
  return {
    ...member,
    hairMins: 0,
    makeupMins: 0,
    price: 0,
    urls: member.urls ?? [],
    dayIds: member.dayIds ?? [],
    dayServices: member.dayServices ?? {},
  };
}

function toClient(member: Member): ClientMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    services: member.services,
    stylistId: member.stylistId,
    notes: member.notes,
    urls: member.urls,
    dayIds: member.dayIds,
    dayServices: member.dayServices,
  };
}

function shareToEvent(share: TimelineShare): PlannerEvent {
  return {
    id: "share",
    status: "confirmed",
    coupleName: share.coupleName,
    venue: share.venue,
    location: share.location,
    room: share.room,
    photographer: share.photographer,
    videographer: share.videographer,
    notes: share.notes,
    isOutdoor: false,
    hasExtensions: false,
    brideHair: share.brideHair,
    brideMakeup: share.brideMakeup,
    defaultHair: share.defaultHair,
    defaultMakeup: share.defaultMakeup,
    bufferMins: share.bufferMins,
    brideTouchupMins: share.brideTouchupMins,
    days: share.days,
    members: share.members,
    stylistIds: share.stylists.map((stylist) => stylist.id),
    packState: emptyPackState(),
    lastStep: 4,
    clientToken: "",
    timelineToken: "",
    createdAt: "",
  };
}
