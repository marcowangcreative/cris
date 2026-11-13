import { redirect } from "next/navigation";
import { MaisonFrame } from "@/components/maison/shell";
import { readDemoDb } from "@/lib/demo/store";
import { chicagoDateTime } from "@/lib/domain/time";
import { getActor } from "@/server/session";

export const metadata = { title: "Desk" };

export default async function MaisonAdmin() {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") redirect("/maison/login");
  const db = readDemoDb();
  const upcoming = db.appointments
    .filter((item) => item.status !== "canceled")
    .slice(0, 6);
  return (
    <MaisonFrame trailing="logout">
      <article className="maison-page">
        <p className="maison-kicker">Studio</p>
        <h1>The desk</h1>
        <ul style={{ margin: "1.5rem 0 0", padding: 0, listStyle: "none" }}>
          {upcoming.map((appointment) => {
            const project = db.projects.find((item) => item.id === appointment.project_id);
            const client = db.clients.find((item) => item.id === project?.client_id);
            return (
              <li className="maison-row" key={appointment.id}>
                <div>
                  <p style={{ margin: 0 }}>{client?.full_name ?? "Client"}</p>
                  <p className="maison-kicker">{project?.kind}</p>
                </div>
                <p className="maison-kicker">
                  {chicagoDateTime(appointment.starts_at).toFormat("LLLL d")}
                </p>
              </li>
            );
          })}
        </ul>
      </article>
    </MaisonFrame>
  );
}
