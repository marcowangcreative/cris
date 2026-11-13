import { redirect } from "next/navigation";
import { MaisonFrame } from "@/components/maison/shell";
import { readDemoDb } from "@/lib/demo/store";
import { chicagoDateTime } from "@/lib/domain/time";
import { getActor } from "@/server/session";

export const metadata = { title: "Record" };

export default async function MaisonPortal() {
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/maison/login");
  const db = readDemoDb();
  const client = db.clients.find((item) => item.id === actor.clientId);
  const projects = db.projects.filter((item) => item.client_id === client?.id);
  return (
    <MaisonFrame trailing="logout">
      <article className="maison-page">
        <p className="maison-kicker">Private client</p>
        <h1>{client?.full_name ?? "Client"}</h1>
        <ul style={{ margin: "1.5rem 0 0", padding: 0, listStyle: "none" }}>
          {projects.map((project) => {
            const appointment = db.appointments.find(
              (item) => item.project_id === project.id && item.status !== "canceled",
            );
            return (
              <li className="maison-row" key={project.id}>
                <div>
                  <p className="maison-kicker" style={{ margin: 0 }}>
                    {project.kind}
                  </p>
                  <p style={{ margin: "0.25rem 0 0" }}>{project.status.replaceAll("_", " ")}</p>
                </div>
                <p className="maison-kicker">
                  {appointment
                    ? chicagoDateTime(appointment.starts_at).toFormat("LLLL d, yyyy")
                    : "Date not set"}
                </p>
              </li>
            );
          })}
        </ul>
      </article>
    </MaisonFrame>
  );
}
