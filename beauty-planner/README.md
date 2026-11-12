# Flowed

A studio planner for event hair and makeup. Artists sign in, build a multi-day timeline backward from each ready-by time, and send the couple a private link to fill in the party.

This is a new multi-artist version of the ideas in the public [Flowed](https://github.com/flowecollective/flowed) prototype. It does not include that project's database credentials.

## Demo, no setup

```bash
cd beauty-planner
npm install
npm test
npm run dev
```

Open http://localhost:3000 and choose **Open the demo studio**. Sample clients (Avery Chen, Quinn Alvarez, and the Hale & Pine team) load from the browser. Nothing is saved to a server until you add Supabase keys.

## With accounts

See [SETUP.md](./SETUP.md) for the SQL migration, row-level security, env vars, and a Vercel deploy.

## Tests

`npm test` covers the scheduler (ready-by, hair-then-makeup, load balancing, bride finishing last, durations, buffers, the bride's touch-up, call-time and overlap warnings), share-token scoping, the sample studio, and calendar export.
