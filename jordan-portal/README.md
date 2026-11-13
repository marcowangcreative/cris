# Jordan Wang studio portal

Demo portal for a Houston studio (planned domain jordanwangco.com, timezone America/Chicago). It is a public-repo MVP: fictional people only, no live payments, no real calendars, and no email.

Two journeys:

- **Private Transformations** are date-based. Calendly is the booking and $600 deposit entry point. Stripe runs through Calendly. The minimum investment is $1,200.
- **Weddings & Bridal** are inquiry-only. An inquiry creates a wedding project and does not reserve a date. Bridal prices, inclusions, availability, and cancellation terms are placeholders until the owner decides them.

Boulevard stays the system of record for retail SKUs and the final checkout. This portal plans the work: intake, uploads, proposals, and the studio desk.

## Setup

```bash
cd jordan-portal
npm install
npm test
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env.local` only if you want to change the Calendly URL, the release clock, or the demo secrets. Defaults work with no env file.

Demo sign-in is on `/login`. No email is sent. Sample profiles:

| Who | What you will see |
| --- | --- |
| Avery Lin | Confirmed transformation, proposal waiting, verified $600 deposit |
| Quinn Harper | Intake still open, deposit entered manually |
| Sage Romero | Wedding inquiry, no date held |
| Reese Calder | Confirmed wedding commitment |
| Noah Blake | Payment failed, date not confirmed |
| Studio Admin | Schedule, releases, weddings, exceptions |

Reset the local database:

```bash
npm run demo:reset
```

With `npm run dev` already running, fire sample Calendly webhooks (paid, duplicate, failed, missing, cancel, bad signature):

```bash
npm run demo:webhooks
```

The local database lives in `.data/` and is gitignored.

## What demo mode does

- Public landing, Private Transformations, and Weddings & Bridal inquiry.
- Signature-checked Calendly webhook. Duplicate deliveries are ignored via `integration_events.dedupe_key`. A succeeded $600 deposit is stored once, as `stripe_reservation_deposit`, never as a discount. A failed or missing payment does not confirm the booking.
- Magic-link sign-in that is shown on screen instead of emailed, plus one-click demo profiles.
- Client portal: next action, 10:00 a.m. day, included consultation, hair and chemical intake, private photo uploads, proposal approval with a timestamp, deposit and balance, separate marketing-photo consent, and a separate wedding view. Private stylist notes are not on this side.
- Studio desk: upcoming work, search, release batches with a pre-publish checklist, wedding pipeline only an admin can confirm, commitments that block transformation days, a sanitized ICS conflict feed, external Calendly / Stripe / Boulevard ids, an exceptions queue, and the Boulevard reconciliation helper.

Money is integer cents. Timestamps are timezone-aware. Card numbers are never stored.

$2,400 and $3,600 can be chosen on a transformation proposal inside the studio desk. They are quote levels, not packages, and they are not on the public site.

## Calendly checklist

Configure this before any real date is sold. The portal does not create the Calendly event types for you.

- [ ] Date-specific availability only. Do not leave a repeating open schedule that ignores the monthly release.
- [ ] One start time: 10:00 a.m. America/Chicago.
- [ ] A full-day duration, or buffers that cover the rest of the workday, so a second client cannot book the same day.
- [ ] Payment required before the invitee is confirmed. Amount: $600. Stripe is connected inside Calendly, not inside this app.
- [ ] A separate consultation event type. No fee. Default 30 minutes. Do not reuse the transformation event.
- [ ] The wedding conflict calendar connected, fed by the sanitized ICS export (`/api/admin/conflicts.ics` while a studio admin is signed in). That feed has no client names, notes, or contact details.
- [ ] Webhook subscription for `invitee.created` and `invitee.canceled`, pointed at `/api/webhooks/calendly`, signed with `CALENDLY_WEBHOOK_SIGNING_SECRET`.
- [ ] Weddings are not booked on the transformation event.

`NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL` is the public scheduling link for that event.

### Editorial calendar

The Editorial release poster is our calendar. Open and held days come from an availability adapter. The default is the fake adapter, built from the published demo release. No Calendly call is made, and no token is stored in the repo.

Choosing an open date shows the time and the $1,200 minimum with the $600 deposit on this site. Confirmation and the deposit are the only steps handed to Calendly. In the default demo that handoff is a panel labeled **Fake confirmation**. It does not open Calendly and it does not charge anything.

To read live availability instead:

1. In Calendly, turn on payments for the transformation event type and connect Stripe. The deposit amount is $600, required before the invitee is confirmed. This app still never sees the card.
2. Set `CALENDLY_EVENT_TYPE_URI` to that event type’s API URI (`https://api.calendly.com/event_types/...`).
3. Set `CALENDLY_TOKEN` to a personal access token. Keep it server-only. Do not commit it, and do not put it in a `NEXT_PUBLIC_` variable.
4. Set `NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL` to the same event’s public link.
5. Restart the server. `/api/availability` and the Editorial poster then use the Calendly adapter. An open time opens the Calendly popup, or the direct slot link, with newsprint, ink, and tomato colors. The other concepts are unchanged.

If either `CALENDLY_TOKEN` or `CALENDLY_EVENT_TYPE_URI` is missing, the fake adapter stays on.

## Boulevard checkout SOP

Per project, the studio desk shows the agreed service total, the external deposit with its Stripe reference, the balance to collect, and a field for the Boulevard order ref.

1. Use the approved proposal total as the service price in Boulevard. Do not re-price the deposit out of the service.
2. The $600 was already collected in Stripe through Calendly. Do not charge it again.
3. Record that deposit in Boulevard as an external payment type named **Stripe reservation deposit**.
4. Never record it as a discount, a coupon, or a reduced service price.
5. Collect the remaining balance in Boulevard (for a $1,200 total, that balance is $600).
6. Paste the Boulevard order reference back onto the project.
7. If the desk flags a duplicate deposit, stop and reconcile before checkout.
8. Amounts marked **verified** came from the webhook. Amounts marked **manually entered** were typed by the studio and still need a human check.

## Supabase

SQL migrations live in `supabase/migrations/`. They create the tables, integer-cent payments, `timestamptz` columns, private-note and private-file RLS, and a private Storage bucket `client-assets` keyed by `{client_id}/…`.

Apply them to a Supabase project you control when you are ready. Leave the keys blank in this public repo. `DEMO_MODE=true` (the default) never connects. Setting `DEMO_MODE=false` does not turn on a live data path; it refuses rather than writing to a production project by accident.

`auth.uid()` is Supabase Auth. The policies let a client read and upload only their own rows and objects. `project_notes` and `commitments` have no client policies. Admins are rows in `staff`.

## Tests

```bash
npm test
```

Covers duplicate webhooks, failed and missing payments, deposit math, a wedding commitment blocking a date, release publishing leaving existing bookings untouched, the 10:00 a.m. America/Chicago rule across DST (including the SQL function), and RLS denying cross-client file access.

## Open owner decisions

- [ ] Release day and time (demo default: the 1st at 9:00 a.m. America/Chicago, opening the month two months ahead)
- [ ] Which three weekdays (demo default: Tuesday, Wednesday, Thursday)
- [ ] Calendly plan and the Stripe account connected through it
- [ ] Zoom or Teams for the included consultation
- [ ] Cancellation and refund terms
- [ ] What happens when a consultation shows the service is not a fit
- [ ] Bookkeeper approval of the Boulevard reconciliation method
- [ ] Bridal scope and pricing
- [ ] Final branding and copy

Until those are decided, the public pages keep the matching sections marked as placeholders and do not invent bridal prices or cancellation rules.
