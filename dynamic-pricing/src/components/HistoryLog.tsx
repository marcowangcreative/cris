import { useMemo, useState } from "react";
import { csvTemplate, formatLongDate, formatMoney, parseCsv, toCsv, type CsvBooking, type Outcome, type PricingConfig } from "../engine";
import type { BookingRecord } from "../records";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toExport(records: BookingRecord[], config: PricingConfig): CsvBooking[] {
  return records.map((record) => ({
    eventDate: record.eventDate,
    inquiryDate: record.inquiryDate,
    packageName: record.packageName,
    quotedPrice: record.quotedPrice,
    outcome: record.outcome,
    notes: record.notes,
    market: config.markets.find((item) => item.id === record.marketId)?.name ?? record.marketId,
    tier: record.tierName,
    bookedOnDate: record.bookedOnDate,
    couple: record.couple,
    travelDaysBlocked: record.travelDaysBlocked,
    qualifiedInquiries: record.qualifiedInquiries,
    bookedDates: record.bookedDates,
    targetCapacity: record.targetCapacity,
    clientBudget: record.clientBudget ?? undefined,
    chargeStandard: record.chargeStandard,
    manualPrice: record.manualPrice ?? undefined,
    modelQuote: record.modelQuote,
  }));
}

function fromCsv(rows: CsvBooking[], config: PricingConfig): BookingRecord[] {
  return rows.map((row) => {
    const tier =
      config.tiers.find((item) => item.name.toLowerCase() === (row.tier ?? "").toLowerCase()) ??
      config.tiers.find((item) => item.id.toLowerCase() === (row.tier ?? "").toLowerCase()) ??
      config.tiers.find((item) => item.id === config.defaultTierId) ??
      config.tiers[0];
    const market =
      config.markets.find((item) => item.name.toLowerCase() === (row.market ?? "").toLowerCase()) ??
      config.markets.find((item) => item.id.toLowerCase() === (row.market ?? "").toLowerCase()) ??
      config.markets.find((item) => item.id === config.homeMarketId) ??
      config.markets[0];
    const byName = tier.packages.find((item) => item.name.toLowerCase() === row.packageName.toLowerCase());
    const numeric = Number(row.packageName.replace(/[$,\s]/g, ""));
    const byPrice = tier.packages.find((item) => item.price === numeric);
    const selected = byName ?? byPrice;
    const modelQuote = row.modelQuote ?? row.quotedPrice;
    return {
      id: crypto.randomUUID(),
      couple: row.couple ?? "",
      eventDate: row.eventDate,
      inquiryDate: row.inquiryDate,
      tierId: tier.id,
      tierName: tier.name,
      marketId: market.id,
      packageId: selected?.id ?? "custom",
      packageName: selected?.name ?? row.packageName,
      packagePrice: selected?.price ?? row.quotedPrice,
      quotedPrice: row.quotedPrice,
      outcome: row.outcome,
      notes: row.notes,
      travelDaysBlocked: row.travelDaysBlocked ?? market.typicalTravelDays,
      qualifiedInquiries: row.qualifiedInquiries ?? 1,
      bookedDates: row.bookedDates ?? 0,
      targetCapacity: row.targetCapacity ?? tier.monthlyCapacity,
      bookedOnDate: row.bookedOnDate ?? 0,
      sample: false,
      approvedAt: new Date().toISOString(),
      modelQuote,
      chargeStandard: row.chargeStandard ?? false,
      clientBudget: row.clientBudget ?? null,
      manualPrice: row.manualPrice ?? null,
      discountAvoided: Math.max(0, Math.round(row.quotedPrice - modelQuote)),
      snapshot: {
        suggestedQuote: row.quotedPrice,
        minimumAcceptable: row.quotedPrice,
        unroundedQuote: row.quotedPrice,
        adjustmentAfterCorridor: 0,
        confidenceScore: 0,
        confidenceLevel: "low",
        confidenceSummary: "Imported from a spreadsheet. This price is locked and was not calculated again.",
        explanations: [
          {
            id: "imported",
            label: "Imported",
            percent: 0,
            explanation: "Imported from a spreadsheet. This price is locked and was not calculated by the current model.",
          },
        ],
      },
    };
  });
}

function earned(rows: BookingRecord[]): number {
  return rows.reduce((total, row) => total + Math.max(0, row.discountAvoided), 0);
}

