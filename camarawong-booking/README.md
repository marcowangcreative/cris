# Camara Wong booking

A self-serve booking studio for [Camara Wong](https://www.camarawong.com), Marco Wang’s on-site portrait station in Houston. Someone who already knows what they want can pick a collection, hold a date, answer a few questions, sign, and pay. The studio then shows up.

The public site stays on Squarespace. This app is the booking desk those buttons should open, for example at `book.camarawong.com`.

## What a client can do

1. Choose a collection. The new **Corporate Portrait Station** is the cheapest tier and is meant to be finished online. Digital, Printed, and Custom can be booked the same way, and each one still has a “talk to us first” inquiry that does not hold a date.
2. Pick an open date and start time. The calendar reads the real book: blocked dates, the daily event cap, and existing reservations.
3. Give the event name, venue, guest count, load-in notes, on-site contact, and the email that receives the gallery link. Confirm the venue can offer about 12×12 ft, power, Wi-Fi for the iPad, and a table (or ask the studio to bring its 4 ft table). Ceiling height, outlet distance, and the load-in window are notes for the crew.
4. Sign a short agreement by typing their name and checking the box. The signed text is stored with a timestamp.
5. Pay. The corporate station is paid in full. The other collections pay the deposit in config. Stripe Checkout handles the card. A webhook marks the booking paid.
6. Land on a confirmation page, get an email, and download an `.ics` file. Reminder emails go out 7 days before and 1 day before.

## Demo mode

With no keys, the app still runs:

| Missing | What happens |
| --- | --- |
| `DATABASE_URL` | Bookings live in `data/store.json` on this machine. |
| `STRIPE_SECRET_KEY` | Checkout is a demo screen. Nothing is charged. The same “mark paid” path the webhook uses is what records it. |
| `RESEND_API_KEY` | Confirmation, reminder, and inquiry mail is printed in the server log. |
| `ADMIN_PASSWORD` | `/admin` explains that the password has to be set. There is no password in source. |

A fresh store is seeded with a paid corporate dinner, a digital booking waiting on its deposit, a blocked date, and one inquiry. Dates are relative to today, and they skip Mondays. `npm run seed` deletes the local file so the next request writes a new sample.

Demo mode is for trying the flow. Production needs Postgres (or Supabase), Stripe, Resend, and the secrets in [SETUP.md](SETUP.md).

## Prices live in one file

[`src/lib/config.ts`](src/lib/config.ts) is the only place for prices, durations, the deposit percent, add-ons, start times, and how far ahead someone can book.

| Collection | Price | Time | Due today |
| --- | --- | --- | --- |
| Corporate Portrait Station | $1,500 placeholder | 90 minutes, digital only | Paid in full |
| Extra hour (corporate only) | $1,000 placeholder | +60 minutes, up to two | Added to the full amount |
| Digital | $3,000 | 2 hours | 50% deposit |
| Printed | $6,000 | 3 hours | 50% deposit |
| Custom | $9,000 | 4 hours | 50% deposit |

The corporate price and the extra hour are placeholders. Both rows have `priceIsPlaceholder: true`, and the page labels them. Change the cents, then set the flag to `false` when Marco confirms the number.

The 4-hour custom block is an assumption. The public site describes that collection without a clock time. Change `durationMinutes` before relying on it.

The deposit is `depositPercent` (50). It applies only to packages with `paymentMode: "deposit"`. This app charges the amount due today. The balance is recorded, written into the agreement, and mentioned in the reminders. It is not a second Checkout session.

Other booking rules in that same file:

- Time zone `America/Chicago`
- Closed Mondays
- Start times 11:00, 14:00, 16:00, 18:00
- At least 2 days’ notice, and no further than 150 days out
- A hold lasts 20 minutes and refreshes when the details are saved
- After signing, the date stays reserved for 24 hours while they pay
- One event per date, unless the staff desk raises the cap (maximum 4)

## Double booking

A date is free only when all of these are true: it is not blocked, it is not a closed weekday, it is inside the booking window, the day’s reservations are under the cap, and the new window does not overlap a live reservation. Windows are half-open, so a station that ends at 6:00 does not block a 6:00 start.

Holds and unpaid-but-signed bookings count until they expire. Paid bookings count until someone cancels them. Expired holds do not. Two people grabbing the same slot are serialized, and only one hold is saved.

## Staff desk

`/admin` asks for `ADMIN_PASSWORD`. The session cookie is httpOnly and signed. The password is never written into the repo.

The desk lists bookings with status, intake, the signed agreement, and payment. It exports CSV, blocks dates, and sets the daily cap. Cancelling a paid booking frees the date. It does not refund the card. Refunds stay in the Stripe dashboard.

Each booking has a **Copy to VSCO Workspace** block. Paste that into VSCO by hand.

VSCO Workspace was not given a public API integration on purpose. A public API for VSCO Workspace has not been verified, so this app does not pretend to push jobs there.

## Squarespace

Point the Book buttons at this app instead of the inquiry form.

| Button | URL |
| --- | --- |
| Book / the station index | `https://book.camarawong.com/` |
| Corporate Portrait Station | `https://book.camarawong.com/book/corporate` |
| Digital | `https://book.camarawong.com/book/digital` |
| Printed | `https://book.camarawong.com/book/printed` |
| Custom | `https://book.camarawong.com/book/custom` |
| Talk to us first | `https://book.camarawong.com/inquiry?package=digital` |

In Squarespace: edit the button, choose a click-through URL, and paste the link. Use the package URL on that collection’s button so people skip the menu.

An embed is possible. The app allows framing from `camarawong.com` and `*.squarespace.com`.

```html
<iframe
  src="https://book.camarawong.com/book/corporate"
  title="Book Camara Wong"
  style="width: 100%; min-height: 900px; border: 0;"
></iframe>
```

Prefer a real link. Stripe Checkout leaves the frame on purpose (`window.top`) so the card form is not stuck inside the iframe. A button that opens `book.camarawong.com` is the reliable path. The iframe is there if a page needs the calendar inline and you accept that payment continues in the top window.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # availability, pricing, webhook, reminders, calendar file
npm run build
npm run seed     # delete the local demo file
```

## Layout

```
src/lib/config.ts          prices, deposit, hours, calendar rules
src/lib/pricing.ts         quote math
src/lib/availability.ts    open slots and double-booking rules
src/lib/payments.ts        Stripe webhook and demo payment
src/lib/contract.ts        agreement text
src/lib/store/             JSON file, or Postgres when DATABASE_URL is set
sql/schema.sql             the tables
src/app/admin/             password-protected desk
src/app/api/cron/reminders daily 7-day and 1-day mail
```

The agreement in `src/lib/contract.ts` is a working template. Have counsel read it before it is the contract you rely on.

Setup, env vars, Stripe, the database, Vercel, and the subdomain are in [SETUP.md](SETUP.md).
