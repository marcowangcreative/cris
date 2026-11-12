# Dynamic Pricing Engine

Internal revenue desk for **Marco Wang Photography** (Houston). It recommends what to quote when a wedding inquiry comes in. Marco approves the number. The app does not change prices couples see publicly, and it never reprices a quote that has already been approved.

The goal is revenue per available shooting date: protect peak Saturdays, fill softer dates without cheapening the brand, and refuse a seasonal discount when the couple can pay the standard rate.

The pricing engine in `src/engine/` is a pure module. It does not read the browser, the clock, or the network. The screens are a thin desk on top of it. This copy is for Marco Wang Photography in Houston, including associate weddings shot under that brand. It is not a subscription product for other studios. The engine is separate so it could be licensed later without rebuilding the math.

Nothing here is client-facing. Couples never see a price, a multiplier, or the reasoning. A public instant-pricing page is a future idea only and is not part of this app.

## Run locally

Copy `.env.example` to `.env` and set `PRICING_PASSWORD` to a password you choose. The desk stays locked until that variable is set. The password is not in the source.

```bash
cd dynamic-pricing
cp .env.example .env
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The same password works on a phone browser.

```bash
npm test
npm run build
```

`npm test` runs the engine unit tests. `npm run build` typechecks and writes `dist/`.

## Deploy

The app is a static Vite build.

1. Import the repo on Vercel.
2. Set the project **Root Directory** to `dynamic-pricing`.
3. Framework preset: **Vite**. Leave the build command as `npm run build` (typecheck plus Vite) or the default `vite build`. Output directory: `dist`.
4. Set the environment variable `PRICING_PASSWORD` for Production and Preview. Do not commit it, and do not put it in client code. The unlock check reads that variable on the server (`/api/unlock`).
5. A later host can be `pricing.marcowang.com`. Point that domain at this project when you are ready.

Quotes and settings stay in this browser’s `localStorage`. An approved quote keeps the price you sent until its validity window ends (14 days by default, editable in Settings). Expiry does not calculate a new price.

## How a quote is built

1. Pick an offering tier. **Marco (lead)** is the $10,800 Signature package (9 hours, 2 photographers), with Petite $4,800, Classic $7,200, and Atelier $13,500. **Associate** is a separate rate card, seeded with placeholder prices ($3,200 / $4,800 / $6,400) that need editing before a real quote. Each tier has its own packages, its own corridor, and its own calendar.
2. Add season (market demand index), day of week, lead time, inquiry pressure, that tier's monthly fill, that tier's same-date scarcity, extra travel days, and a small history nudge. Marco can cover one wedding on a date. The associate placeholder assumes four associates can cover the same date, so one booking does not fill their day the way it fills Marco's.
3. Tilt for the objective: maximize revenue, balanced, or fill dates. The objective is shared. The corridor is not: Marco (lead) is 15% below to 20% above, and the associate placeholder is 20% below to 15% above.
4. Hold the result inside that tier's corridor, then round to the nearest **$50**.
5. A peak Saturday (demand index 120 or higher: Houston’s March, April, May, October, November) is not quoted below the package base, unless the objective is fill dates, which may soften it to 97% of base.
6. **Charge standard / no discount**, a **client budget at or above the base**, or a **manual price** then refuses to go under the package base. A low-season index does not discount a couple who can pay. Premiums above the base can stay. A manual price below the base is raised to the base.
7. If the demand model hits the corridor floor, the next cheaper package is offered only as a **secondary** option. It does not replace a standard-rate hold.
8. A stated budget is compared with the quote after that:
   - At or above the suggested quote: the number does not change.
   - Between the floor and the suggested quote: the desk shows how far the price would have to drop, and whether that number is still inside the corridor. The suggested quote stays put.
   - Below the floor: the quote is never cut through the floor. The desk lists smaller packages (fewer hours, one photographer), a weekday, and an off-peak date whose prices fit the budget. Hours and photographer counts are edited in Settings.

Houston’s illustrative index (100 = baseline): Jan 95, Feb 105, Mar 120, Apr 130, May 125, Jun 105, Jul 65, Aug 60, Sep 85, Oct 135, Nov 130, Dec 105. Aspen, Carmel, and New York ship with their own illustrative curves so seasonality is per market. Every weight lives on the Settings screen.

### Worked examples

Neutral inputs: one qualified inquiry, 3 of 5 dates booked (the 60% utilization neutral point), one local day, balanced objective.

| Inquiry | Model | What you send |
| --- | --- | --- |
| Saturday, October 16, 2027, inquired November 12, 2026, Signature | $12,420 before rounding, **$12,400** after | The notes’ sketch was +10% October and +5% Saturday. |
| Wednesday, August 4, 2027, inquired February 4, 2027, Signature | **$9,350** | The soft index is allowed to discount. |
| That same August date, with Charge standard on, or a budget of $10,800 or more | Model still $9,350 | **$10,800**. The desk flags “budget supports standard rate, discount not needed” when the budget covers the base, and records **$1,450** kept versus the model. |
| That August date on the Associate tier (placeholder signature $6,400), charge standard | Model **$5,550** | **$6,400**. The hold uses the associate base. One of four associate slots filled is a smaller scarcity premium than Marco's only slot. |

History keeps the price you sent. The backtest on that screen prices each real row again with the current settings and shows the difference by outcome (booked or lost). It does not replace the sent price. Sample rows are excluded. The Marco (lead) corridor before rounding is **$9,180 to $12,960** on the $10,800 package (15% below, 20% above). Peak Saturdays in October, November, March, April, and May are the dates the model protects. July through September is the softer Houston stretch.

## CSV

Required columns, in this order:

```text
event_date,inquiry_date,package,quoted_price,outcome,notes
```

- Dates are `YYYY-MM-DD`.
- `package` is a package name, or a price that matches one in Settings.
- `quoted_price` is dollars. `$` and commas are accepted.
- `outcome` is `booked`, `lost`, or `pending`.

Optional columns:

```text
market,couple,tier,travel_days,inquiries,booked_dates,target_capacity,booked_on_date,client_budget,charge_standard,manual_price,model_quote
```

`charge_standard` is `yes` or `no`. `model_quote` is the demand-model price before a standard-rate hold. Export writes these so a re-import keeps the backtest. The History screen can download a template. Sample rows are left out of the export unless you check the box.

Quotes and settings live in `localStorage` in this browser. Clearing site data clears the desk.

## Later integrations

Not built. Listed here so the desk stays a private Houston tool until you choose otherwise:

- VSCO Workspace, for inquiries and booked jobs
- The studio calendar, so date capacity fills itself
- The inquiry form, so a new lead opens a quote
- Proposals, so an approved number can be sent without retyping

A public page where couples see an instant price is a future idea only. This app does not show pricing math to clients.
