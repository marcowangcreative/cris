import Link from "next/link";
import { Kicker } from "@/components/ui";
import { clientName } from "@/lib/domain/queries";
import { readDemoDb } from "@/lib/demo/store";
import type { WeddingStatus } from "@/lib/types";

export const metadata = { title: "Weddings" };

const PIPELINE: { status: WeddingStatus; label: string }[] = [
  { status: "inquiry_received", label: "Inquiry received" },
  { status: "availability_review", label: "Availability review" },
  { status: "discovery_consultation", label: "Discovery consultation" },
  { status: "proposal_sent", label: "Proposal sent" },
  { status: "accepted_payment", label: "Accepted plus payment" },
  { status: "confirmed", label: "Confirmed" },
  { status: "planning", label: "Planning" },
  { status: "completed", label: "Completed" },
];

export default function WeddingsPage() {
  const db = readDemoDb();
  const weddings = db.projects.filter((project) => project.kind === "wedding");
  return (
    <div>
      <Kicker>Wedding pipeline</Kicker>
      <h1 className="mt-2 font-serif text-5xl">Only the studio confirms</h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
        An inquiry never reserves a date. A confirmed or expiring hold blocks
        transformation availability. Bridal prices are not entered here.
      </p>
      <div className="mt-10 space-y-8">
        {PIPELINE.map((stage) => {
          const rows = weddings.filter((project) => project.status === stage.status);
          return (
            <section key={stage.status}>
              <h2 className="font-serif text-2xl">{stage.label}</h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-stone">None</p>
              ) : (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {rows.map((project) => {
                    const detail = db.wedding_details.find(
                      (item) => item.project_id === project.id,
                    );
                    return (
                      <li key={project.id} className="flex items-center justify-between py-3">
                        <span>
                          {clientName(db, project.client_id)}
                          <span className="ml-2 text-sm text-stone">
                            {detail?.wedding_date} · {detail?.city}
                          </span>
                        </span>
                        <Link href={`/admin/projects/${project.id}`} className="text-sm text-wine">
                          Open
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
