import { PrescriptionCard } from "@/components/apothecary/prescription";
import { readDemoDb } from "@/lib/demo/store";
import { chicagoDateTime } from "@/lib/domain/time";
import { IDS } from "@/lib/ids";
import { redirect } from "next/navigation";
import { getActor } from "@/server/session";

export const metadata = { title: "Record" };

const NUMBERS: Record<string, string> = {
  [IDS.avery]: "0147",
  [IDS.quinn]: "0148",
  [IDS.sage]: "0149",
  [IDS.reese]: "0150",
  [IDS.noah]: "0151",
};

export default async function ApothecaryPortal() {
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/apothecary/login");
  const db = readDemoDb();
  const client = db.clients.find((item) => item.id === actor.clientId);
  const projects = db.projects.filter((item) => item.client_id === client?.id);
  return (
    <div className="rx-center">
      <p className="rx-jost">Private record</p>
      <h1 className="rx-display" style={{ marginTop: "0.45rem" }}>
        {client?.full_name ?? "Client"}
      </h1>
      <div style={{ display: "grid", gap: "1.5rem", marginTop: "2rem" }}>
        {projects.map((project) => {
          const appointment = db.appointments.find(
            (item) => item.project_id === project.id && item.status !== "canceled",
          );
          const avery = project.client_id === IDS.avery && project.kind === "transformation";
          return (
            <PrescriptionCard
              key={project.id}
              number={NUMBERS[project.client_id] ?? "0000"}
              name={shortName(client?.full_name ?? "Client")}
              reserved={project.status === "confirmed"}
              formula={avery ? "7N + 8G, 20 vol" : "Not recorded"}
              toner={avery ? "Shades EQ 09V" : "Not recorded"}
              service={
                avery
                  ? "Lived-in blonde, 4 hrs"
                  : project.kind === "wedding"
                    ? "Wedding hair"
                    : "Transformation"
              }
              lastVisit={avery ? "October 2026" : "Not recorded"}
              next={
                appointment
                  ? chicagoDateTime(appointment.starts_at).toFormat("LLLL d, yyyy")
                  : "To be set"
              }
              photosHref={`/apothecary/portal/projects/${project.id}#photos`}
            />
          );
        })}
      </div>
    </div>
  );
}

function shortName(full: string): string {
  const [first, last] = full.split(" ");
  if (!last) return first;
  return `${first} ${last.slice(0, 1)}.`;
}
