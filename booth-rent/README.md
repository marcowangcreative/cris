# Booth Rent

Weekly chair-rent collection for salon owners. Each owner signs in with a Supabase magic link, keeps a private roster of stylists, and runs a Monday–Sunday billing week. Stylists pay by ACH on a Stripe hosted invoice. They have 2 days. They are never auto-charged.

This is a multi-salon version of the single-salon tool Flowe Collective uses internally. It does not share that app's password, keys, or database.

## Billing rules

Net service revenue is service sales minus discounts and refunds. Tips are not included. The owner types that number (or imports a CSV). The app does not connect to Boulevard.

Each stylist has one model:

| Model | What gets invoiced |
| --- | --- |
| Flat weekly | The weekly rent, every week. Revenue is stored and does not change the amount. |
| Flat monthly | The monthly rent once per calendar month, on the first run whose week **ends** in that month. Later weeks in that month are skipped. |
| Rent + percentage fee | Weekly rent plus a percentage of net service revenue. The percentage can have a monthly cap. Leave the cap empty for no cap. |
| % chair rent | The greater of a percentage of net service revenue and a weekly minimum. The two are not added. |

Month and cap rules, for rent + fee and for flat monthly:

- A week belongs to the calendar month of its **end** date. A week that starts in December and ends in January counts entirely toward January.
- Invoices in `sent`, `processing`, or `paid` count toward the cap and toward "already billed this month."
- `failed` and `void` do not. A failed monthly invoice can be billed again on a later week. A failed fee does not use up the cap.

The rules live in `lib/billing/calculate.ts` and are covered by `npm test`. The form starts from a common booth example ($600 a week, 7.5% with a $1,000 cap, or 35% with a $600 minimum). Every number is editable per stylist.

## Demo mode

With no Supabase URL, the app runs as the fictional salon **Lumen Room**. Nothing calls Stripe.

```bash
cd booth-rent
npm install
npm run dev
```

Open http://localhost:3000 and choose **Open the demo salon**. The billing run is prefilled. You can change a number, import `public/sample-revenue.csv`, send invoices, and use **Mark processing / paid / failed** where a Stripe webhook would update status.

Set `NEXT_PUBLIC_DEMO_MODE=false` to require Supabase even when the URL is empty. Set it to `true` to force the demo even when Supabase is configured. Demo mode replaces the database; don't turn it on in a production deployment.

Demo data is stored in `booth-rent/.demo/store.json` (gitignored) and resets when the billing week changes.

## Real setup

Create a Supabase project and a Stripe **sandbox** (Stripe's recommended place to develop a new integration). A classic test-mode key also works. Do not use a live key until you mean to move money.

### 1. Supabase

1. In Authentication → URL configuration, allow redirect `http://localhost:3000/auth/callback` (and your production origin).
2. Leave email magic links enabled.
3. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) once.
4. Copy the project URL, the anon key, and the service role key into `.env.local`. Copy [`.env.example`](.env.example). Never commit `.env.local`.

Row level security is on for `salons`, `stylists`, and `invoices`, and it is forced. An owner can only read and write rows whose salon they own (`auth.uid()`). Anonymous access is revoked. Owners can insert invoices as drafts and move them to sent or failed; they cannot set `paid` or `processing`. The service role bypasses RLS and is used only by the Stripe webhook, which is what marks invoices processing, paid, or failed after ACH. Amounts on a sent invoice are locked by a trigger.

There is no shared admin password.

### 2. Stripe

Put a sandbox or test secret key in `STRIPE_SECRET_KEY`. Webhooks are required for ACH, because a debit stays in processing for several business days before it pays or fails.

Events the webhook handles:

- `checkout.session.completed`
- `setup_intent.succeeded`
- `setup_intent.requires_action`
- `invoice.sent`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.voided`
- `invoice.marked_uncollectible`
- `payment_intent.processing`
- `charge.pending`

Local forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the CLI signing secret in `STRIPE_WEBHOOK_SECRET`. In production, create the endpoint in the Stripe Dashboard for the same events and use that signing secret.

Hosted invoices are ACH only (`us_bank_account`), `collection_method=send_invoice`, due in 2 days. Stripe emails the stylist. Card is not offered.

Stripe's published test bank: routing `110000000`, account `000123456789`.

### 3. Environment

See [`.env.example`](.env.example).

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server auth. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Webhook writes. Bypasses RLS. |
| `STRIPE_SECRET_KEY` | Sandbox or test secret key for the owner's Stripe account |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key, reserved for future client use |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Origin with no trailing slash, used on Stripe return URLs |
| `NEXT_PUBLIC_DEMO_MODE` | `true`, `false`, or empty (demo when the Supabase URL is empty) |

```bash
npm run dev
npm test
npm run build
```

Sign in from `/login`. The first visit asks for a salon name. Add stylists, create a bank setup link and send it to them, then run the week from **Billing run**.

## Stripe Connect

This MVP bills through one Stripe account: the keys in the environment. That is enough for a single owner proving the workflow, and it is the wrong long-term shape for many salons.

Stripe Connect is how payouts become per-salon. Each owner would onboard a connected account. `salons.stripe_account_id` is already on the table and is unused. Every Stripe customer, setup-session, and invoice call goes through `connectRequestOptions()` in `lib/stripe/connect.ts`, which is the place to pass `{ stripeAccount }`. Webhook events from connected accounts include `event.account`; `connectOptionsFromWebhookAccount()` is the matching stub. Neither function changes the Stripe account today.

## What's still rough

- No Boulevard connection. Revenue is typed or imported.
- One salon per login. The platform is multi-salon; an owner is not.
- Stripe Connect is stubbed, so every salon on a deployed instance shares the env Stripe account.
- Demo mode is a local JSON file, not a hosted multi-user demo.
- The app does not email the bank setup link itself. The owner copies the Stripe Checkout URL. Stripe does email the invoice.
- An owner can mark their own sent invoice failed or void through the database role. They cannot mark it paid or processing, and they cannot change the amount after it leaves draft.
- Paid and void invoices do not reopen. A dispute after `paid` is not handled.
- Invoice history for the cap is loaded in full. Fine for a salon, not for a huge archive.
- ACH "processing" depends on the webhook. If the signing secret is wrong, invoices stay on sent.
- There is no reminder email beyond the overdue flag on Who owes what.
- Row level security is real SQL, not an app-level filter, but this repo does not ship a hosted Supabase project. `supabase/rls_check.sql` is a Postgres check you can run locally (see below).

### Checking RLS locally

The SQL editor on Supabase is the deployment path. To execute the policies against Postgres:

```bash
docker run --rm --name booth-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:16
# wait until it accepts connections, then:
docker exec -i booth-pg psql -U postgres -v ON_ERROR_STOP=1 < supabase/rls_harness.sql
docker exec -i booth-pg psql -U postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
docker exec -i booth-pg psql -U postgres -v ON_ERROR_STOP=1 < supabase/rls_check.sql
```

Do not run `rls_harness.sql` inside Supabase. It only exists so a stock Postgres can host `auth.uid()` and the `anon`, `authenticated`, and `service_role` roles.
