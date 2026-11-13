import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  fetchCalendlyAvailableTimes,
  listCalendlyDays,
  sevenDayWindows,
  timesToDays,
} from "@/lib/booking/calendly-adapter";
import {
  buildHandoff,
  chooseOpenDate,
  FAKE_CONFIRMATION,
} from "@/lib/booking/handoff";
import { availabilitySource } from "@/lib/booking/load";
import { mockAvailability } from "@/lib/booking/mock-adapter";
import { createSeedDatabase } from "@/lib/demo/seed";

const eventUrl = "https://calendly.com/example/private-transformation";

describe("availability adapters", () => {
  it("uses the fake release by default and only switches when both Calendly vars exist", () => {
    expect(availabilitySource({})).toBe("mock");
    expect(availabilitySource({ CALENDLY_TOKEN: "secret" })).toBe("mock");
    expect(
      availabilitySource({
        CALENDLY_TOKEN: "secret",
        CALENDLY_EVENT_TYPE_URI: "https://api.calendly.com/event_types/abc",
      }),
    ).toBe("calendly");
  });

  it("marks published demo days open at 10:00 or held", () => {
    const days = mockAvailability(
      createSeedDatabase(),
      DateTime.fromISO("2026-11-13T12:00:00", { zone: "America/Chicago" }),
    );
    const open = days.find((day) => day.status === "open");
    const held = days.find((day) => day.status === "held");
    expect(open?.times).toEqual(["10:00"]);
    expect(held?.times).toEqual([]);
    expect(chooseOpenDate(days, held?.date ?? "").ok).toBe(false);
    const chosen = chooseOpenDate(days, open?.date ?? "");
    expect(chosen.ok).toBe(true);
    if (!chosen.ok || !open) return;
    const handoff = buildHandoff({
      live: false,
      eventUrl,
      date: open.date,
      time: chosen.times[0],
    });
    expect(handoff.mode).toBe("mock");
    if (handoff.mode !== "mock") return;
    expect(handoff.label).toBe(FAKE_CONFIRMATION);
    expect(handoff.summary.minimumCents).toBe(120_000);
    expect(handoff.summary.depositCents).toBe(60_000);
    expect(JSON.stringify(handoff)).not.toContain("calendly.com");
  });

  it("asks Calendly for available times without putting the token in the URL", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      return new Response(
        JSON.stringify({
          collection: [{ start_time: "2027-01-05T16:00:00.000000Z" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const times = await fetchCalendlyAvailableTimes({
      token: "test-token",
      eventTypeUri: "https://api.calendly.com/event_types/abc",
      startTime: "2027-01-05T00:00:00Z",
      endTime: "2027-01-12T00:00:00Z",
      fetchImpl,
    });
    expect(calls[0]).toContain("event_type_available_times");
    expect(calls[0]).toContain("event_types");
    expect(calls[0]).not.toContain("test-token");
    expect(timesToDays(times.map((item) => item.startTime))).toEqual([
      { date: "2027-01-05", status: "open", times: ["10:00"] },
    ]);
  });

  it("splits a longer range into seven-day Calendly windows", async () => {
    const start = DateTime.fromISO("2027-01-05T00:00:00Z");
    const end = start.plus({ days: 14 });
    const windows = sevenDayWindows(start, end);
    expect(windows).toHaveLength(2);
    const seen: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response(JSON.stringify({ collection: [] }), { status: 200 });
    }) as typeof fetch;
    await listCalendlyDays({
      token: "test-token",
      eventTypeUri: "https://api.calendly.com/event_types/abc",
      start,
      end,
      fetchImpl,
    });
    expect(seen).toHaveLength(2);
    expect(seen.join("")).not.toContain("test-token");
  });
});

describe("date selection handoff", () => {
  it("builds an Editorial-colored slot link only in live mode", () => {
    const live = buildHandoff({
      live: true,
      eventUrl,
      date: "2027-01-05",
      time: "10:00",
    });
    expect(live.mode).toBe("live");
    if (live.mode !== "live") return;
    expect(live.url).toContain("2027-01-05T10:00:00");
    expect(live.url).toContain("primary_color=d7261e");
    expect(live.url).toContain("background_color=f3f0e7");
    expect(live.url).toContain("text_color=161513");
    expect(live.summary.depositCents).toBe(60_000);
  });
});
