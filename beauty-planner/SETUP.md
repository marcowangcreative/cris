# Setup

Flowed runs in two modes.

- **Demo.** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, the app signs into a sample studio stored in `localStorage`. Use this for a first look and for screenshots.
- **Studio.** With both env vars set, artists sign in through Supabase Auth. Every row is scoped to that user, and share links go through token RPCs instead of reading the tables.

## 1. Supabase project

Create a project at [supabase.com](https://supabase.com). In **SQL Editor**, run the whole file:

`supabase/migrations/001_init.sql`

That script creates:

| Table | What it holds |
| --- | --- |
| `profiles` | One row per auth user, created by a trigger on signup |
| `stylists` | The studio roster |
| `events` | Couple, timing defaults, packing state, and the two share tokens |
| `event_days` | Date, ready-by, artist call time, travel buffer |
| `event_members` | Party, services, prices, inspiration links |
| `event_stylists` | Which roster artists are on this event |

Row level security is enabled on every table. Policies allow `authenticated` users to read and write only rows they own (`owner_id = auth.uid()`, or a parent event they own). `anon` has no table grants and no policies, so the public key cannot `select` events.

Share links do not use the event id. Each event gets two 24-byte hex tokens (`client_token`, `timeline_token`), generated with `gen_random_bytes`. These functions are `security definer`, `search_path = public`, and look up exactly one event:

- `client_get_event(token)` returns the party, the days, and the artists assigned to that event. No prices, no packing list, no other events, no one from the roster who is not on the event.
- `client_save_party(token, members)` updates only that event's party. It keeps existing prices and duration overrides, drops stylist ids that are not assigned to the event, and ignores day ids from anywhere else.
- `timeline_get_event(token)` is read-only and returns the schedule inputs, with prices forced to 0.
- `upsert_event(payload)` is granted only to `authenticated`. It sets `owner_id` from `auth.uid()` and refuses another studio's event id.

In **Authentication → Providers**, keep Email enabled. For a local project you can turn off "Confirm email" so sign-up returns a session immediately. If confirmation stays on, the app tells the artist to check their inbox before signing in.

In **Authentication → URL configuration**, add your local and Vercel origins to the redirect allow list.

Do not create a storage bucket for this MVP. Inspiration photos are `https` links. Do not paste the service-role key into the app.

## 2. Environment

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

The anon key is safe to expose to the browser only because RLS and the token functions are in place. Restart `npm run dev` after changing env vars. Next inlines `NEXT_PUBLIC_*` at build time.

## 3. Local commands

```bash
npm install
npm test
npm run dev
```

`npm run typecheck` runs `tsc --noEmit`. `npm run build` produces the production bundle.

## 4. Vercel

1. Import the Git repository.
2. Set the project **Root Directory** to `beauty-planner`.
3. Add the two `NEXT_PUBLIC_` variables for Production and Preview.
4. Deploy. The app is a standard Next.js App Router build; no extra output setting is required.
5. Add the deployment origin to the Supabase auth redirect allow list.

A deploy with the variables unset still boots, in demo mode, on that deployment. Do not rely on demo mode for real client links: the data lives in each browser.

## 5. What the share URLs look like

- Client party form: `/share/client/<48-char token>`
- Read-only timeline: `/share/timeline/<48-char token>`

Knowing one token does not grant the other. Neither token is the event UUID. Tokens do not expire in this MVP; treat a leaked link as access to that one event until you replace the row's token in SQL.

## 6. Not in this MVP

- Inspiration file upload (links only)
- Token expiry, revoke button, or rate limits on the public RPCs
- A live check that the SQL and the TypeScript sanitizer cannot drift; the rules are duplicated in `lib/access.ts` (demo and tests) and in the SQL functions (production)
- Email delivery of the client link (the studio copies the URL or the timeline text)
