import { describe, expect, it } from "vitest";
import { applyClientMembers, findEventByToken, toClientShare, toTimelineShare } from "./access";
import { createSeed, DEMO_IDS, DEMO_TOKENS } from "./demo-data";

describe("share token access", () => {
  const studio = createSeed();

  it("returns only the event for that token, never by event id", () => {
    const byToken = findEventByToken(studio.events, DEMO_TOKENS.weddingClient, "client");
    expect(byToken?.id).toBe(DEMO_IDS.wedding);
    expect(findEventByToken(studio.events, DEMO_IDS.wedding, "client")).toBeNull();
    expect(findEventByToken(studio.events, DEMO_TOKENS.weddingClient, "timeline")).toBeNull();
    expect(findEventByToken(studio.events, DEMO_TOKENS.trialTimeline, "timeline")?.id).toBe(DEMO_IDS.trial);
    expect(findEventByToken(studio.events, "short", "client")).toBeNull();
  });

  it("hides prices, packing, and unassigned stylists from the client payload", () => {
    const event = studio.events[0];
    const view = toClientShare(event, studio.stylists);
    expect(view.stylists.map((stylist) => stylist.id)).toEqual(event.stylistIds);
    expect(JSON.stringify(view)).not.toContain("480");
    expect(JSON.stringify(view)).not.toContain("pack");
    expect(view.members.find((member) => member.name === "Avery Chen")?.notes).toContain("Low romantic bun");
  });

  it("keeps prices and rejects a stylist who is not on the event", () => {
    const event = studio.events[1];
    const view = toClientShare(event, studio.stylists);
    expect(view.stylists.map((stylist) => stylist.name)).toEqual(["Riley Okonkwo", "Ellis Morgan"]);
    const edited = view.members.map((member) =>
      member.name === "Quinn Alvarez" ? { ...member, name: "Quinn A.", stylistId: DEMO_IDS.samira, notes: "Updated by client" } : member,
    );
    const saved = applyClientMembers(event, edited, studio.stylists);
    const quinn = saved.find((member) => member.id === DEMO_IDS.quinn);
    expect(quinn?.name).toBe("Quinn A.");
    expect(quinn?.notes).toBe("Updated by client");
    expect(quinn?.stylistId).toBe("");
    expect(quinn?.price).toBe(180);
    expect(toTimelineShare(event, studio.stylists).members.every((member) => member.price === 0)).toBe(true);
  });

  it("drops inspo links that are not http(s)", () => {
    const event = studio.events[0];
    const [first, ...rest] = event.members;
    const saved = applyClientMembers(
      event,
      [
        {
          ...first,
          urls: ["javascript:alert(1)", "https://example.com/bun.jpg", "notes"],
          price: 9999,
        } as never,
        ...rest.map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          services: member.services,
          stylistId: member.stylistId,
          notes: member.notes,
          urls: member.urls,
          dayIds: member.dayIds,
          dayServices: member.dayServices,
        })),
      ],
      studio.stylists,
    );
    expect(saved[0].urls).toEqual(["https://example.com/bun.jpg"]);
    expect(saved[0].price).toBe(480);
  });
});
