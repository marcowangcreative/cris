import { notFound } from "next/navigation";
import { BalanceMath, Flash, Kicker, Placeholder, SubmitButton } from "@/components/ui";
import { publicCopy } from "@/lib/content";
import { toClientProject } from "@/lib/domain/access";
import { readDemoDb } from "@/lib/demo/store";
import {
  approveProposalAction,
  consentAction,
  saveIntakeAction,
  uploadAssetAction,
} from "@/server/actions";
import { requireClient } from "@/server/session";

export const metadata = { title: "Project" };

export default async function PortalProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireClient();
  const db = readDemoDb();
  const project = db.projects.find((item) => item.id === id);
  if (!project || project.client_id !== session.clientId) notFound();
  const view = toClientProject(db, session.clientId, id);
  return (
    <article className="mx-auto w-full max-w-3xl space-y-12 px-6 py-6">
      <Flash error={query.error} saved={query.saved} />
      <p className="font-script text-4xl text-wine">For your eyes only</p>
      <section className="invite-card bg-blush p-6 md:p-8">
        <Kicker>Next</Kicker>
        <h1 className="mt-3 font-serif text-4xl leading-tight">{view.next.title}</h1>
        <p className="mt-3 leading-7 text-ink-soft">{view.next.detail}</p>
      </section>
      {view.project.kind === "wedding" && view.wedding ? (
        <WeddingView view={view} />
      ) : (
        <TransformationView view={view} />
      )}
    </article>
  );
}

