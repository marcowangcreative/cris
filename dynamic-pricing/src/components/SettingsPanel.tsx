import { useState } from "react";
import { createDefaultConfig, formatMoney, type MarketDef, type OfferingTier, type PackageDef, type PricingConfig, type PricingWeights } from "../engine";
import { uniqueId } from "../ids";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const OBJECTIVES = [
  { id: "maximize_revenue" as const, title: "Maximize revenue", copy: "Protect the rate, even if some dates stay open." },
  { id: "balanced" as const, title: "Balanced", copy: "Trade a little volume against a little rate. The starting point." },
  { id: "fill_dates" as const, title: "Fill dates", copy: "Lean toward booking the date when the calendar is soft." },
];

export function SettingsPanel({ config, onChange }: { config: PricingConfig; onChange: (config: PricingConfig) => void }) {
  const [marketId, setMarketId] = useState(config.homeMarketId);
  const [tierId, setTierId] = useState(config.defaultTierId);
  const [confirmReset, setConfirmReset] = useState(false);
  const market = config.markets.find((item) => item.id === marketId) ?? config.markets[0];
  const tier = config.tiers.find((item) => item.id === tierId) ?? config.tiers[0];
  const basePackage = tier.packages.find((item) => item.id === tier.defaultPackageId) ?? tier.packages[0];
  const low = basePackage.price * (1 - tier.maxReduction);
  const high = basePackage.price * (1 + tier.maxPremium);

  function patch(next: Partial<PricingConfig>) {
    onChange({ ...config, ...next });
  }

  function patchTier(next: Partial<OfferingTier>) {
    patch({ tiers: config.tiers.map((item) => (item.id === tier.id ? { ...item, ...next } : item)) });
  }

  function patchWeight<K extends keyof PricingWeights>(key: K, value: PricingWeights[K]) {
    onChange({ ...config, weights: { ...config.weights, [key]: value } });
  }

  function updatePackage(id: string, next: Partial<PackageDef>) {
    patchTier({ packages: tier.packages.map((item) => (item.id === id ? { ...item, ...next } : item)) });
  }

  function updateMarket(id: string, next: Partial<MarketDef>) {
    patch({ markets: config.markets.map((item) => (item.id === id ? { ...item, ...next } : item)) });
  }

  return (
    <div className="settings">
      <p className="hint settings-intro">
        These are testing assumptions. They apply to the next quote only. A price you already approved stays where you recorded it.
      </p>

      <section className="panel">
        <h2>Objective</h2>
        <fieldset className="objectives">
          <legend>Primary objective</legend>
          {OBJECTIVES.map((option) => (
            <label key={option.id} className={config.objective === option.id ? "objective on" : "objective"}>
              <input
                type="radio"
                name="objective"
                value={option.id}
                checked={config.objective === option.id}
                onChange={() => patch({ objective: option.id })}
              />
              <span>
                <strong>{option.title}</strong>
                <small>{option.copy}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="field narrow">
          <span>Round to</span>
          <input
            type="number"
            min={1}
            step={1}
            value={config.roundTo}
            onChange={(event) => {
              if (Number.isFinite(event.target.valueAsNumber)) patch({ roundTo: Math.max(1, Math.round(event.target.valueAsNumber)) });
            }}
            onWheel={(event) => event.currentTarget.blur()}
          />
          <small>Dollars. $50 is the default for every tier.</small>
        </label>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Offering tiers</h2>
          <button
            type="button"
            className="ghost dark"
            onClick={() => {
              const id = uniqueId("tier", config.tiers.map((item) => item.id));
              const packageId = `${id}-signature`;
              const created: OfferingTier = {
                id,
                name: "New tier",
                note: "PLACEHOLDER — edit this tier before quoting.",
                placeholder: true,
                maxReduction: 0.15,
                maxPremium: 0.15,
                dateCapacity: 2,
                monthlyCapacity: 8,
                defaultPackageId: packageId,
                packages: [{ id: packageId, name: "Signature", price: 5000, detail: "PLACEHOLDER", hours: 8, photographers: 1 }],
              };
              patch({ tiers: [...config.tiers, created] });
              setTierId(id);
            }}
          >
            Add tier
          </button>
        </div>
        <div className="preset-row">
          {config.tiers.map((item) => (
            <button key={item.id} type="button" className={item.id === tier.id ? "chip on" : "chip"} onClick={() => setTierId(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        {tier.placeholder ? <p className="banner">Placeholder tier. The prices and capacities below are starting numbers, not a real rate card.</p> : null}
        <div className="field-row">
          <label className="field">
            <span>Name</span>
            <input value={tier.name} onChange={(event) => patchTier({ name: event.target.value })} />
          </label>
          <label className="check">
            <input
              type="radio"
              name="default-tier"
              checked={config.defaultTierId === tier.id}
              onChange={() => patch({ defaultTierId: tier.id })}
            />
            <span>Default tier for a new inquiry</span>
          </label>
        </div>
        <label className="field">
          <span>Note</span>
          <textarea rows={2} value={tier.note} onChange={(event) => patchTier({ note: event.target.value })} />
        </label>
        <div className="field-row three">
          <PercentField label="Maximum below the base" value={tier.maxReduction} onChange={(maxReduction) => patchTier({ maxReduction })} />
          <PercentField label="Maximum above the base" value={tier.maxPremium} onChange={(maxPremium) => patchTier({ maxPremium })} />
          <p className="corridor">
            {basePackage.name} corridor before rounding: {formatMoney(low)} to {formatMoney(high)}.
          </p>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Weddings on one date</span>
            <input
              type="number"
              min={1}
              step={1}
              value={tier.dateCapacity}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber)) patchTier({ dateCapacity: Math.max(1, Math.round(event.target.valueAsNumber)) });
              }}
              onWheel={(event) => event.currentTarget.blur()}
            />
            <small>Marco can shoot one. Associates can cover several on the same day.</small>
          </label>
          <label className="field">
            <span>Monthly target</span>
            <input
              type="number"
              min={1}
              step={1}
              value={tier.monthlyCapacity}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber)) patchTier({ monthlyCapacity: Math.max(1, Math.round(event.target.valueAsNumber)) });
              }}
              onWheel={(event) => event.currentTarget.blur()}
            />
            <small>Used when a blank inquiry starts on this tier. Fill is booked divided by this number.</small>
          </label>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={config.tiers.length === 1}
          onClick={() => {
            const tiers = config.tiers.filter((item) => item.id !== tier.id);
            patch({ tiers, defaultTierId: config.defaultTierId === tier.id ? tiers[0].id : config.defaultTierId });
            setTierId(tiers[0].id);
          }}
        >
          Remove tier
        </button>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>{tier.name} packages</h2>
          <button
            type="button"
            className="ghost dark"
            onClick={() => {
              const id = uniqueId("package", tier.packages.map((item) => item.id));
              patchTier({ packages: [...tier.packages, { id, name: "New package", price: 6000, detail: "", hours: 6, photographers: 1 }] });
            }}
          >
            Add package
          </button>
        </div>
        <ul className="edit-list">
          {tier.packages.map((item) => (
            <li key={item.id}>
              <label className="field">
                <span>Name</span>
                <input value={item.name} onChange={(event) => updatePackage(item.id, { name: event.target.value })} />
              </label>
              <label className="field">
                <span>Price</span>
                <input
                  type="number"
                  min={1}
                  step={50}
                  value={item.price}
                  onChange={(event) => {
                    if (Number.isFinite(event.target.valueAsNumber)) updatePackage(item.id, { price: event.target.valueAsNumber });
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </label>
              <label className="field">
                <span>Hours</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  value={item.hours ?? ""}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber;
                    updatePackage(item.id, { hours: Number.isFinite(next) ? Math.max(1, Math.round(next)) : null });
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </label>
              <label className="field">
                <span>Photographers</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={item.photographers ?? ""}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber;
                    updatePackage(item.id, { photographers: Number.isFinite(next) ? Math.max(1, Math.round(next)) : null });
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </label>
              <label className="field">
                <span>Detail</span>
                <input value={item.detail} onChange={(event) => updatePackage(item.id, { detail: event.target.value })} />
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="default-package"
                  checked={tier.defaultPackageId === item.id}
                  onChange={() => patchTier({ defaultPackageId: item.id })}
                />
                <span>Base package</span>
              </label>
              <button
                type="button"
                className="text-button"
                disabled={tier.packages.length === 1}
                onClick={() => {
                  const packages = tier.packages.filter((pkg) => pkg.id !== item.id);
                  patchTier({
                    packages,
                    defaultPackageId: tier.defaultPackageId === item.id ? packages[0].id : tier.defaultPackageId,
                  });
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Markets</h2>
          <button
            type="button"
            className="ghost dark"
            onClick={() => {
              const id = uniqueId("market", config.markets.map((item) => item.id));
              const seed = config.markets[0];
              const created: MarketDef = {
                id,
                name: "New market",
                region: "",
                demandIndex: [...seed.demandIndex],
                typicalTravelDays: 2,
                note: "Illustrative. Replace these index values with your own.",
              };
              patch({ markets: [...config.markets, created] });
              setMarketId(id);
            }}
          >
            Add market
          </button>
        </div>
        <div className="preset-row">
          {config.markets.map((item) => (
            <button key={item.id} type="button" className={item.id === market.id ? "chip on" : "chip"} onClick={() => setMarketId(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        <div className="field-row three">
          <label className="field">
            <span>Name</span>
            <input value={market.name} onChange={(event) => updateMarket(market.id, { name: event.target.value })} />
          </label>
          <label className="field">
            <span>Region</span>
            <input value={market.region} onChange={(event) => updateMarket(market.id, { region: event.target.value })} />
          </label>
          <label className="field">
            <span>Typical days blocked</span>
            <input
              type="number"
              min={1}
              max={14}
              step={1}
              value={market.typicalTravelDays}
              onChange={(event) => {
                if (Number.isFinite(event.target.valueAsNumber)) {
                  updateMarket(market.id, { typicalTravelDays: Math.max(1, Math.round(event.target.valueAsNumber)) });
                }
              }}
              onWheel={(event) => event.currentTarget.blur()}
            />
          </label>
        </div>
        <label className="check">
          <input type="radio" name="home-market" checked={config.homeMarketId === market.id} onChange={() => patch({ homeMarketId: market.id })} />
          <span>Home market. Local weddings start at one blocked day.</span>
        </label>
        <div className="months">
          {market.demandIndex.map((index, month) => (
            <label key={MONTHS[month]} className="field">
              <span>{MONTHS[month]}</span>
              <input
                type="number"
                min={0}
                max={300}
                step={1}
                aria-label={`${MONTHS[month]} demand index`}
                value={index}
                onChange={(event) => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return;
                  const demandIndex = market.demandIndex.map((value, cursor) => (cursor === month ? event.target.valueAsNumber : value));
                  updateMarket(market.id, { demandIndex });
                }}
                onWheel={(event) => event.currentTarget.blur()}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span>Note</span>
          <textarea value={market.note} rows={3} onChange={(event) => updateMarket(market.id, { note: event.target.value })} />
        </label>
        <button
          type="button"
          className="text-button"
          disabled={config.markets.length === 1 || config.homeMarketId === market.id}
          onClick={() => {
            const markets = config.markets.filter((item) => item.id !== market.id);
            patch({ markets });
            setMarketId(markets[0].id);
          }}
        >
          {config.homeMarketId === market.id ? "Choose another home market before removing this one" : "Remove market"}
        </button>
      </section>

      <section className="panel">
        <h2>Adjustment weights</h2>
        <p className="hint">Percents. 5 means five percent of the package base. A soft demand index uses the seasonality weight, and Charge standard can refuse to apply it.</p>
        <div className="weight-grid">
          <PercentField
            label="Seasonality per 35 index points"
            value={config.weights.seasonalityPer35Points}
            help="10 means an October index of 135 adds about 10%."
            onChange={(value) => patchWeight("seasonalityPer35Points", value)}
          />
          <PercentField label="Saturday" value={config.weights.saturday} onChange={(value) => patchWeight("saturday", value)} />
          <PercentField label="Friday" value={config.weights.friday} onChange={(value) => patchWeight("friday", value)} />
          <PercentField label="Sunday" value={config.weights.sunday} onChange={(value) => patchWeight("sunday", value)} />
          <PercentField label="Thursday" value={config.weights.thursday} onChange={(value) => patchWeight("thursday", value)} />
          <PercentField label="Monday–Wednesday" value={config.weights.weekday} onChange={(value) => patchWeight("weekday", value)} />
          <PercentField label="Each extra inquiry" value={config.weights.inquiryStep} onChange={(value) => patchWeight("inquiryStep", value)} />
          <PercentField label="Inquiry cap" value={config.weights.inquiryCap} onChange={(value) => patchWeight("inquiryCap", value)} />
          <PercentField label="No inquiries yet" value={config.weights.inquiryNone} onChange={(value) => patchWeight("inquiryNone", value)} />
          <PercentField label="Neutral utilization" value={config.weights.utilizationNeutral} onChange={(value) => patchWeight("utilizationNeutral", value)} />
          <PercentField label="Fully booked vs neutral" value={config.weights.utilizationFull} onChange={(value) => patchWeight("utilizationFull", value)} />
          <PercentField label="Utilization cap" value={config.weights.utilizationCap} onChange={(value) => patchWeight("utilizationCap", value)} />
          <PercentField label="Each extra travel day" value={config.weights.travelDay} onChange={(value) => patchWeight("travelDay", value)} />
          <PercentField label="History nudge" value={config.weights.historyNudge} onChange={(value) => patchWeight("historyNudge", value)} />
          <PercentField label="High win rate" value={config.weights.historyHighWinRate} onChange={(value) => patchWeight("historyHighWinRate", value)} />
          <PercentField label="Low win rate" value={config.weights.historyLowWinRate} onChange={(value) => patchWeight("historyLowWinRate", value)} />
        </div>
        <h3>Lead time</h3>
        <ul className="bands">
          {config.weights.leadBands.map((band, index) => (
            <li key={`${band.label}-${index}`}>
              <label className="field">
                <span>Label</span>
                <input
                  value={band.label}
                  onChange={(event) => {
                    const leadBands = config.weights.leadBands.map((item, cursor) =>
                      cursor === index ? { ...item, label: event.target.value } : item,
                    );
                    patchWeight("leadBands", leadBands);
                  }}
                />
              </label>
              <label className="field">
                <span>Up to days</span>
                <input
                  type="number"
                  min={1}
                  value={band.maxDays}
                  onChange={(event) => {
                    if (!Number.isFinite(event.target.valueAsNumber)) return;
                    const leadBands = config.weights.leadBands.map((item, cursor) =>
                      cursor === index ? { ...item, maxDays: event.target.valueAsNumber } : item,
                    );
                    patchWeight("leadBands", leadBands);
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </label>
              <PercentField
                label="Adjustment"
                value={band.adjustment}
                onChange={(adjustment) => {
                  const leadBands = config.weights.leadBands.map((item, cursor) => (cursor === index ? { ...item, adjustment } : item));
                  patchWeight("leadBands", leadBands);
                }}
              />
            </li>
          ))}
        </ul>
        <details>
          <summary>Objective tilt and peak-Saturday protection</summary>
          <div className="weight-grid">
            <NumberField label="Revenue premium scale" value={config.weights.revenuePremiumScale} step={0.05} onChange={(value) => patchWeight("revenuePremiumScale", value)} />
            <NumberField label="Revenue discount scale" value={config.weights.revenueDiscountScale} step={0.05} onChange={(value) => patchWeight("revenueDiscountScale", value)} />
            <PercentField label="Revenue tilt" value={config.weights.revenueBias} onChange={(value) => patchWeight("revenueBias", value)} />
            <NumberField label="Fill-dates premium scale" value={config.weights.fillPremiumScale} step={0.05} onChange={(value) => patchWeight("fillPremiumScale", value)} />
            <NumberField label="Fill-dates discount scale" value={config.weights.fillDiscountScale} step={0.05} onChange={(value) => patchWeight("fillDiscountScale", value)} />
            <PercentField label="Fill-dates tilt" value={config.weights.fillBias} onChange={(value) => patchWeight("fillBias", value)} />
            <PercentField label="Balanced negotiation room" value={config.weights.roomBalanced} onChange={(value) => patchWeight("roomBalanced", value)} />
            <PercentField label="Revenue negotiation room" value={config.weights.roomMaximize} onChange={(value) => patchWeight("roomMaximize", value)} />
            <PercentField label="Fill-dates negotiation room" value={config.weights.roomFill} onChange={(value) => patchWeight("roomFill", value)} />
            <NumberField label="Peak index threshold" value={config.weights.premiumIndexThreshold} step={1} onChange={(value) => patchWeight("premiumIndexThreshold", Math.round(value))} />
            <PercentField label="Peak Saturday floor" value={config.weights.premiumSaturdayFloorRatio} help="100 means do not quote a peak Saturday under the base." onChange={(value) => patchWeight("premiumSaturdayFloorRatio", value)} />
            <PercentField label="Fill-dates peak floor" value={config.weights.fillDatesPremiumFloorRatio} onChange={(value) => patchWeight("fillDatesPremiumFloorRatio", value)} />
            <PercentField label="Peak discount kept" value={config.weights.premiumDateDiscountDampener} help="50 means a peak Saturday keeps half of a lead-time discount." onChange={(value) => patchWeight("premiumDateDiscountDampener", value)} />
            <PercentField label="Busy-month threshold" value={config.weights.busyUtilization} onChange={(value) => patchWeight("busyUtilization", value)} />
            <PercentField label="Busy-month discount kept" value={config.weights.busyCalendarDiscountDampener} onChange={(value) => patchWeight("busyCalendarDiscountDampener", value)} />
            <NumberField label="History sample minimum" value={config.weights.historyMinSamples} step={1} onChange={(value) => patchWeight("historyMinSamples", Math.max(1, Math.round(value)))} />
          </div>
        </details>
      </section>

      <section className="panel">
        {confirmReset ? (
          <p className="confirm-row">
            Reset every weight, package, and market to the testing defaults? Booking history stays.
            <button type="button" className="text-button" onClick={() => { onChange(createDefaultConfig()); setConfirmReset(false); setMarketId("houston"); setTierId("marco"); }}>
              Reset defaults
            </button>
            <button type="button" className="text-button" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </p>
        ) : (
          <button type="button" className="ghost dark" onClick={() => setConfirmReset(true)}>
            Reset testing defaults
          </button>
        )}
      </section>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  help,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (fraction: number) => void;
  help?: string;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={Math.round(value * 1000) / 10}
        onChange={(event) => {
          if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber / 100);
        }}
        onWheel={(event) => event.currentTarget.blur()}
      />
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => {
          if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber);
        }}
        onWheel={(event) => event.currentTarget.blur()}
      />
    </label>
  );
}
