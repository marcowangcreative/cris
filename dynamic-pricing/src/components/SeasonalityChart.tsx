import { useState } from "react";
import { formatPercent, seasonalPercent, shortMonth, type PricingConfig } from "../engine";

export function SeasonalityChart({ config }: { config: PricingConfig }) {
  const [marketId, setMarketId] = useState(config.homeMarketId);
  const market = config.markets.find((item) => item.id === marketId) ?? config.markets[0];
  const maxIndex = Math.max(160, ...market.demandIndex, 100);
  const width = 640;
  const height = 280;
  const baseline = 200 - (100 / maxIndex) * 168;

  return (
    <section className="panel season">
      <div className="section-head">
        <div>
          <h2>Market seasonality</h2>
          <p className="hint">100 is baseline demand. These curves are testing assumptions, not a count of past bookings.</p>
        </div>
        <label className="field compact">
          <span>Market</span>
          <select value={market.id} onChange={(event) => setMarketId(event.target.value)}>
            {config.markets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.id === config.homeMarketId ? " · home" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Demand index by month for ${market.name}`}>
        <line x1="36" x2="620" y1={baseline} y2={baseline} className="baseline" />
        <text x="40" y={baseline - 6} className="baseline-label">
          100
        </text>
        {market.demandIndex.map((index, month) => {
          const barHeight = Math.max(2, (index / maxIndex) * 168);
          const x = 42 + month * 49;
          const y = 200 - barHeight;
          const tone = index >= config.weights.premiumIndexThreshold ? "peak" : index < 100 ? "soft" : "steady";
          return (
            <g key={month}>
              <rect x={x} y={y} width="32" height={barHeight} rx="4" className={tone} />
              <text x={x + 16} y={y - 6} textAnchor="middle" className="bar-value">
                {index}
              </text>
              <text x={x + 16} y="224" textAnchor="middle" className="bar-label">
                {shortMonth(month)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="legend">
        <span><i className="swatch peak" /> Index {config.weights.premiumIndexThreshold}+ · peak Saturday protection</span>
        <span><i className="swatch steady" /> At or above baseline</span>
        <span><i className="swatch soft" /> Softer than baseline</span>
      </p>
      <p className="footnote">{market.note} Illustrative index for model development, not historical market data.</p>
      <div className="table-wrap">
        <table>
          <caption>Index and the seasonal adjustment at the current weight</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Index</th>
              <th scope="col">Seasonal adjustment</th>
            </tr>
          </thead>
          <tbody>
            {market.demandIndex.map((index, month) => {
              const percent = seasonalPercent(index, config.weights);
              return (
                <tr key={month}>
                  <th scope="row">{shortMonth(month)}</th>
                  <td>{index}</td>
                  <td className={percent > 0 ? "up" : percent < 0 ? "down" : ""}>{formatPercent(percent)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
