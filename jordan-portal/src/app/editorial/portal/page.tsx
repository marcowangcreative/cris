import Link from "next/link";
import { redirect } from "next/navigation";
import { readDemoDb } from "@/lib/demo/store";
import { chicagoDateTime } from "@/lib/domain/time";
import { getActor } from "@/server/session";

export const metadata = { title: "Record" };

export default async function EditorialPortal() {
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/editorial/login");
  const db = readDemoDb();
  const client = db.clients.find((item) => item.id === actor.clientId);
  const projects = db.projects.filter((item) => item.client_id === client?.id);
  return (
    <div className="zine-quiet">
      <p className="zine-star">record</p>
      <p className="zine-kicker">Private client</p>
      <h1 style={{ margin: "0.25rem 0 0" }}>{client?.full_name ?? "Client"}</h1>
      <ul style={{ margin: "1.25rem 0 0", padding: 0, listStyle: "none" }}>
        {projects.map((project) => {
          const appointment = db.appointments.find(
            (item) => item.project_id === project.id && item.status !== "canceled",
          );
          return (
            <li className="zine-row" key={project.id}>
              <div>
                <p className="zine-kicker" style={{ margin: 0 }}>
                  {project.kind}
                </p>
                <p style={{ margin: "0.2rem 0 0" }}>{project.status.replaceAll("_", " ")}</p>
                <p className="zine-kicker" style={{ margin: "0.25rem 0 0" }}>
                  {appointment
                    ? chicagoDateTime(appointment.starts_at).toFormat("LLLL d, yyyy")
                    : "Date not set"}
                </p>
              </div>
              <Link className="zine-kicker" href={`/editorial/portal/projects/${project.id}`}>
                Open
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
