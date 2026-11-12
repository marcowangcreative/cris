# School digest

A weekly, per-child digest of school news that is scattered across Gmail, forwarded app notices, and WhatsApp class chats.

It collects the last 7 days, throws out routine noise (such as a daily pickup confirmation), and files what is left into:

- **Do first** — forms, payments, supplies, homework, and replies
- one section **per child**
- **Money**
- **Calendar candidates** (plus an `.ics` file)
- **Unclear** — a message that does not name one child stays here

WhatsApp lines from a teacher or the office are marked official. Lines from other people in the chat are marked parent chatter, even when they repeat a real date. The same event seen in an email and a chat is kept once, and every copy is cited.

The checked-in sample uses obviously fake names (`Kid A`, `Example Elementary`, `parent@example.test`). Put real account ids, tokens, and family details in gitignored files only. This repository is public.

## Try it on the fake fixtures

Requires Node.js 22 or newer.

```bash
cd school-digest
npm install
npm test
npm run sample
```

`npm run sample` rebuilds [`sample-output.md`](sample-output.md) from `fixtures/` as of Thursday, November 12, 2026, 7:00 PM America/Chicago. It does not call Gmail or a model. `npm test` checks that file still matches the pipeline.

## What you set up for a real inbox

1. Copy the example config and env file. Edit the copies. Both real files are gitignored.

   ```bash
   cp config.example.json config.json
   cp .env.example .env
   ```

2. In `config.json`, list each child: display name, grade, program, sender domains, keywords, and WhatsApp group names. Keywords and group names are how a message is attached to a child. A domain listed on **one** child is enough to attach mail from that school. A domain listed on several children, or only under `also_include_sender_domains` (district mail, ParentSquare), is read but does not pick a child by itself.

3. Create a Google Cloud OAuth client and authorize each Gmail account (below).

4. Choose a model provider and put its API key in `.env` (below). Without a key, the digest still runs, using the offline heuristic that produced the sample. The heuristic understands common phrases ("permission slip", "no school", "tuition", "please reply"). A model handles wording the heuristic does not.

5. Each week, export WhatsApp chats **without media** into `inbox/whatsapp/`, or email those `.txt` files to a connected Gmail account. Forward any app notice that is not already in Gmail into `inbox/drop/` as `.eml` or `.txt`.

6. Run it:

   ```bash
   npm run digest -- --deliver file
   ```

   Output lands in `out/digest.md`, `out/digest.html`, and `out/digest.ics`. `--deliver gmail` sends the HTML and the calendar file from `delivery.from_account` to `delivery.to`. Start with `file` until a week looks right.

Useful flags:

| Flag | What it does |
| --- | --- |
| `--deliver file` or `--deliver gmail` | Write files, or also send mail |
| `--extractor heuristic` or `--extractor llm` | Offline rules, or the model. Default is the model when `LLM_API_KEY` is set |
| `--skip-gmail` | Only the drop folders |
| `--fixtures` | The committed fake data, no Gmail |
| `--as-of 2026-11-12T19:00:00-06:00` | Pretend "now" is this instant |
| `--no-ics` | Skip the calendar file |
| `--scheduled` | Exit unless it is Sunday 7 PM in the config timezone |

## Google OAuth (one client, one token per inbox)

The Gmail API needs a desktop OAuth client. Scopes used are `gmail.readonly` and `gmail.send`.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Configure the OAuth consent screen. External is fine. Add every Gmail address you will connect as a **test user** while the app is in testing.
3. While the app stays in **Testing**, Google expires refresh tokens after 7 days, so a weekly job will start asking you to sign in again. For a personal project, move the consent screen to **In production**. You will see an "unverified app" warning because Gmail scopes are sensitive; that is expected for a private client only you use. Do not add other people's accounts.
4. Create an OAuth client ID of type **Desktop**. If it asks for redirect URIs, add `http://127.0.0.1:42813`.
5. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. On your own computer (the login redirects to localhost), run:

   ```bash
   npm run auth -- --account inbox-a
   ```

   Sign in as that Gmail account and approve access. Repeat with `--account inbox-b` for a second inbox. Account ids must match `gmail_accounts` in `config.json`. Tokens are written to `tokens/<account>.json`, which is gitignored.

Run `npm run auth` on a machine with a browser. A remote server can complete the same flow if port 42813 is forwarded to your laptop.

For GitHub Actions, paste the token files into the `SCHOOL_DIGEST_TOKENS_JSON` secret as one JSON object keyed by account id:

```json
{
  "inbox-a": { "refresh_token": "...", "token_type": "Bearer" },
  "inbox-b": { "refresh_token": "...", "token_type": "Bearer" }
}
```

## Model API key

