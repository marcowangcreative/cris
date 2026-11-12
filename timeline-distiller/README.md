# Timeline Distiller

A day-of sheet for wedding photographers. Paste a planner timeline, or upload a PDF, Word doc, text file, or photo. The sheet keeps the times, places, people, and hard rules, and leaves catering, linen, and DJ setup out.

Family groups from [Formals](https://github.com/marcowangcreative/formals) slot into the formals window. A small group defaults to 2 minutes. Groups over six people take longer. If the window is too short, the sheet says so.

## Run it

```bash
cd timeline-distiller
npm install
npm test
npm run dev
```

Open the app and choose **Load demo**. That path uses a cached extraction and does not call a model.

To distill a real timeline, copy `.env.example` to `.env.local` and set `AI_GATEWAY_API_KEY`. See [SETUP.md](./SETUP.md).

## What stays on the device

The working sheet is saved in this browser's `localStorage`. Requests are not written to a database, and uploaded documents are not logged.