export function HistoryLog({
  records,
  config,
  onChange,
}: {
  records: BookingRecord[];
  config: PricingConfig;
  onChange: (records: BookingRecord[]) => void;
}) {
  const [filter, setFilter] = useState<"all" | Outcome>("all");
  const [query, setQuery] = useState("");
  const [includeSamples, setIncludeSamples] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const sampleCount = records.filter((record) => record.sample).length;
  const real = records.filter((record) => !record.sample);
  const realEarned = earned(real);
  const bookedEarned = earned(real.filter((record) => record.outcome === "booked"));
  const sampleEarned = earned(records.filter((record) => record.sample));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (filter !== "all" && record.outcome !== filter) return false;
      if (!needle) return true;
      return [record.couple, record.notes, record.eventDate, record.packageName, record.marketId].join(" ").toLowerCase().includes(needle);
    });
  }, [filter, query, records]);

  function update(id: string, patch: Partial<BookingRecord>) {
    onChange(records.map((record) => (record.id === id ? { ...record, ...patch } : record)));
  }

  function exportCsv() {
    const rows = includeSamples ? records : records.filter((record) => !record.sample);
    download("marco-wang-pricing-history.csv", toCsv(toExport(rows, config)));
  }

  async function importFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setErrors(parsed.errors.map((error) => `Line ${error.line}: ${error.message}`));
    if (parsed.records.length === 0) {
      setMessage(parsed.errors.length ? "Nothing was imported." : "The file had no data rows.");
      return;
    }
    onChange([...fromCsv(parsed.records, config), ...records]);
    setMessage(
      `Imported ${parsed.records.length} ${parsed.records.length === 1 ? "row" : "rows"}${parsed.errors.length ? `. ${parsed.errors.length} skipped.` : "."}`,
    );
  }

  return (
    <section className="history">
      <div className="panel backtest">
        <h2>What standard-rate holds kept</h2>
        {real.length === 0 ? (
          <p>
            No real quotes yet. Sample rows illustrate {formatMoney(sampleEarned)} that a hold would have kept versus the discounted model. They are excluded from the total once your own bookings are here.
          </p>
        ) : (
          <p>
            On your quotes, holding the standard rate kept <strong>{formatMoney(realEarned)}</strong> compared with the discounted model.
            Booked rows account for <strong>{formatMoney(bookedEarned)}</strong>. Sample rows are not included.
          </p>
        )}
      </div>

      {sampleCount > 0 ? (
        <p className="banner">
          {sampleCount} sample {sampleCount === 1 ? "row is" : "rows are"} labeled SAMPLE.{" "}
          {sampleCount === 1 ? "It is invented and never moves a new quote." : "They are invented and never move a new quote."}{" "}
          <button type="button" className="text-button" onClick={() => onChange(records.filter((record) => !record.sample))}>
            Remove sample rows
          </button>
        </p>
      ) : null}

      <div className="toolbar">
        <div className="preset-row" role="group" aria-label="Filter by outcome">
          {(["all", "pending", "booked", "lost"] as const).map((outcome) => (
            <button key={outcome} type="button" className={filter === outcome ? "chip on" : "chip"} onClick={() => setFilter(outcome)}>
              {outcome === "all" ? "All" : outcome[0].toUpperCase() + outcome.slice(1)}
            </button>
          ))}
        </div>
        <label className="field grow">
          <span className="sr-only">Search history</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search couple, date, or notes" />
        </label>
        <label className="check inline">
          <input type="checkbox" checked={includeSamples} onChange={(event) => setIncludeSamples(event.target.checked)} />
          <span>Include sample rows in export</span>
        </label>
        <button type="button" className="ghost dark" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="ghost dark" onClick={() => download("pricing-history-template.csv", csvTemplate())}>
          CSV template
        </button>
        <label className="file-button">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {message ? <p className="saved" role="status">{message}</p> : null}
      {errors.length > 0 ? (
        <ul className="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <p className="hint">
        Required columns: event_date, inquiry_date, package, quoted_price, outcome, notes. Optional: market, couple, tier, travel_days, inquiries, booked_dates, target_capacity, booked_on_date, client_budget, charge_standard, manual_price, model_quote. Outcome is booked, lost, or pending. Dates are YYYY-MM-DD.
      </p>

      {visible.length === 0 ? (
        <p className="empty">No rows match. Approve a quote, or import a CSV of past inquiries.</p>
      ) : (
        <ul className="log">
          {visible.map((record) => {
            const market = config.markets.find((item) => item.id === record.marketId);
            return (
              <li key={record.id} className="log-card">
                <div className="log-top">
                  <div>
                    <h3>{record.couple || "Untitled inquiry"}</h3>
                    <p>
                      {formatLongDate(record.eventDate)} · {record.tierName} · {market?.name ?? record.marketId} · {record.packageName}
                    </p>
                  </div>
                  <p className="log-price">{formatMoney(record.quotedPrice)}</p>
                </div>
                <div className="log-meta">
                  {record.sample ? <span className="pill">Sample</span> : null}
                  {record.chargeStandard ? <span className="pill">Charge standard</span> : null}
                  {record.clientBudget !== null ? <span className="pill">Budget {formatMoney(record.clientBudget)}</span> : null}
                  {record.discountAvoided > 0 ? (
                    <span className="pill kept">Kept {formatMoney(record.discountAvoided)} vs model {formatMoney(record.modelQuote)}</span>
                  ) : (
                    <span className="pill quiet">Model {formatMoney(record.modelQuote)}</span>
                  )}
                </div>
                <div className="log-actions">
                  <label className="field compact">
                    <span>Outcome</span>
                    <select
                      value={record.outcome}
                      onChange={(event) => update(record.id, { outcome: event.target.value as Outcome })}
                    >
                      <option value="pending">Pending</option>
                      <option value="booked">Booked</option>
                      <option value="lost">Lost</option>
                    </select>
                  </label>
                  <p className="hint">Inquiry {record.inquiryDate}. Changing the outcome does not change the locked price.</p>
                </div>
                {record.notes ? <p className="notes">{record.notes}</p> : null}
                <details>
                  <summary>Why this price was recorded</summary>
                  <p>{record.snapshot.confidenceSummary}</p>
                  <ul>
                    {record.snapshot.explanations.map((item) => (
                      <li key={item.id}>
                        <strong>{item.label}. </strong>
                        {item.explanation}
                      </li>
                    ))}
                  </ul>
                </details>
                {pendingDelete === record.id ? (
                  <p className="confirm-row">
                    Remove this row from the log?
                    <button type="button" className="text-button" onClick={() => onChange(records.filter((item) => item.id !== record.id))}>
                      Remove
                    </button>
                    <button type="button" className="text-button" onClick={() => setPendingDelete(null)}>
                      Keep
                    </button>
                  </p>
                ) : (
                  <button type="button" className="text-button" onClick={() => setPendingDelete(record.id)}>
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
