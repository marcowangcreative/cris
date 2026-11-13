import { MaisonFrame } from "@/components/maison/shell";
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

export default async function MaisonLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <MaisonFrame>
      <article className="maison-page">
        <p className="maison-kicker">Demo profiles</p>
        <h1>The record</h1>
        <p>No message is sent.</p>
        <Flash error={query.error} />
        <ul style={{ margin: "1.5rem 0 0", padding: 0, listStyle: "none" }}>
          {people.map(([id, name, note]) => (
            <li className="maison-row" key={id}>
              <div>
                <p style={{ margin: 0 }}>{name}</p>
                <p className="maison-kicker">{note}</p>
              </div>
              <form action={demoSignIn}>
                <input type="hidden" name="next" value="/maison" />
                <input type="hidden" name="clientId" value={id} />
                <button type="submit">Continue</button>
              </form>
            </li>
          ))}
          <li className="maison-row">
            <div>
              <p style={{ margin: 0 }}>Studio admin</p>
              <p className="maison-kicker">The desk</p>
            </div>
            <form action={demoSignIn}>
              <input type="hidden" name="next" value="/maison" />
              <input type="hidden" name="staffId" value={IDS.staff} />
              <button type="submit">Continue</button>
            </form>
          </li>
        </ul>
      </article>
    </MaisonFrame>
  );
}
