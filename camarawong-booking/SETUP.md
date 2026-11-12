# Setup

How to run the Camara Wong booking app locally, and what has to be true before it takes a real card at `book.camarawong.com`.

## Requirements

- Node.js 20 or newer
- A Stripe account for test, then live, payments
- Postgres, including Supabase’s Postgres, for anything that must survive a deploy
- Resend, with the sending domain verified, for real email
- A Vercel project for hosting

## Run it with no keys

```bash
cd camarawong-booking
npm install
cp .env.example .env.local
```

Set one line in `.env.local`:

```bash
ADMIN_PASSWORD=choose-a-long-password
```

Leave the other values blank. Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Book a collection through to the demo payment screen. The staff desk is [http://localhost:3000/admin](http://localhost:3000/admin). Mail shows up in the terminal as `[camarawong email:demo]`. Bookings are written to `data/store.json`, which is gitignored.

`npm run seed` deletes that file. The next page load writes a new sample: one paid corporate booking, one digital booking waiting on the deposit, a blocked date, and an inquiry.

Do not commit `.env.local`.

## Environment

| Variable | Required to go live | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | Staff desk password. No default, and it must not be committed. |
| `ADMIN_SESSION_SECRET` | Recommended | Signs the admin cookie. If blank, the password is the signing key. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL with no trailing slash, `https://book.camarawong.com`. Emails and calendar links use it. Checkout return URLs use the request host when this is blank, which is fine locally. |
| `STRIPE_SECRET_KEY` | Yes | `sk_test_…` while rehearsing, `sk_live_…` when charging. Blank means demo payment. |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_…` for `/api/stripe/webhook`. |
| `DATABASE_URL` | Yes | Postgres connection string. Blank means the local JSON file. |
| `SEED_ON_EMPTY` | Set `false` after launch | An empty database or missing JSON file is seeded with sample events. Set `false` so a wiped table is not refilled with the demo. |
| `RESEND_API_KEY` | Yes | Sends mail. Blank prints to the server log. |
| `RESEND_FROM` | Yes | Verified sender, for example `Camara Wong <bookings@camarawong.com>`. |
| `STUDIO_INBOX` | Yes | Copy of confirmations, reminders, and inquiries. Defaults to `studio@camarawong.com`. |
| `CRON_SECRET` | Yes | Bearer token for the reminder route. |

## Stripe test mode

No Stripe Product has to be created. Checkout uses `price_data` and the amount from the booking, in cents.

1. In the Stripe dashboard, switch to **Test mode**.
2. Developers → API keys → copy the secret key into `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → add an endpoint:
   - URL: `https://book.camarawong.com/api/stripe/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Locally, the Stripe CLI can forward events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_…` the CLI prints as `STRIPE_WEBHOOK_SECRET` for that session.

A successful card is `4242 4242 4242 4242`, any future date, any CVC, any ZIP. The webhook is what marks the booking paid. The confirmation page says the payment is still settling until that event arrives. Refresh it.

The corporate station charges the full quote, including extra hours. Digital, Printed, and Custom charge the deposit only (`depositPercent` in `src/lib/config.ts`). The webhook rejects a session whose amount is not the amount due today.

When `STRIPE_SECRET_KEY` is set, the demo payment route returns 404. You cannot mark a booking paid by hand on a server that has Stripe keys.

## Database

`sql/schema.sql` creates `studio_settings`, `bookings`, and `inquiries`. The app runs that file on startup when `DATABASE_URL` is set, so a new database comes up on its own. You can also run the file yourself in the Supabase SQL editor.

Supabase:

1. Create a project.
2. Project Settings → Database → connection string. The URI form is the one `DATABASE_URL` wants.
3. If you use the transaction pooler (port 6543), that is fine. The client disables prepared statements, which that pooler requires.
4. Leave `SEED_ON_EMPTY` unset for the first boot if you want the sample rows. Then set `SEED_ON_EMPTY=false`, and delete the sample bookings from the staff desk or with SQL before real clients arrive.

```sql
delete from bookings where id like 'seed_%';
delete from inquiries where id like 'seed_%';
```

Local JSON and Postgres are not mixed. If `DATABASE_URL` is set, the JSON file is ignored. If the database is down, the app errors instead of quietly writing to the file, so a booking cannot land in two places.

## Email

1. Add the sending domain in Resend and publish the DNS records it asks for.
2. Set `RESEND_API_KEY` and `RESEND_FROM` to an address on that domain.
3. Set `STUDIO_INBOX` to the mailbox that should see every confirmation, reminder, and inquiry.

Without a key, nothing is sent. The text is logged.

## Reminders

`vercel.json` calls `GET /api/cron/reminders` every day at 14:00 UTC (8:00 or 9:00 in Houston, depending on daylight time). Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set on the project. The route does nothing without that header.

A paid booking is mailed when the event date is 7 days away, and again when it is 1 day away, in `America/Chicago`. Each one is sent once. A failed send clears the stamp so the next run can retry.

To fire it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Vercel and the subdomain

1. Import the repo. Set the project root to `camarawong-booking` if the repo contains other folders.
2. Add the env vars above. Use test Stripe keys first.
3. Deploy.
4. Add the domain `book.camarawong.com`.
5. At the DNS host for `camarawong.com`, add the record Vercel shows. It is usually a CNAME from `book` to `cname.vercel-dns.com`.
6. Wait until the domain is verified and HTTPS is on.
7. Put that exact origin in `NEXT_PUBLIC_APP_URL` and redeploy so the emails match.
8. Create the Stripe webhook against `https://book.camarawong.com/api/stripe/webhook`, then put the new signing secret in Vercel.

Vercel Cron is included for this schedule on the plans that allow cron. Confirm the job appears under the project’s Cron Jobs after deploy.

## What Marco has to do before a real client pays

1. Confirm the corporate price and the extra-hour price in `src/lib/config.ts`. Both are placeholders ($1,500 and $1,000). Set `priceIsPlaceholder` to `false` when the numbers are final.
2. Confirm the custom duration (currently 4 hours), the 50% deposit, start times, Monday closure, and the 2-day notice rule in that same file.
3. Have counsel read `src/lib/contract.ts`. The signed copy stored on each booking is whatever the template said at the moment they signed.
4. Create the database, set `DATABASE_URL`, boot once, then set `SEED_ON_EMPTY=false` and delete the sample rows.
5. Rehearse one booking in Stripe test mode and confirm the webhook, the email, the `.ics` file, the reminder route, and the staff desk.
6. Verify the Resend domain and set `STUDIO_INBOX` to a mailbox someone reads.
7. Set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `CRON_SECRET` to long random values.
8. Attach `book.camarawong.com` and point the Squarespace Book buttons at it. See the URL table in [README.md](README.md).
9. Switch Stripe to live keys and a live webhook only after the test booking looks right. Create new live bookings paused from the client’s point of view until that switch: test keys cannot be mixed with a live charge.
10. For the studio schedule, open each paid booking and use **Copy to VSCO Workspace**. There is no VSCO API call in this app.

The balance on Digital, Printed, and Custom is due seven days before the event and is not collected by a second card form. Collect it the way the studio already collects balances, or extend the app later.
