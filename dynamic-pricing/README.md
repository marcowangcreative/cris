# Dynamic Pricing Engine

Internal revenue desk for **Marco Wang Photography** (Houston). It recommends what to quote when a wedding inquiry comes in. Marco approves the number. The app does not change prices couples see publicly, and it never reprices a quote that has already been approved.

The goal is revenue per available shooting date: protect peak Saturdays, fill softer dates without cheapening the brand, and refuse a seasonal discount when the couple can pay the standard rate.

The pricing engine in `src/engine/` is a pure module. It does not read the browser, the clock, or the network. The screens are a thin desk on top of it, so the same function can later drive an inquiry form, a proposal, or another studio’s account.

## Run locally

```bash
cd dynamic-pricing
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

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
4. No environment variables are required.

Put a password in front of it before real client names go in. Vercel password protection, or an access proxy, is the right next step. This MVP stores quotes in the browser only.

## How a quote is built

1. Start from the package base. Signature defaults to **$10,800** for 9 hours and 2 photographers. Petite $4,800, Classic $7,200, and Atelier $13,500 are included and editable.
2. Add season (market demand index), day of week, lead time, inquiry pressure, calendar utilization, extra travel days, and a small history nudge.
3. Tilt for the objective: maximize revenue, balanced, or fill dates.
4. Hold the result inside the corridor. The default corridor is **15% below** to **20% above** the base, then round to the nearest **$50**.
5. A peak Saturday (demand index 120 or higher: Houston’s March, April, May, October, November) is not quoted below the package base, unless the objective is fill dates, which may soften it to 97% of base.
6. **Charge standard / no discount**, a **client budget at or above the base**, or a **manual price** then refuses to go under the package base. A low-season index does not discount a couple who can pay. Premiums above the base can stay. A manual price below the base is raised to the base.
7. If the demand model hits the corridor floor, the next cheaper package is offered only as a **secondary** option. It does not replace a standard-rate hold.

Houston’s illustrative index (100 = baseline): Jan 95, Feb 105, Mar 120, Apr 130, May 125, Jun 105, Jul 65, Aug 60, Sep 85, Oct 135, Nov 130, Dec 105. Aspen, Carmel, and New York ship with their own illustrative curves so seasonality is per market. Every weight lives on the Settings screen.

### Worked examples

Neutral inputs: one qualified inquiry, 3 of 5 dates booked (the 60% utilization neutral point), one local day, balanced objective.

| Inquiry | Model | What you send |
| --- | --- | --- |
| Saturday, October 16, 2027, inquired November 12, 2026, Signature | $12,420 before rounding, **$12,400** after | The notes’ sketch was +10% October and +5% Saturday. |
| Wednesday, August 4, 2027, inquired February 4, 2027, Signature | **$9,350** | The soft index is allowed to discount. |
| That same August date, with Charge standard on, or a budget of $10,800 or more | Model still $9,350 | **$10,800**. The desk flags “budget supports standard rate, discount not needed” when the budget covers the base, and records **$1,450** kept versus the model. |

History sums that gap for real rows (sample rows are excluded) so a later backtest can show what the holds earned. Booked versus lost is a column you set yourself. The price on a row does not change when you change the outcome.

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
market,couple,travel_days,inquiries,booked_dates,target_capacity,client_budget,charge_standard,manual_price,model_quote
```

`charge_standard` is `yes` or `no`. `model_quote` is the demand-model price before a standard-rate hold. Export writes these so a re-import keeps the backtest. The History screen can download a template. Sample rows are left out of the export unless you check the box.

Quotes and settings live in `localStorage` in this browser. Clearing site data clears the desk.

## Suggested next steps

- Password protection before any real client name is entered.
- Connect the booking calendar, CRM, and VSCO Workspace so utilization and inquiry pressure fill themselves.
- Backtest against real bookings: import past quotes and compare `quoted_price` with `model_quote` by outcome, then retune the weights.
- Keep this off the public website. Couples should not see the price move between visits.
- A separate portrait model (golden hour, weekend sessions) once the wedding desk matches real closes.
