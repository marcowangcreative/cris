import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceMath, Flash, Kicker, SubmitButton } from "@/components/ui";
import { reconcileProject } from "@/lib/domain/money";
import { clientName } from "@/lib/domain/queries";
import { formatChicago } from "@/lib/domain/time";
import { readDemoDb } from "@/lib/demo/store";
import { RULES } from "@/lib/rules";
import { formatUsd } from "@/lib/format";
import type { WeddingStatus } from "@/lib/types";
import {
  boulevardAction,
  holdAction,
  noteAction,
  proposalAction,
  releaseDayAction,
  resolveTaskAction,
  weddingStatusAction,
} from "@/server/actions";

export const metadata = { title: "Project" };

const WEDDING_STATUSES: { value: WeddingStatus; label: string }[] = [
  { value: "inquiry_received", label: "Inquiry received" },
  { value: "availability_review", label: "Availability review" },
  { value: "discovery_consultation", label: "Discovery consultation" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "accepted_payment", label: "Accepted plus payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "planning", label: "Planning" },
  { value: "completed", label: "Completed" },
];

export default async function AdminProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id);
  if (!project) notFound();
  const rec = reconcileProject(db, project.id);
  const notes = db.project_notes.filter((item) => item.project_id === project.id);
  const tasks = db.tasks.filter((item) => item.project_id === project.id);
  const appointment = db.appointments.find((item) => item.project_id === project.id);
  const consultation = db.consultations.find((item) => item.project_id === project.id);
  return (
    <article className="space-y-12">
      <header>
        <Kicker>{project.kind}</Kicker>
        <h1 className="mt-2 font-serif text-5xl">{clientName(db, project.client_id)}</h1>
        <p className="mt-2 text-sm text-stone">
          <Link href={`/admin/clients/${project.client_id}`} className="underline">
            Client record
          </Link>
          {" · "}
          {project.status.replaceAll("_", " ")}
        </p>
        <div className="mt-4">
          <Flash error={query.error} saved={query.saved} />
        </div>
      </header>

      <section id="checkout" className="border border-line bg-card p-6">
        <Kicker>Boulevard checkout</Kicker>
        <div className="mt-4">
          <BalanceMath rec={rec} approved={Boolean(project.total_approved_at)} />
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          In Boulevard, enter the full agreed service total, then record the deposit
          as an external payment type named “Stripe reservation deposit.” Never enter
          it as a discount or a price reduction. Collect only the balance here.
        </p>
        <form action={boulevardAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Boulevard order ref
            </span>
            <input name="orderRef" defaultValue={project.boulevard_order_ref ?? ""} />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Boulevard client ref
            </span>
            <input name="clientRef" defaultValue={project.boulevard_client_ref ?? ""} />
          </label>
          <SubmitButton>Save Boulevard refs</SubmitButton>
        </form>
      </section>

      <section>
        <Kicker>External references</Kicker>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <Ref label="Calendly event" value={project.calendly_event_uri} />
          <Ref label="Calendly invitee" value={project.calendly_invitee_uri} />
          <Ref label="Stripe" value={project.stripe_reference} />
          <Ref label="Boulevard client" value={project.boulevard_client_ref} />
          <Ref label="Boulevard order" value={project.boulevard_order_ref} />
        </dl>
        {appointment ? (
          <p className="mt-4 text-sm">
            Appointment {formatChicago(appointment.starts_at)} · {appointment.status}
            {appointment.location ? ` · ${appointment.location}` : ""}
          </p>
        ) : null}
        {consultation ? (
          <p className="mt-2 text-sm text-ink-soft">
            Consultation {consultation.status}, {consultation.duration_minutes} min, fee{" "}
            {formatUsd(consultation.fee_cents)}. Provider{" "}
            {consultation.provider ?? "not chosen"}.
          </p>
        ) : null}
        {appointment && appointment.status !== "confirmed" && appointment.status !== "canceled" ? (
          <form action={releaseDayAction} className="mt-4">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <SubmitButton>Release this unconfirmed day</SubmitButton>
          </form>
        ) : null}
      </section>

      {project.kind === "wedding" ? (
        <section id="pipeline" className="space-y-6">
          <h2 className="font-serif text-3xl">Pipeline</h2>
          <p className="text-sm text-ink-soft">
            Only the studio can confirm. Confirmation requires a commitment that blocks
            transformation dates. Do not type a bridal price.
          </p>
          <form action={weddingStatusAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Status</span>
              <select name="status" defaultValue={project.status}>
                {WEDDING_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
                Commitment start
              </span>
              <input name="commitmentStart" type="date" />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
                Commitment end
              </span>
              <input name="commitmentEnd" type="date" />
            </label>
            <SubmitButton>Update wedding status</SubmitButton>
          </form>
          <form action={holdAction} className="grid gap-4 border border-dashed border-line p-4 md:grid-cols-3">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Hold start</span>
              <input name="startDate" type="date" required />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Hold end</span>
              <input name="endDate" type="date" required />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
                Expires through
              </span>
              <input name="expiresOn" type="date" required />
            </label>
            <SubmitButton>Place an expiring hold</SubmitButton>
          </form>
        </section>
      ) : (
        <section id="proposal">
          <h2 className="font-serif text-3xl">Proposal</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            {formatUsd(RULES.transformationMinimumCents)} is the minimum.{" "}
            {formatUsd(RULES.quoteLevelCents[0])} and {formatUsd(RULES.quoteLevelCents[1])} are
            quote levels only. They are not public packages.
          </p>
          <form action={proposalAction} className="mt-4 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />
            <fieldset className="space-y-2 text-sm">
              <legend className="text-xs uppercase tracking-[0.16em] text-stone">Price</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="price" value={RULES.transformationMinimumCents} defaultChecked />
                {formatUsd(RULES.transformationMinimumCents)} minimum
              </label>
              {RULES.quoteLevelCents.map((cents) => (
                <label key={cents} className="flex items-center gap-2">
                  <input type="radio" name="price" value={cents} />
                  {formatUsd(cents)} quote level only, not a public package
                </label>
              ))}
            </fieldset>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
                Other amount in dollars, optional
              </span>
              <input name="customDollars" inputMode="decimal" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Scope</span>
              <textarea name="scope" required />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Estimated time</span>
              <input name="estimatedTime" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Maintenance</span>
              <input name="maintenance" />
            </label>
            <SubmitButton>Save proposal version</SubmitButton>
          </form>
        </section>
      )}

      <section id="notes">
        <h2 className="font-serif text-3xl">Private notes</h2>
        <p className="mt-2 text-sm text-stone">Clients never see these.</p>
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border border-line bg-card px-4 py-3 text-sm">
              {note.body}
            </li>
          ))}
        </ul>
        <form action={noteAction} className="mt-4 space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <textarea name="body" placeholder="Stylist note" />
          <SubmitButton>Add private note</SubmitButton>
        </form>
      </section>

      <section id="tasks">
        <h2 className="font-serif text-3xl">Review tasks</h2>
        <ul className="mt-4 space-y-3">
          {tasks.length === 0 ? <li className="text-sm text-stone">No tasks.</li> : null}
          {tasks.map((task) => (
            <li key={task.id} className="border border-line px-4 py-3 text-sm">
              <p>
                {task.kind.replaceAll("_", " ")} · {task.status}
              </p>
              <p className="mt-1 text-ink-soft">{task.detail}</p>
              {task.status === "open" ? (
                <form action={resolveTaskAction} className="mt-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <SubmitButton>Resolve</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Ref({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-stone">{label}</dt>
      <dd className="mt-1 break-all">{value || "—"}</dd>
    </div>
  );
}
