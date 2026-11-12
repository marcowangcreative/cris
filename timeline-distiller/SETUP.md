# Setup

Timeline Distiller is a Next.js app. It calls the Vercel AI Gateway for structured extraction and, when you paste a Formals share link, reads that shot list. It does not store timelines.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | Local and non-Vercel hosts | AI Gateway credential. On Vercel, leave it unset and the deployment's OIDC token (`VERCEL_OIDC_TOKEN`) is used. |
| `AI_GATEWAY_MODEL` | No | Model id from `https://ai-gateway.vercel.sh/v1/models`. Default is `anthropic/claude-haiku-4.5` (structured output, image and PDF input, zero data retention). |
| `FORMALS_SUPABASE_URL` | No | Override for the Formals project URL. |
| `FORMALS_SUPABASE_ANON_KEY` | No | Override for the Formals anon key. |

The Formals defaults are the public anon credentials already shipped in [marcowangcreative/formals](https://github.com/marcowangcreative/formals/blob/main/wedding-shot-list.html). This app only `SELECT`s a row. The slug in the share link is the access control, same as that tool.

Demo mode does not need a key. **Load demo** uses the cached sample in `lib/sample.ts`.

## Structured output

Extraction uses the AI SDK's `generateText` with `Output.object({ schema })` and a Zod schema. `generateObject` was removed after AI SDK 5. A plain `"provider/model"` string routes through the AI Gateway. There is no direct provider SDK and no provider API key in this app.

After the model returns, `lib/citations.ts` checks every line number against the source. A citation that points past the document is dropped. A clock time or phone number that is not on the cited line is marked inferred (phones that aren't on the line are cleared). Vendor beats such as catering load-in are removed. Sunset is always the flag "check sunset". The app does not look up a sun time.

## Local

Requires Node.js 22 or newer.

```bash
cd timeline-distiller
npm install
npm test
npm run dev
```

The dev server prints a local URL. Uploaded files are capped at 4 MB. Pastes are capped at 120,000 characters.

## Deploy on Vercel

1. Import the `marcowangcreative/cris` repository.
2. Set the project **Root Directory** to `timeline-distiller`.
3. Framework preset: Next.js. Install, build, and output settings can stay on the defaults (`npm install`, `next build`).
4. Add `AI_GATEWAY_MODEL` only if you want a model other than the default. A key is optional on Vercel because the platform provides `VERCEL_OIDC_TOKEN`. If the deployment is not linked to AI Gateway access, create a key in the Vercel dashboard and set `AI_GATEWAY_API_KEY` instead.
5. Deploy. Open the site and run **Load demo** before spending a model call.

Nothing in this app writes the timeline to disk or to a database. The day-of sheet, checklist edits, and shot-list text live in the browser's `localStorage` under `timeline-distiller:v1`. **Clear this browser** removes that copy.

## Formals shot list

Accepted inputs:

- A share link such as `https://your-host/wedding-shot-list.html?e=couple-slug`
- The slug on its own (`couple-slug`)
- JSON: a Supabase row `{ "couple_names", "data" }`, the `data` state object (`bride`, `groom`, sibling arrays, `disabled`, `custom`, `sortMode`), or `{ "groups": [{ "label", "people" }] }`
- A manual list, one group per line: `Both families — Priya, Elias, Anjali, Dev`

Disabled shots in a Formals export are left off the clock. Sort modes from that tool (`default`, `largest`, `smallest`, `efficient`, `efficient-bride`, `custom`) are honored.

## Calendar export

`.ics` times are floating local times (no timezone). Add a readable date on the sheet first. Items without a clock time are skipped. A missing end time becomes a 30-minute hold so the block shows up on a phone.
