import Link from "next/link";
import { LabelFrame } from "./frame";

export function PrescriptionCard({
  number,
  name,
  reserved,
  formula,
  toner,
  service,
  lastVisit,
  next,
  photosHref,
}: {
  number: string;
  name: string;
  reserved: boolean;
  formula: string;
  toner: string;
  service: string;
  lastVisit: string;
  next: string;
  photosHref: string;
}) {
  const rows = [
    ["Formula", formula],
    ["Toner", toner],
    ["Service", service],
    ["Last visit", lastVisit],
    ["Next", next],
  ];
  return (
    <article className="rx-card">
      <LabelFrame>
        <div className="rx-card-head">
          <h2>
            No. {number} — {name}
          </h2>
          {reserved ? <span className="rx-ribbon rx-jost">Reserved</span> : null}
        </div>
        <table className="rx-fields">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th className="rx-jost" scope="row">
                  {label}
                </th>
                <td className="rx-muted">:</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: "1.4rem" }}>
          <Link className="rx-button" href={photosHref} style={{ width: "100%" }}>
            View photos
          </Link>
        </p>
      </LabelFrame>
    </article>
  );
}
