import { submitInquiry } from "@/server/actions";
import { SubmitButton } from "./ui";

export function WeddingForm() {
  return (
    <form action={submitInquiry} className="apothecary-form space-y-12">
      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-6 font-serif text-3xl">About you</legend>
        <Field label="Name" name="fullName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" required />
        <Field label="Referral source" name="referralSource" />
      </fieldset>
      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-6 font-serif text-3xl">The celebration</legend>
        <Field label="Wedding date" name="weddingDate" type="date" required />
        <div>
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
            Is the date confirmed?
          </span>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="dateConfirmed" value="yes" required />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="dateConfirmed" value="no" required />
              Not yet
            </label>
          </div>
        </div>
        <Field label="Venue" name="venue" required />
        <Field label="City" name="city" required />
        <Field label="Getting-ready location" name="gettingReadyLocation" required />
        <Field label="Ready-by time" name="readyByTime" required />
      </fieldset>
      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-6 font-serif text-3xl">What you need</legend>
        <div>
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
            Services
          </span>
          <div className="flex flex-wrap gap-4 text-sm">
            <Radio name="services" value="hair" label="Hair" />
            <Radio name="services" value="makeup" label="Makeup" />
            <Radio name="services" value="both" label="Hair and makeup" />
          </div>
        </div>
        <div>
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
            Who is coming
          </span>
          <div className="flex flex-wrap gap-4 text-sm">
            <Radio name="party" value="bride_only" label="Bride only" />
            <Radio name="party" value="party" label="A party" />
          </div>
        </div>
        <Field label="Approximate bride count" name="brideCount" type="number" />
        <Field label="Approximate party count" name="partyCount" type="number" />
        <div className="md:col-span-2">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
            Interested in the full bridal journey?
          </span>
          <div className="flex gap-6 text-sm">
            <Radio name="fullJourney" value="yes" label="Yes" />
            <Radio name="fullJourney" value="no" label="Not sure yet" />
          </div>
          <p className="mt-3 text-sm text-stone">
            The full journey is discussed in consultation. This form does not list inclusions.
          </p>
        </div>
      </fieldset>
      <fieldset className="space-y-6">
        <legend className="mb-6 font-serif text-3xl">Anything else</legend>
        <Text label="Other events" name="otherEvents" />
        <Text label="Travel" name="travel" />
        <Text
          label="Investment range you have in mind"
          name="investmentRange"
          help="Optional. There is no published bridal price. This note is only for the consultation. It is not a quote."
        />
        <div>
          <label htmlFor="inspiration" className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
            Inspiration photos, optional
          </label>
          <input id="inspiration" name="inspiration" type="file" accept="image/*" multiple />
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Send the inquiry</SubmitButton>
        <p className="text-sm text-stone">
          This creates a wedding project. It does not reserve a date, and no email is sent.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
        {label}
      </span>
      <input name={name} type={type} required={required} />
    </label>
  );
}

function Text({
  label,
  name,
  help,
}: {
  label: string;
  name: string;
  help?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-stone">
        {label}
      </span>
      <textarea name={name} />
      {help ? <span className="mt-2 block text-sm text-stone">{help}</span> : null}
    </label>
  );
}

function Radio({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="radio" name={name} value={value} required />
      {label}
    </label>
  );
}
