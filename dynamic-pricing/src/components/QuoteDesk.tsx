import { useEffect, useMemo, useState } from "react";
import {
  earnedAboveModel,
  formatLongDate,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  quotePrice,
  todayISO,
  type PricingConfig,
  type Quote,
} from "../engine";
import type { BookingRecord } from "../records";

interface QuoteForm {
  couple: string;
  eventDate: string;
  inquiryDate: string;
  marketId: string;
  packageId: string;
  qualifiedInquiries: number;
  bookedDates: number;
  targetCapacity: number;
  travelDaysBlocked: number;
  notes: string;
  clientBudget: string;
  chargeStandard: boolean;
  manualPrice: string;
}

type Preset = "october" | "budget" | "custom";

function octoberForm(): QuoteForm {
  return {
    couple: "",
    eventDate: "2027-10-16",
    inquiryDate: "2026-11-12",
    marketId: "houston",
    packageId: "signature",
    qualifiedInquiries: 1,
    bookedDates: 3,
    targetCapacity: 5,
    travelDaysBlocked: 1,
    notes: "",
    clientBudget: "",
    chargeStandard: false,
    manualPrice: "",
  };
}

function budgetForm(): QuoteForm {
  return {
    couple: "",
    eventDate: "2027-08-04",
    inquiryDate: "2027-02-04",
    marketId: "houston",
    packageId: "signature",
    qualifiedInquiries: 1,
    bookedDates: 3,
    targetCapacity: 5,
    travelDaysBlocked: 1,
    notes: "",
    clientBudget: "15000",
    chargeStandard: true,
    manualPrice: "",
  };
}

function blankForm(config: PricingConfig): QuoteForm {
  const market = config.markets.find((item) => item.id === config.homeMarketId) ?? config.markets[0];
  return {
    couple: "",
    eventDate: "",
    inquiryDate: todayISO(),
    marketId: market.id,
    packageId: config.defaultPackageId,
    qualifiedInquiries: 1,
    bookedDates: 0,
    targetCapacity: config.defaultTargetCapacity,
    travelDaysBlocked: market.typicalTravelDays,
    notes: "",
    clientBudget: "",
    chargeStandard: false,
    manualPrice: "",
  };
}

