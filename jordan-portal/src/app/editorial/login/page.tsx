import { ZineFrame } from "@/components/editorial/shell";
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

export default async function EditorialLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <ZineFrame>
      <p className="zine-kicker">Demo profiles</p>
      <h1 style={{ marginTop: "0.3rem" }}>The record</h1>
      <p>No message is sent.</p>
      <Flash error={query.error} />
      <ul style={{ margin: "1rem 0 0", padding: 0, listStyle: "none" }}>
        {people.map(([id, name, note]) => (
          <li className="zine-row" key={id}>
            <div>
              <p style={{ margin: 0 }}>{name}</p>
              <p className="zine-kicker" style={{ margin: "0.2rem 0 0" }}>{note}</p>
            </div>
            <form action={demoSignIn}>
              <input type="hidden" name="next" value="/editorial" />
              <input type="hidden" name="clientId" value={id} />
              <button className="zine-kicker" type="submit" style={{ border: 0, background: "none", cursor: "pointer" }}>
                Continue
              </button>
            </form>
          </li>
        ))}
        <li className="zine-row">
          <div>
            <p style={{ margin: 0 }}>Studio admin</p>
            <p className="zine-kicker" style={{ margin: "0.2rem 0 0" }}>Schedule and the desk</p>
          </div>
          <form action={demoSignIn}>
            <input type="hidden" name="next" value="/editorial" />
            <input type="hidden" name="staffId" value={IDS.staff} />
            <button className="zine-kicker" type="submit" style={{ border: 0, background: "none", cursor: "pointer" }}>
              Continue
            </button>
          </form>
        </li>
      </ul>
    </ZineFrame>
  );
}