function TransformationView({
  view,
}: {
  view: ReturnType<typeof toClientProject>;
}) {
  const intake = view.intake;
  return (
    <>
      <section id="day" className="grid gap-6 md:grid-cols-2">
        <div className="invite-card p-6">
          <Kicker>Transformation day</Kicker>
          <p className="mt-3 font-serif text-3xl leading-tight">
            {view.appointment ? view.appointment.when : "No date yet"}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {view.appointment?.location ?? "Houston studio"} ·{" "}
            {view.appointment?.status.replaceAll("_", " ") ?? "unscheduled"}
          </p>
          <p className="mt-3 text-sm text-stone">
            Public starts are 10:00 a.m. Central. The workday is held for one client.
          </p>
        </div>
        <div id="consultation" className="invite-card bg-butter p-6">
          <Kicker>Consultation</Kicker>
          <p className="mt-3 font-serif text-3xl">Included</p>
          <p className="mt-2 text-sm text-ink-soft">
            {view.consultation
              ? `${view.consultation.durationMinutes} minutes · no fee`
              : "Included after a successful deposit."}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {view.consultation?.when ?? "Not scheduled yet."} Provider:{" "}
            {view.consultation?.provider ?? "Zoom or Teams, not chosen yet."}
          </p>
        </div>
      </section>
      <section id="balance" className="engraved bg-card p-6 md:p-8">
        <Kicker>Deposit and balance</Kicker>
        <div className="mt-4">
          <BalanceMath
            rec={view.reconciliation}
            approved={Boolean(view.project.totalApprovedAt)}
          />
        </div>
      </section>
      <section id="intake">
        <Kicker>Intake</Kicker>
        <h2 className="mt-2 font-serif text-3xl">Hair and chemical history</h2>
        <form action={saveIntakeAction} className="mt-6 space-y-4">
          <input type="hidden" name="projectId" value={view.project.id} />
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Hair history
            </span>
            <textarea name="hairHistory" defaultValue={intake?.hair_history ?? ""} required />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <Check name="color" label="Color" defaultChecked={intake?.chemical_history.color} />
            <Check name="bleach" label="Bleach or lightener" defaultChecked={intake?.chemical_history.bleach} />
            <Check name="relaxer" label="Relaxer" defaultChecked={intake?.chemical_history.relaxer} />
            <Check name="keratin" label="Keratin" defaultChecked={intake?.chemical_history.keratin} />
          </div>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Last chemical service
            </span>
            <input
              name="lastChemical"
              defaultValue={intake?.chemical_history.last_chemical_service ?? ""}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Chemical details
            </span>
            <textarea
              name="chemicalDetails"
              defaultValue={intake?.chemical_history.details ?? ""}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              Scalp notes
            </span>
            <textarea name="scalpNotes" defaultValue={intake?.scalp_notes ?? ""} />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
              What you want from the day
            </span>
            <textarea name="goals" defaultValue={intake?.goals ?? ""} required />
          </label>
          <SubmitButton>Save intake</SubmitButton>
        </form>
      </section>
      <section id="photos">
        <Kicker>Photos</Kicker>
        <h2 className="mt-2 font-serif text-3xl">Current hair and inspiration</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {view.assets.map((asset) => (
            <li key={asset.id} className="invite-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/assets/${asset.id}`}
                alt={asset.kind === "current_hair" ? "Current hair sample" : "Inspiration sample"}
                className="aspect-[4/5] w-full object-cover"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone">
                {asset.kind.replaceAll("_", " ")}
              </p>
            </li>
          ))}
        </ul>
        <form action={uploadAssetAction} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="projectId" value={view.project.id} />
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">Kind</span>
            <select name="kind" defaultValue="current_hair">
              <option value="current_hair">Current hair</option>
              <option value="inspiration">Inspiration</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">File</span>
            <input name="file" type="file" accept="image/*" required />
          </label>
          <SubmitButton>Upload</SubmitButton>
        </form>
        <form action={consentAction} className="invite-dashed mt-6 p-4">
          <input type="hidden" name="projectId" value={view.project.id} />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="marketing" defaultChecked={view.marketingConsent} />
            <span>
              Optional and separate: the studio may use finished photos for marketing.
              Leaving this unchecked does not block your appointment.
            </span>
          </label>
          <div className="mt-4">
            <SubmitButton>Save photo consent</SubmitButton>
          </div>
        </form>
      </section>
      <section id="proposal" className="space-y-4">
        <Kicker>Proposals</Kicker>
        {view.proposals.length === 0 ? (
          <p className="text-ink-soft">No proposal yet.</p>
        ) : (
          view.proposals.map((proposal) => (
            <article key={proposal.id} className="invite-card p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-stone">
                Version {proposal.version}
              </p>
              <h2 className="mt-2 font-serif text-3xl">
                {proposal.finalPriceCents == null
                  ? "Scope only"
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    }).format(proposal.finalPriceCents / 100)}
              </h2>
              <p className="mt-3 leading-7">{proposal.scope}</p>
              <p className="mt-3 text-sm text-ink-soft">Time: {proposal.estimatedTime}</p>
              <p className="mt-1 text-sm text-ink-soft">Maintenance: {proposal.maintenance}</p>
              {proposal.approvedLabel ? (
                <p className="mt-4 text-sm text-good">Approved {proposal.approvedLabel}</p>
              ) : (
                <form action={approveProposalAction} className="mt-4">
                  <input type="hidden" name="projectId" value={view.project.id} />
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <SubmitButton>Approve this version</SubmitButton>
                </form>
              )}
            </article>
          ))
        )}
      </section>
      <section className="space-y-4">
        <h2 className="font-serif text-3xl">Before and after the day</h2>
        <Placeholder>{publicCopy.bookingTerms}</Placeholder>
        <Placeholder>{publicCopy.prep}</Placeholder>
        <Placeholder>{publicCopy.aftercare}</Placeholder>
      </section>
    </>
  );
}

function WeddingView({
  view,
}: {
  view: ReturnType<typeof toClientProject>;
}) {
  const wedding = view.wedding;
  if (!wedding) return null;
  return (
    <section className="space-y-6">
      <Placeholder>{publicCopy.bridalPricing}</Placeholder>
      <dl className="invite-card grid gap-4 p-6 text-sm md:grid-cols-2">
        <Item label="Status" value={view.project.status.replaceAll("_", " ")} />
        <Item label="Wedding date" value={wedding.wedding_date} />
        <Item label="Date confirmed by you" value={wedding.date_confirmed ? "Yes" : "Not yet"} />
        <Item label="Venue" value={wedding.venue} />
        <Item label="City" value={wedding.city} />
        <Item label="Getting ready" value={wedding.getting_ready_location} />
        <Item label="Ready by" value={wedding.ready_by_time} />
        <Item label="Services" value={wedding.services} />
        <Item
          label="Party"
          value={
            wedding.party === "bride_only"
              ? "Bride only"
              : `Party, about ${wedding.party_count ?? "—"}`
          }
        />
        <Item
          label="Full bridal journey"
          value={wedding.full_journey_interest ? "Interested" : "Not requested"}
        />
      </dl>
      <p className="text-sm text-stone">
        Transformation rules — the minimum, the deposit, the 10:00 a.m. start, and
        monthly releases — do not apply to this project.
      </p>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-stone">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
