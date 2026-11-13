import type { CalendlyWebhook } from "./webhook";

const PARKER_INVITEE =
  "https://api.calendly.com/scheduled_events/EVTDEMO1/invitees/INVDEMO1";
const PARKER_EVENT =
  "https://api.calendly.com/scheduled_events/EVTDEMO1";

export function paidTransformationPayload(
  overrides: {
    uri?: string;
    start?: string;
    end?: string;
    email?: string;
    name?: string;
    rescheduled?: boolean;
    oldInvitee?: string;
    payment?: CalendlyWebhook["payload"]["payment"];
  } = {},
): CalendlyWebhook {
  return {
    event: "invitee.created",
    created_at: "2026-11-13T16:00:00Z",
    payload: {
      uri: overrides.uri ?? PARKER_INVITEE,
      email: overrides.email ?? "parker.quinn@example.com",
      name: overrides.name ?? "Parker Quinn",
      rescheduled: overrides.rescheduled ?? false,
      old_invitee: overrides.oldInvitee,
      scheduled_event: {
        uri: PARKER_EVENT,
        name: "Private Transformation",
        start_time: overrides.start ?? "2027-01-05T16:00:00.000Z",
        end_time: overrides.end ?? "2027-01-06T00:00:00.000Z",
        location: { location: "Houston studio" },
      },
      payment:
        overrides.payment === undefined
          ? {
              external_id: "pi_demo_parker_001",
              provider: "stripe",
              amount: 600,
              currency: "USD",
              successful: true,
            }
          : overrides.payment,
    },
  };
}

export function failedPaymentPayload(): CalendlyWebhook {
  return paidTransformationPayload({
    uri: "https://api.calendly.com/scheduled_events/EVTDEMO2/invitees/INVDEMO2",
    email: "rowan.hale@example.com",
    name: "Rowan Hale",
    start: "2027-01-26T16:00:00.000Z",
    end: "2027-01-27T00:00:00.000Z",
    payment: {
      external_id: "pi_demo_rowan_failed",
      provider: "stripe",
      amount: 600,
      currency: "USD",
      successful: false,
    },
  });
}

export function missingPaymentPayload(): CalendlyWebhook {
  return paidTransformationPayload({
    uri: "https://api.calendly.com/scheduled_events/EVTDEMO3/invitees/INVDEMO3",
    email: "skyler.brooks@example.com",
    name: "Skyler Brooks",
    start: "2027-01-06T16:00:00.000Z",
    end: "2027-01-07T00:00:00.000Z",
    payment: null,
  });
}

export function cancelParkerPayload(): CalendlyWebhook {
  return {
    event: "invitee.canceled",
    created_at: "2026-11-13T18:00:00Z",
    payload: {
      uri: PARKER_INVITEE,
      email: "parker.quinn@example.com",
      name: "Parker Quinn",
      rescheduled: false,
    },
  };
}