function moneyOrNull(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function whole(value: string, fallback: number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : fallback;
}

export function QuoteDesk({
  config,
  history,
  onApprove,
}: {
  config: PricingConfig;
  history: BookingRecord[];
  onApprove: (record: BookingRecord) => void;
}) {
  const [form, setForm] = useState<QuoteForm>(() => octoberForm());
  const [preset, setPreset] = useState<Preset>("october");
  const [saved, setSaved] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setForm((current) => {
      const marketId = config.markets.some((item) => item.id === current.marketId) ? current.marketId : config.homeMarketId;
      const packageId = config.packages.some((item) => item.id === current.packageId)
        ? current.packageId
        : config.defaultPackageId;
      if (marketId === current.marketId && packageId === current.packageId) return current;
      return { ...current, marketId, packageId };
    });
  }, [config, form.marketId, form.packageId]);

  const budget = moneyOrNull(form.clientBudget);
  const manual = moneyOrNull(form.manualPrice);

  const result = useMemo(() => {
    if (!form.eventDate || !form.inquiryDate) return null;
    if (Number.isNaN(budget)) return { ok: false as const, error: "Client budget has to be a dollar amount, or left blank." };
    if (Number.isNaN(manual)) return { ok: false as const, error: "Manual price has to be a dollar amount, or left blank." };
    return quotePrice(
      {
        eventDate: form.eventDate,
        inquiryDate: form.inquiryDate,
        marketId: form.marketId,
        packageId: form.packageId,
        qualifiedInquiries: form.qualifiedInquiries,
        bookedDates: form.bookedDates,
        targetCapacity: form.targetCapacity,
        travelDaysBlocked: Math.max(1, form.travelDaysBlocked),
        clientBudget: budget,
        chargeStandard: form.chargeStandard,
        manualPrice: manual,
        history: history.map((record) => ({
          marketId: record.marketId,
          outcome: record.outcome,
          sample: record.sample,
        })),
      },
      config,
    );
  }, [budget, config, form, history, manual]);

  function edit(patch: Partial<QuoteForm>) {
    setPreset("custom");
    setSaved(null);
    setCopied(false);
    setForm((current) => ({ ...current, ...patch }));
  }

  function chooseMarket(marketId: string) {
    setPreset("custom");
    setSaved(null);
    setForm((current) => {
      const previous = config.markets.find((item) => item.id === current.marketId);
      const next = config.markets.find((item) => item.id === marketId);
      const followDefault = previous !== undefined && current.travelDaysBlocked === previous.typicalTravelDays;
      return {
        ...current,
        marketId,
        travelDaysBlocked: followDefault && next ? next.typicalTravelDays : current.travelDaysBlocked,
      };
    });
  }

  function applyPreset(next: Preset) {
    setSaved(null);
    setCopied(false);
    setPreset(next);
    if (next === "october") setForm(octoberForm());
    if (next === "budget") setForm(budgetForm());
    if (next === "custom") setForm(blankForm(config));
  }

  function approve(quote: Quote) {
    const quotedPrice = quote.suggestedQuote;
    const record: BookingRecord = {
      id: crypto.randomUUID(),
      couple: form.couple.trim(),
      eventDate: form.eventDate,
      inquiryDate: form.inquiryDate,
      marketId: quote.marketId,
      packageId: quote.packageId,
      packageName: quote.packageName,
      packagePrice: quote.basePrice,
      quotedPrice,
      outcome: "pending",
      notes: form.notes.trim(),
      travelDaysBlocked: quote.travelDaysBlocked,
      qualifiedInquiries: form.qualifiedInquiries,
      bookedDates: form.bookedDates,
      targetCapacity: form.targetCapacity,
      sample: false,
      approvedAt: new Date().toISOString(),
      modelQuote: quote.modelQuote,
      chargeStandard: quote.chargeStandard,
      clientBudget: quote.clientBudget,
      manualPrice: quote.manualPrice,
      discountAvoided: earnedAboveModel(quotedPrice, quote.modelQuote),
      snapshot: {
        suggestedQuote: quote.suggestedQuote,
        minimumAcceptable: quote.minimumAcceptable,
        unroundedQuote: quote.unroundedQuote,
        adjustmentAfterCorridor: quote.adjustmentAfterCorridor,
        confidenceScore: quote.confidence.score,
        confidenceLevel: quote.confidence.level,
        confidenceSummary: quote.confidence.summary,
        explanations: quote.adjustments,
      },
    };
    onApprove(record);
    const who = record.couple || "Untitled inquiry";
    setSaved(`Recorded ${who} at ${formatMoney(quotedPrice)} as pending. The price is locked.`);
  }

  async function copySummary(quote: Quote) {
    const lines = [
      "Marco Wang Photography — internal quote",
      form.couple ? `Couple: ${form.couple}` : "Couple: not named",
      `Event: ${formatLongDate(form.eventDate)}`,
      `Market: ${quote.marketName}`,
      `Package: ${quote.packageName} (${formatMoney(quote.basePrice)})`,
      `Model quote: ${formatMoney(quote.modelQuote)}`,
      `Suggested: ${formatMoney(quote.suggestedQuote)}`,
      `Minimum acceptable: ${formatMoney(quote.minimumAcceptable)}`,
      quote.chargeStandard ? "Charge standard: yes" : "Charge standard: no",
      quote.clientBudget !== null ? `Client budget: ${formatMoney(quote.clientBudget)}` : "Client budget: not stated",
      quote.standardRateNote ?? "",
      quote.discountAvoided > 0 ? `Kept versus the model: ${formatMoney(quote.discountAvoided)}` : "",
      "",
      ...quote.adjustments.map((item) => `${item.label} (${formatPercent(item.percent)}): ${item.explanation}`),
      "",
      "Internal only. This does not change a public price.",
    ].filter((line) => line !== "");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const quote = result && result.ok ? result.quote : null;
  const utilization = form.targetCapacity > 0 ? Math.round((form.bookedDates / form.targetCapacity) * 100) : null;

  return (
    <div className="desk">
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (quote) approve(quote);
        }}
      >
        <div className="preset-row">
          <button type="button" className={preset === "october" ? "chip on" : "chip"} onClick={() => applyPreset("october")}>
            Notes example
          </button>
          <button type="button" className={preset === "budget" ? "chip on" : "chip"} onClick={() => applyPreset("budget")}>
            Low-season, can pay
          </button>
          <button type="button" className="chip" onClick={() => applyPreset("custom")}>
            New inquiry
          </button>
        </div>
        {preset === "october" ? (
          <p className="banner">
            Illustrative inquiry from your notes: Saturday, October 16, 2027, Houston, Signature. The sketch was $12,420 before $50 rounding. Not a live couple.
          </p>
        ) : null}
        {preset === "budget" ? (
          <p className="banner">
            Demo only. An August Wednesday whose budget covers the Signature rate. The demand index wants a discount. Charge standard keeps the quote at the base or higher.
          </p>
        ) : null}

        <label className="field">
          <span>Couple</span>
          <input value={form.couple} onChange={(event) => edit({ couple: event.target.value })} placeholder="Names, for your log only" autoComplete="off" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Event date</span>
            <input type="date" required value={form.eventDate} onChange={(event) => edit({ eventDate: event.target.value })} />
            {quote ? <small>{quote.dayName} · {quote.monthName} · index {quote.demandIndex}</small> : <small>The wedding date drives month and weekday.</small>}
          </label>
          <label className="field">
            <span>Inquiry date</span>
            <input type="date" required value={form.inquiryDate} onChange={(event) => edit({ inquiryDate: event.target.value })} />
            {quote ? <small>{quote.daysUntilEvent} days from inquiry to wedding.</small> : <small>Used for booking lead time.</small>}
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Market</span>
            <select value={form.marketId} onChange={(event) => chooseMarket(event.target.value)}>
              {config.markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                  {market.region ? `, ${market.region}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Package</span>
            <select value={form.packageId} onChange={(event) => edit({ packageId: event.target.value })}>
              {config.packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {formatMoney(item.price)}
                  {item.detail ? ` · ${item.detail}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row three">
          <label className="field">
            <span>Qualified inquiries</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.qualifiedInquiries}
              onChange={(event) => edit({ qualifiedInquiries: whole(event.target.value, 0) })}
              onWheel={(event) => event.currentTarget.blur()}
            />
            <small>Including this couple.</small>
          </label>
          <label className="field">
            <span>Booked dates</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.bookedDates}
              onChange={(event) => edit({ bookedDates: whole(event.target.value, 0) })}
              onWheel={(event) => event.currentTarget.blur()}
            />
            <small>Already booked that month.</small>
          </label>
          <label className="field">
            <span>Target capacity</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.targetCapacity}
              onChange={(event) => edit({ targetCapacity: whole(event.target.value, 0) })}
              onWheel={(event) => event.currentTarget.blur()}
            />
            <small>{utilization === null ? "Set a monthly target." : `${utilization}% of the monthly target.`}</small>
          </label>
        </div>
        <label className="field">
          <span>Days blocked, including travel</span>
          <input
            type="number"
            min={1}
            step={1}
            value={form.travelDaysBlocked}
            onChange={(event) => edit({ travelDaysBlocked: Math.max(1, whole(event.target.value, 1)) })}
            onWheel={(event) => event.currentTarget.blur()}
          />
          <small>1 is a local shoot day. Extra days are opportunity cost, not full extra weddings.</small>
        </label>

        <fieldset className="override">
          <legend>Standard rate</legend>
          <p className="hint">
            A quiet month should not discount a couple who can pay the package. These controls keep the quote at the base or higher. Premiums can still apply.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={form.chargeStandard}
              onChange={(event) => edit({ chargeStandard: event.target.checked })}
            />
            <span>
              <strong>Charge standard / no discount</strong>
              <small>Ignore the seasonal discount and any other markdown. The quote stays at the package base or higher.</small>
            </span>
          </label>
          <div className="field-row">
            <label className="field">
              <span>Client budget</span>
              <input
                inputMode="decimal"
                value={form.clientBudget}
                onChange={(event) => edit({ clientBudget: event.target.value })}
                placeholder="Optional"
                autoComplete="off"
              />
              <small>If this is at or above the package base, the discount is not needed.</small>
            </label>
            <label className="field">
              <span>Manual price</span>
              <input
                inputMode="decimal"
                value={form.manualPrice}
                onChange={(event) => edit({ manualPrice: event.target.value })}
                placeholder="Optional"
                autoComplete="off"
              />
              <small>Replaces the suggestion. A number below the base is raised to the base.</small>
            </label>
          </div>
        </fieldset>

        <label className="field">
          <span>Notes</span>
          <textarea value={form.notes} onChange={(event) => edit({ notes: event.target.value })} rows={3} />
        </label>
      </form>

      <div className="result-column">
        {quote ? (
          <>
            <article className="quote-card">
              <p className="kicker">Suggested quote</p>
              <p className="figure">{formatMoney(quote.suggestedQuote)}</p>
              <p className="versus">
                {Math.abs(quote.suggestedQuote - quote.basePrice) < 1
                  ? `At the ${formatMoney(quote.basePrice)} ${quote.packageName} base`
                  : `${formatPercent(quote.suggestedQuote / quote.basePrice - 1)} versus the ${formatMoney(quote.basePrice)} ${quote.packageName} base`}
              </p>
              {quote.modelQuote !== quote.suggestedQuote ? (
                <p className="model-line">
                  Demand model alone: {formatMoney(quote.modelQuote)}. This hold keeps {formatMoney(quote.discountAvoided)}.
                </p>
              ) : (
                <p className="model-line">
                  {quote.unroundedQuote === quote.suggestedQuote
                    ? "Already on the rounding increment."
                    : `Worked out to ${formatMoney(quote.unroundedQuote)} before the nearest ${formatMoney(config.roundTo)}.`}
                </p>
              )}
              {quote.standardRateNote ? (
                <p className="flag" role="status">
                  Budget supports standard rate, discount not needed.
                </p>
              ) : null}
              {quote.chargeStandard && !quote.standardRateNote ? (
                <p className="flag" role="status">
                  Charge standard. The demand index is not discounting this quote.
                </p>
              ) : null}
              <dl className="stat-row">
                <div>
                  <dt>Minimum</dt>
                  <dd>{formatMoney(quote.minimumAcceptable)}</dd>
                </div>
                <div>
                  <dt>Floor</dt>
                  <dd>{formatMoney(quote.floor)}</dd>
                </div>
                <div>
                  <dt>Ceiling</dt>
                  <dd>{formatMoney(quote.ceiling)}</dd>
                </div>
              </dl>
              <p className={`confidence ${quote.confidence.level}`}>
                <strong>{quote.confidence.level} confidence</strong>
                <span> {quote.confidence.score}/100</span>
              </p>
              <p className="confidence-copy">{quote.confidence.summary}</p>
              <p className="per-day">
                {formatMoney(quote.revenuePerBlockedDay)} per blocked day
                {quote.travelDaysBlocked > 1 ? ` across ${quote.travelDaysBlocked} days` : ""}. A one-day {quote.packageName} base is {formatMoney(quote.basePrice)}.
              </p>
              <button type="button" className="approve" onClick={() => approve(quote)}>
                Approve and record as pending
              </button>
              <button type="button" className="ghost" onClick={() => copySummary(quote)}>
                {copied ? "Copied" : "Copy summary"}
              </button>
              <p className="lock">Approving locks this price. Changing settings later will not reprice it.</p>
              {saved ? <p className="saved" role="status">{saved}</p> : null}
            </article>
            {quote.smallerPackage ? (
              <aside className="secondary">
                <p className="kicker">Secondary package</p>
                <p>
                  <strong>
                    {quote.smallerPackage.packageName} · model {formatMoney(quote.smallerPackage.suggestedQuote)}
                  </strong>
                </p>
                <p>{quote.smallerPackage.explanation}</p>
              </aside>
            ) : null}
            <section className="rationale" aria-label="Pricing rationale">
              <h2>Why this number</h2>
              <p className="floor-note">{quote.floorExplanation}</p>
              <ul>
                {quote.adjustments.map((item) => (
                  <li key={item.id}>
                    <div className="reason-top">
                      <strong>{item.label}</strong>
                      <span className={item.percent > 0.0005 ? "up" : item.percent < -0.0005 ? "down" : "flat"}>
                        {formatPercent(item.percent)}
                        <small>{formatSignedMoney(Math.round(quote.basePrice * item.percent))}</small>
                      </span>
                    </div>
                    <p>{item.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <article className="quote-card quiet">
            <p className="kicker">Suggested quote</p>
            <p className="figure">—</p>
            <p className="versus">{result && !result.ok ? result.error : "Add the wedding date and the inquiry date."}</p>
          </article>
        )}
      </div>
    </div>
  );
}