Set these in `.env`. The key is never read from the config file; a config that contains `api_key`, `token`, or `client_secret` is rejected.

| Variable | Role |
| --- | --- |
| `LLM_API_KEY` | Bearer token for OpenAI-compatible hosts, or the Anthropic key |
| `LLM_PROVIDER` | `openai`, `anthropic`, or `openai-compatible` |
| `LLM_MODEL` | For example `gpt-4o-mini` |
| `LLM_BASE_URL` | OpenAI-compatible base, default `https://api.openai.com/v1` |

Anthropic is called at `https://api.anthropic.com/v1/messages`. Any other OpenAI-compatible host (Groq, OpenRouter, a local server) uses `LLM_BASE_URL` plus `/chat/completions`.

The model must return JSON items with `message_id`, `child`, `category`, `title`, `date`, `deadline`, `amount`, `action_needed`, and `info_type`. A child id is kept only when the message names that child (keyword, WhatsApp group, or a domain that belongs to only that child). Otherwise the item is stored as `unclear`.

## Export a WhatsApp chat on iPhone, without media

1. Open WhatsApp and the class group.
2. Tap the group name at the top.
3. Scroll to the bottom and tap **Export Chat**.
4. Tap **Without Media**.
5. Mail the `.txt` to yourself, or save it and copy it to `inbox/whatsapp/`.

Keep the filename WhatsApp gives you (`WhatsApp Chat with 2nd Grade Room 12.txt`). The group name has to match `whatsapp_groups` in the config. If WhatsApp wraps the export in a `.zip`, unzip it and keep the `.txt`.

On Android: open the chat, tap the three dots, then **More → Export chat → Without media**.

The phone's date order matters for dates like `05/11/2026`. This project defaults to month/day/year (`date_order: "MDY"`), which matches a US phone. Set `"DMY"` if the phone writes day/month/year. A day number above 12 is recognized either way.

Export each group once a week. Only messages inside the last 7 days are used, so a full history is not required. iOS and Android text formats both work, including multiline messages. Encryption notices, "added you" lines, and `<Media omitted>` lines are dropped.

## Schedule: Sunday 7:00 PM US Central

`config.example.json` uses `America/Chicago`.

**On a computer whose cron supports `CRON_TZ` (Debian and Ubuntu):**

```cron
CRON_TZ=America/Chicago
0 19 * * 0 cd /absolute/path/school-digest && /usr/bin/npm run digest -- --deliver file
```

**On cron that has no timezone field**, run hourly and let the script exit unless Chicago time is Sunday 7 PM. Sunday evening in Chicago is already Monday in UTC:

```cron
0 * * * 0,1 cd /absolute/path/school-digest && /usr/bin/npm run digest -- --scheduled --deliver file
```

**GitHub Actions** cron is UTC and cannot name a US timezone. Copy [`examples/github-actions-school-digest.yml`](examples/github-actions-school-digest.yml) to `.github/workflows/school-digest.yml`. It fires at both 00:00 and 01:00 UTC Monday (7 PM Central in daylight time and in standard time). `--scheduled` produces a digest for only one of those hours. The example writes files and uploads them as a workflow artifact. Change `--deliver file` to `--deliver gmail` when you want it to send.

The copy under `examples/` does not run by itself.

## What this can't see

- Notifications that stay inside an app and never become email: ParentSquare, ClassDojo, Seesaw, Remind, district apps, after-school apps, and billing portals. Turn on email notifications in each app, or forward the notice into `inbox/drop/`.
- WhatsApp messages that were not in this week's export.
- Photos, PDFs, voice notes, and flyers. "Without media" leaves those out, and this tool does not open PDF or image attachments. If the only copy of a form is a PDF, paste the text into `inbox/drop/` or forward a message that includes the words.
- Any Gmail account you have not authorized, and any message older than the window (7 days by default).
- Mail that matches the ignore list. The example ignores pickup-confirmation senders and subjects. A subject keyword drops the whole message, so keep those phrases specific.

Gmail search is only a coarse prefilter (`after:` the day before the window). The 7-day cutoff is applied again from each message's own timestamp, including each line inside a WhatsApp export.

## Layout

```
config.example.json     committed template
config.json             your copy (gitignored)
fixtures/               fake emails and chats used by tests and the sample
inbox/whatsapp/         real exports (gitignored)
inbox/drop/             forwarded .eml / .txt (gitignored)
tokens/                 Gmail tokens (gitignored)
src/                    ingest, extract, dedupe, render
examples/               cron and GitHub Actions samples
```

## Tests

```bash
npm test
```

That typechecks and runs the WhatsApp parser tests, the dedupe tests, the 7-day window tests (including Sunday 7 PM Central in both daylight time and standard time), and a full pass over the fake fixtures.
