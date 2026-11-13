import { ApothecaryFrame } from "@/components/apothecary/shell";
import { Flash } from "@/components/ui";
import { IDS } from "@/lib/ids";
import { demoSignIn } from "@/server/actions";

export const metadata = { title: "Sign in" };

const people = [
  [IDS.avery, "Avery Lin", "Transformation, proposal waiting"],
  [IDS.quinn, "Quinn Harper", "Intake still open"],
  [IDS.sage, "Sage Romero", "Wedding inquiry"],
  [IDS.reese, "Reese Calder", "Confirmed wedding"],
  [IDS.noah, "Noah Blake", "Payment did not confirm"],
] as const;

export default async function ApothecaryLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <ApothecaryFrame>
      <header className="rx-center">
        <h1 className="rx-display">The record</h1>
        <p className="rx-body" style={{ marginTop: "1rem" }}>
          Demo profiles only. No message is sent.
        </p>
      </header>
      <div style={{ marginTop: "1rem" }}>
        <Flash error={query.error} />
      </div>
      <ul className="rx-catalogue">
        {people.map(([id, name, note]) => (
          <li className="rx-line" key={id}>
            <div>
              <p>{name}</p>
              <p className="rx-muted" style={{ fontSize: "1rem" }}>
                {note}
              </p>
            </div>
            <form action={demoSignIn}>
              <input type="hidden" name="next" value="/apothecary" />
              <input type="hidden" name="clientId" value={id} />
              <button type="submit" className="rx-jost">
                Continue
              </button>
            </form>
          </li>
        ))}
        <li className="rx-line">
          <div>
            <p>Studio admin</p>
            <p className="rx-muted" style={{ fontSize: "1rem" }}>
              Schedule and the desk
            </p>
          </div>
          <form action={demoSignIn}>
            <input type="hidden" name="next" value="/apothecary" />
            <input type="hidden" name="staffId" value={IDS.staff} />
            <button type="submit" className="rx-jost">
              Continue
            </button>
          </form>
        </li>
      </ul>
    </ApothecaryFrame>
  );
}
