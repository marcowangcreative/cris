import { formatUsd } from "@/lib/format";
import { RULES } from "@/lib/rules";

export function Catalogue({ weddings = true }: { weddings?: boolean }) {
  const rows = [
    ["No. 01", "Private transformation", formatUsd(RULES.transformationMinimumCents)],
    ["No. 02", "Reservation deposit", formatUsd(RULES.depositCents)],
    ["No. 03", "Weddings and bridal", "Inquire"],
  ];
  return (
    <div className="rx-catalogue">
      {rows.slice(0, weddings ? 3 : 2).map(([number, name, price]) => (
        <p className="rx-line" key={number}>
          <span className="rx-jost">{number}</span>
          <span>{name}</span>
          <span className="rx-dots" />
          <span className="rx-price">{price}</span>
        </p>
      ))}
    </div>
  );
}
